import { randomBytes } from "crypto";
import { PatientIntakeStatus, type ConversationChannel, type Prisma } from "@prisma/client";
import { type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import { prisma } from "@/lib/prisma";

const ACCESS_CODE_PREFIX = "DENTIA";
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 6;

export function generatePatientIntakeAccessCode() {
  const bytes = randomBytes(ACCESS_CODE_LENGTH);
  const suffix = Array.from(bytes, byte => ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]).join("");
  return `${ACCESS_CODE_PREFIX}-${suffix}`;
}

export function hasPatientIntakeData(state: DentalAgentState) {
  const hasClassifiedIntent = Boolean(state.intent && state.intentCode !== "INTENCION_PENDIENTE");
  const hasTreatmentNeed = Boolean(state.treatmentNeed && state.treatmentNeed !== "Pendiente de clasificar");
  return Boolean(
    state.name ||
    state.email ||
    state.phone ||
    state.location ||
    hasTreatmentNeed ||
    state.consent ||
    hasClassifiedIntent
  );
}

export function resolvePatientIntakeStatus(duplicatePatientIds: string[], patientId?: string | null) {
  if (duplicatePatientIds.length > 0) return PatientIntakeStatus.DUPLICATE_REVIEW;
  if (patientId) return PatientIntakeStatus.LINKED;
  return PatientIntakeStatus.CAPTURED;
}

export async function ensurePatientIntakeFromDentalState(input: {
  tenantId: string;
  patientId: string;
  conversationId: string;
  channel: ConversationChannel;
  state: DentalAgentState;
}) {
  const { tenantId, patientId, conversationId, channel, state } = input;
  if (!hasPatientIntakeData(state)) return null;

  const duplicatePatientIds = await findDuplicatePatientIds({
    tenantId,
    currentPatientId: patientId,
    email: state.email,
    phone: state.phone
  });
  const data = {
    tenantId,
    patientId,
    conversationId,
    status: resolvePatientIntakeStatus(duplicatePatientIds, patientId),
    name: state.name || null,
    email: state.email || null,
    phone: state.phone || null,
    location: state.location || null,
    treatmentNeed: state.treatmentNeed || state.intentCode || state.intent || null,
    channel,
    source: "chat",
    consent: state.consent,
    duplicatePatientIds: duplicatePatientIds as Prisma.InputJsonValue,
    stateSnapshot: state as unknown as Prisma.InputJsonValue
  };

  const existing = await prisma.patientIntake.findUnique({ where: { conversationId } });
  if (existing) {
    return prisma.patientIntake.update({
      where: { id: existing.id },
      data
    });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.patientIntake.create({
        data: {
          ...data,
          accessCode: generatePatientIntakeAccessCode()
        }
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  throw new Error("No se pudo generar un codigo unico para la pre-ficha.");
}

async function findDuplicatePatientIds(input: {
  tenantId: string;
  currentPatientId: string;
  email?: string;
  phone?: string;
}) {
  const OR: Prisma.PatientWhereInput[] = [];
  if (input.email) OR.push({ email: input.email });
  if (input.phone) OR.push({ phone: input.phone });
  if (OR.length === 0) return [];

  const patients = await prisma.patient.findMany({
    where: {
      tenantId: input.tenantId,
      id: { not: input.currentPatientId },
      OR
    },
    select: { id: true }
  });
  return patients.map(patient => patient.id);
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

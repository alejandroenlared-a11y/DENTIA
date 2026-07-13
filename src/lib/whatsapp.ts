import { fetchWithTimeout, resolveTimeoutMs } from "@/lib/http";

const DEFAULT_GRAPH_API_VERSION = "v20.0";
const WHATSAPP_MAX_TEXT_LENGTH = 3900;
const WHATSAPP_SEND_TIMEOUT_MS = resolveTimeoutMs("WHATSAPP_SEND_TIMEOUT_MS", 12_000);

export type WhatsAppCloudMessage = {
  id: string;
  from: string;
  name?: string;
  body: string;
  type: string;
  timestamp?: string;
};

type UnknownRecord = Record<string, unknown>;

export function parseWhatsAppCloudMessages(payload: unknown): WhatsAppCloudMessage[] {
  const messages: WhatsAppCloudMessage[] = [];
  const entries = asArray(asRecord(payload).entry);

  for (const entry of entries) {
    const changes = asArray(asRecord(entry).changes);
    for (const change of changes) {
      const value = asRecord(asRecord(change).value);
      const contactsById = new Map<string, string>();

      for (const contact of asArray(value.contacts)) {
        const contactRecord = asRecord(contact);
        const waId = asString(contactRecord.wa_id);
        const profileName = asString(asRecord(contactRecord.profile).name);
        if (waId && profileName) {
          contactsById.set(waId, profileName);
        }
      }

      for (const item of asArray(value.messages)) {
        const message = asRecord(item);
        const from = normalizeWhatsAppPhone(asString(message.from));
        const type = asString(message.type) || "unknown";
        const id = asString(message.id) || `${from}:${asString(message.timestamp) || Date.now()}`;
        const body = extractMessageBody(message, type);

        if (!from || !body) {
          continue;
        }

        messages.push({
          id,
          from,
          name: contactsById.get(stripPhonePrefix(from)),
          body,
          type,
          timestamp: asString(message.timestamp)
        });
      }
    }
  }

  return messages;
}

export function isWhatsAppCloudConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppText(input: { to: string; body: string }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API no esta configurado.");
  }

  const response = await fetchWithTimeout(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(buildWhatsAppTextPayload(input))
  }, WHATSAPP_SEND_TIMEOUT_MS);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`WhatsApp Cloud API ${response.status}: ${errorText.slice(0, 500)}`);
  }

  return response.json().catch(() => ({}));
}

export function buildWhatsAppTextPayload(input: { to: string; body: string }) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: stripPhonePrefix(input.to),
    type: "text",
    text: {
      preview_url: false,
      body: trimWhatsAppText(input.body)
    }
  };
}

function extractMessageBody(message: UnknownRecord, type: string) {
  if (type === "text") {
    return asString(asRecord(message.text).body).trim();
  }

  if (type === "button") {
    return asString(asRecord(message.button).text).trim();
  }

  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const buttonReply = asString(asRecord(interactive.button_reply).title);
    const listReply = asString(asRecord(interactive.list_reply).title);
    return (buttonReply || listReply).trim();
  }

  return `El paciente ha enviado un mensaje de tipo ${type}. Pidele que lo describa en texto para poder ayudarle.`;
}

function normalizeWhatsAppPhone(value: string) {
  const digits = stripPhonePrefix(value);
  return digits ? `+${digits}` : "";
}

function stripPhonePrefix(value: string) {
  return value.replace(/[^\d]/g, "");
}

function trimWhatsAppText(value: string) {
  const text = value.trim();
  return text.length > WHATSAPP_MAX_TEXT_LENGTH ? `${text.slice(0, WHATSAPP_MAX_TEXT_LENGTH - 3).trim()}...` : text;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

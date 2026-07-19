import { ConversationChannel } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { processInboundMessage } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { constantTimeEqual, isConfiguredSecret } from "@/lib/security";
import { firstErrorMessage, inboundMessageSchema } from "@/lib/validation";

// Margen suficiente para el turno LLM (12s) + persistencia, sin depender del
// limite por defecto de la plataforma.
export const maxDuration = 30;

const channelMap: Record<string, ConversationChannel> = {
  whatsapp: ConversationChannel.WHATSAPP,
  sms: ConversationChannel.SMS,
  voice: ConversationChannel.VOICE,
  web: ConversationChannel.WEB,
  email: ConversationChannel.EMAIL
};

type RouteParams = { params: Promise<{ slug: string; channel: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug, channel } = await params;

  const secretResponse = validateWebhookSecret(request);
  if (secretResponse) {
    return secretResponse;
  }

  const mappedChannel = channelMap[channel.toLowerCase()];
  if (!mappedChannel) {
    return NextResponse.json({ success: false, data: null, error: "Canal no soportado." }, { status: 400 });
  }

  const rate = checkRateLimit(`webhook:${slug}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas peticiones. Espera un minuto." },
      { status: 429 }
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { settings: true } });
  if (!tenant) {
    return NextResponse.json({ success: false, data: null, error: "Clinica no encontrada." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "JSON no valido." }, { status: 400 });
  }

  const parsed = inboundMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: firstErrorMessage(parsed.error) },
      { status: 422 }
    );
  }

  try {
    const result = await processInboundMessage(tenant, {
      channel: mappedChannel,
      from: parsed.data.from,
      name: parsed.data.name,
      body: parsed.data.body
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId: result.conversationId,
        reply: result.reply,
        escalated: result.escalated,
        assistantName: tenant.assistantName
      },
      error: null
    });
  } catch (error) {
    console.error("webhook inbound failed", error);
    return NextResponse.json(
      { success: false, data: null, error: "Error interno procesando el mensaje." },
      { status: 500 }
    );
  }
}

function validateWebhookSecret(request: NextRequest) {
  const configuredSecret = process.env.WEBHOOK_SHARED_SECRET;
  if (isSameOriginBrowserRequest(request)) {
    return null;
  }

  if (!isConfiguredSecret(configuredSecret)) {
    if (process.env.NODE_ENV === "production") {
      console.error("WEBHOOK_SHARED_SECRET must be configured in production");
      return NextResponse.json(
        { success: false, data: null, error: "Webhook no configurado." },
        { status: 500 }
      );
    }
    return null;
  }

  const receivedSecret = request.headers.get("x-webhook-secret");
  if (!receivedSecret || !constantTimeEqual(receivedSecret, configuredSecret)) {
    return NextResponse.json(
      { success: false, data: null, error: "Firma de webhook no valida." },
      { status: 401 }
    );
  }

  return null;
}

function isSameOriginBrowserRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (process.env.APP_BASE_URL) {
    try {
      allowedOrigins.add(new URL(process.env.APP_BASE_URL).origin);
    } catch {
      console.error("APP_BASE_URL is not a valid URL");
    }
  }

  return allowedOrigins.has(origin);
}

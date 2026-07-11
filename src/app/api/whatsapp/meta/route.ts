import { ConversationChannel } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { processInboundMessage } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseWhatsAppCloudMessages, sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";

const DEFAULT_DEMO_TENANT_SLUG = "clinica-murcia-elche";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }

  return NextResponse.json({ success: false, error: "Verificacion de WhatsApp no valida." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const tenantSlug = process.env.WHATSAPP_DEMO_TENANT_SLUG || process.env.DEFAULT_TENANT_SLUG || DEFAULT_DEMO_TENANT_SLUG;
  const rate = checkRateLimit(`whatsapp-meta:${tenantSlug}`, 180, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ success: true, data: { received: 0, processed: 0, rateLimited: true }, error: null });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "JSON no valido." }, { status: 400 });
  }

  const messages = parseWhatsAppCloudMessages(payload);
  if (messages.length === 0) {
    return NextResponse.json({ success: true, data: { received: 0, processed: 0 }, error: null });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, include: { settings: true } });
  if (!tenant) {
    console.error("whatsapp meta tenant not found", tenantSlug);
    return NextResponse.json({ success: false, data: null, error: "Clinica demo no encontrada." }, { status: 500 });
  }

  let processed = 0;
  let delivered = 0;

  for (const message of messages.slice(0, 10)) {
    try {
      const result = await processInboundMessage(tenant, {
        channel: ConversationChannel.WHATSAPP,
        from: message.from,
        name: message.name,
        body: message.body
      });
      processed += 1;

      if (result.reply) {
        await sendWhatsAppText({ to: message.from, body: result.reply });
        delivered += 1;
      }
    } catch (error) {
      console.error("whatsapp meta message failed", {
        messageId: message.id,
        from: message.from,
        error
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { received: messages.length, processed, delivered },
    error: null
  });
}

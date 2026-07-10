import { ConversationChannel } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { processInboundMessage } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, inboundMessageSchema } from "@/lib/validation";

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

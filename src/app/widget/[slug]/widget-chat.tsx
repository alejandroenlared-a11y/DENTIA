"use client";

import { useEffect, useRef, useState } from "react";
import { sleep, splitReplyIntoBubbles, typingDelayForBubble } from "@/lib/chat-bubbles";
import { fetchWithTimeout, isTimeoutError } from "@/lib/http";

const CHAT_REQUEST_TIMEOUT_MS = 30_000;

interface WidgetChatProps {
  slug: string;
  clinicName: string;
  assistantName: string;
  assistantEnabled: boolean;
}

interface ChatEntry {
  from: "user" | "assistant" | "system";
  text: string;
}

interface WebhookResponse {
  success: boolean;
  data: { reply: string | null; escalated: boolean } | null;
  error: string | null;
}

export function WidgetChat({ slug, clinicName, assistantName, assistantEnabled }: WidgetChatProps) {
  const [conversationFrom] = useState(() => `web-${crypto.randomUUID()}`);
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>(() => [
    {
      from: "assistant",
      text: assistantEnabled
        ? `Hola, soy ${assistantName}, recepcionista IA de ${clinicName}. Puedes contarme qué necesitas y te oriento para cita, presupuesto o urgencia.`
        : `Hola, ahora mismo el asistente esta pausado. Deja tu mensaje y recepcion lo revisara.`
    }
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, sending]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body || sending) {
      return;
    }
    setSending(true);
    setError(null);
    setEntries(previous => [...previous, { from: "user", text: body }]);
    setMessage("");

    try {
      const response = await fetchWithTimeout(`/api/webhooks/${slug}/web`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: conversationFrom, body })
      }, CHAT_REQUEST_TIMEOUT_MS);
      const payload = (await response.json()) as WebhookResponse;

      if (!payload.success) {
        setError(payload.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      if (payload.data?.reply) {
        const bubbles = splitReplyIntoBubbles(payload.data.reply);
        for (const bubble of bubbles) {
          await sleep(typingDelayForBubble(bubble));
          setEntries(previous => [...previous, { from: "assistant", text: bubble }]);
        }
      } else {
        setEntries(previous => [
          ...previous,
          { from: "system", text: "Mensaje recibido. Una persona del equipo te respondera en breve." }
        ]);
      }
    } catch (error) {
      setError(
        isTimeoutError(error)
          ? "El asistente esta tardando mas de lo normal. Envia el mensaje de nuevo."
          : "Error de conexion. Intentalo de nuevo."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card pad widget-card">
      <header className="widget-head">
        <strong>{clinicName}</strong>
        <span>{assistantEnabled ? `${assistantName} en linea · 24/7` : "Recepcion respondera en horario de clinica"}</span>
      </header>

      <div className="widget-messages" aria-live="polite" ref={messagesRef}>
        {entries.map((entry, index) => (
          <p key={index} className={`widget-message ${entry.from}`}>
            {entry.text}
          </p>
        ))}
        {sending ? <p className="widget-message system">Escribiendo…</p> : null}
      </div>
      {error ? <p className="widget-error" role="alert">{error}</p> : null}
      <form onSubmit={sendMessage} className="widget-input">
        <input
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder="Escribe tu mensaje..."
          aria-label="Mensaje para Clara"
        />
        <button className="button primary" type="submit" disabled={sending}>
          Enviar
        </button>
      </form>
    </section>
  );
}

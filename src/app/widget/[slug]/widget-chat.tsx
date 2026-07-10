"use client";

import { useState } from "react";

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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startChat(event: React.FormEvent) {
    event.preventDefault();
    if (!phone.trim() || !consent) {
      setError("Necesitamos un telefono de contacto y tu consentimiento RGPD.");
      return;
    }
    setError(null);
    setStarted(true);
    setEntries([
      {
        from: "assistant",
        text: assistantEnabled
          ? `Hola! Soy ${assistantName}, el asistente de ${clinicName}. En que puedo ayudarte?`
          : `Hola! Ahora mismo el asistente esta pausado; deja tu mensaje y el equipo de ${clinicName} te respondera.`
      }
    ]);
  }

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
      const response = await fetch(`/api/webhooks/${slug}/web`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: phone.trim(), name: name.trim() || undefined, body })
      });
      const payload = (await response.json()) as WebhookResponse;

      if (!payload.success) {
        setError(payload.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      if (payload.data?.reply) {
        setEntries(previous => [...previous, { from: "assistant", text: payload.data?.reply ?? "" }]);
      } else {
        setEntries(previous => [
          ...previous,
          { from: "system", text: "Mensaje recibido. Una persona del equipo te respondera en breve." }
        ]);
      }
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
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

      {!started ? (
        <form onSubmit={startChat} className="form-grid">
          <label className="field">
            <span>Telefono de contacto</span>
            <input value={phone} onChange={event => setPhone(event.target.value)} required placeholder="600 000 000" />
          </label>
          <label className="field">
            <span>Nombre (opcional)</span>
            <input value={name} onChange={event => setName(event.target.value)} />
          </label>
          <label className="widget-consent">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />
            <span>
              Acepto que {clinicName} trate mis datos para gestionar mi consulta (RGPD). Hablas con un asistente
              virtual.
            </span>
          </label>
          {error ? <p className="widget-error" role="alert">{error}</p> : null}
          <button className="button primary" type="submit">Empezar chat</button>
        </form>
      ) : (
        <>
          <div className="widget-messages" aria-live="polite">
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
              placeholder="Escribe tu mensaje…"
              aria-label="Mensaje"
            />
            <button className="button primary" type="submit" disabled={sending}>
              Enviar
            </button>
          </form>
        </>
      )}
    </section>
  );
}

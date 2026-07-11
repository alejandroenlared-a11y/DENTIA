"use client";

import { ArrowLeft, CheckCheck, Mic, Paperclip, Phone, Send, ShieldCheck, Smile, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type WhatsAppDemoChatProps = {
  slug: string;
  clinicName: string;
  assistantName: string;
  clinicPhone: string;
  assistantEnabled: boolean;
  rgpdNotes?: string;
};

type ChatEntry = {
  id: string;
  from: "patient" | "assistant" | "system";
  text: string;
  time: string;
};

type WebhookResponse = {
  success: boolean;
  data: { reply: string | null; escalated: boolean } | null;
  error: string | null;
};

const quickPrompts = [
  "Me duele una muela con frio y al morder, no tengo fiebre ni hinchazon.",
  "Quiero saber precio de un implante y si se puede financiar.",
  "Me sangran las encias al cepillarme desde hace semanas.",
  "Acepto que guardes mis datos. Soy Marta Ruiz, telefono 629179640. Prefiero Elche por la tarde."
];

export function WhatsAppDemoChat({
  slug,
  clinicName,
  assistantName,
  clinicPhone,
  assistantEnabled,
  rgpdNotes
}: WhatsAppDemoChatProps) {
  const [patientName, setPatientName] = useState("Paciente demo");
  const [patientPhone, setPatientPhone] = useState("+34 629 179 640");
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    []
  );

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, sending]);

  function now() {
    return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function startDemo(event: React.FormEvent) {
    event.preventDefault();
    if (!patientPhone.trim() || !consent) {
      setError("Para que la demo sea realista necesitamos telefono y consentimiento RGPD.");
      return;
    }
    setError(null);
    setStarted(true);
    setEntries([
      {
        id: crypto.randomUUID(),
        from: "system",
        text: "Demo privada: esta pantalla simula WhatsApp y guarda la conversacion en Dentia.",
        time: now()
      },
      {
        id: crypto.randomUUID(),
        from: "assistant",
        text: assistantEnabled
          ? `Hola, soy ${assistantName}, recepcionista IA de ${clinicName}. Puedes contarme que necesitas y te oriento para cita, presupuesto o urgencia.`
          : `Hola, ahora mismo el asistente esta pausado. Deja tu mensaje y recepcion lo revisara.`,
        time: now()
      }
    ]);
  }

  async function sendMessage(event?: React.FormEvent, preset?: string) {
    event?.preventDefault();
    const body = (preset ?? message).trim();
    if (!body || sending) {
      return;
    }

    setSending(true);
    setError(null);
    setMessage("");
    setEntries(previous => [...previous, { id: crypto.randomUUID(), from: "patient", text: body, time: now() }]);

    try {
      const response = await fetch(`/api/webhooks/${slug}/whatsapp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: patientPhone.trim(),
          name: patientName.trim() || undefined,
          body
        })
      });
      const payload = (await response.json()) as WebhookResponse;

      if (!payload.success) {
        setError(payload.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      setEntries(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          from: payload.data?.reply ? "assistant" : "system",
          text: payload.data?.reply ?? "Mensaje recibido. Recepcion lo revisara en breve.",
          time: now()
        }
      ]);
    } catch {
      setError("Error de conexion con el agente. Intentalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wa-demo-stage">
      <section className="wa-demo-copy" aria-label="Informacion de la demo">
        <span className="wa-demo-eyebrow">Demo WhatsApp sin Meta</span>
        <h1>Recepcionista IA dental en una conversacion tipo WhatsApp</h1>
        <p>
          El cliente escribe aqui como si fuese WhatsApp. Clara responde con la base de conocimiento de la clinica,
          detecta urgencias, pide consentimiento y deja la cita o tarea registrada en el SaaS.
        </p>
        <div className="wa-demo-proof">
          <ShieldCheck aria-hidden="true" />
          <span>Modo demo: no envia mensajes reales al numero. Usa el canal interno WhatsApp del CRM.</span>
        </div>
        <a className="wa-demo-open-crm" href="/" target="_blank" rel="noreferrer">
          Abrir CRM en otra pestaña
        </a>
      </section>

      <section className="wa-phone" aria-label="Demo de chat tipo WhatsApp">
        <div className="wa-phone-speaker" aria-hidden="true" />
        <header className="wa-chat-header">
          <button className="wa-icon-button" type="button" aria-label="Volver">
            <ArrowLeft />
          </button>
          <div className="wa-avatar" aria-hidden="true">
            {assistantName.slice(0, 1).toUpperCase()}
          </div>
          <div className="wa-contact">
            <strong>{assistantName}</strong>
            <span>{assistantEnabled ? "en linea · recepcion IA" : "asistente pausado"}</span>
          </div>
          <button className="wa-icon-button" type="button" aria-label="Videollamada demo">
            <Video />
          </button>
          <button className="wa-icon-button" type="button" aria-label="Llamada demo">
            <Phone />
          </button>
        </header>

        {!started ? (
          <form className="wa-start-panel" onSubmit={startDemo}>
            <div>
              <h2>Configurar paciente demo</h2>
              <p>Estos datos identifican el hilo en el CRM. Puedes cambiarlos antes de empezar.</p>
            </div>
            <label>
              Nombre
              <input value={patientName} onChange={event => setPatientName(event.target.value)} />
            </label>
            <label>
              Telefono
              <input value={patientPhone} onChange={event => setPatientPhone(event.target.value)} required />
            </label>
            <label className="wa-consent">
              <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />
              <span>
                Acepto usar estos datos para gestionar la demo. {rgpdNotes || "El asistente no diagnostica y puede escalar a recepcion."}
              </span>
            </label>
            {error ? <p className="wa-error" role="alert">{error}</p> : null}
            <button className="wa-start-button" type="submit">Entrar al chat</button>
          </form>
        ) : (
          <>
            <div className="wa-chat-body" ref={messagesRef}>
              <div className="wa-day-pill">{todayLabel}</div>
              {entries.map(entry => (
                <div className={`wa-bubble-row ${entry.from}`} key={entry.id}>
                  <p className="wa-bubble">
                    <span>{entry.text}</span>
                    <small>
                      {entry.time}
                      {entry.from === "patient" ? <CheckCheck aria-hidden="true" /> : null}
                    </small>
                  </p>
                </div>
              ))}
              {sending ? (
                <div className="wa-bubble-row assistant">
                  <p className="wa-bubble wa-typing" aria-label={`${assistantName} esta escribiendo`}>
                    <span />
                    <span />
                    <span />
                  </p>
                </div>
              ) : null}
            </div>

            <div className="wa-quick-prompts" aria-label="Mensajes rapidos de prueba">
              {quickPrompts.map(prompt => (
                <button key={prompt} type="button" onClick={() => void sendMessage(undefined, prompt)} disabled={sending}>
                  {prompt}
                </button>
              ))}
            </div>

            {error ? <p className="wa-error wa-error-inline" role="alert">{error}</p> : null}

            <form className="wa-input-bar" onSubmit={event => void sendMessage(event)}>
              <button className="wa-icon-button" type="button" aria-label="Emoji">
                <Smile />
              </button>
              <input
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder="Mensaje"
                aria-label="Mensaje para la recepcionista IA"
              />
              <button className="wa-icon-button" type="button" aria-label="Adjuntar">
                <Paperclip />
              </button>
              <button className="wa-send-button" type={message.trim() ? "submit" : "button"} aria-label={message.trim() ? "Enviar" : "Audio demo"} disabled={sending}>
                {message.trim() ? <Send /> : <Mic />}
              </button>
            </form>
          </>
        )}

        <footer className="wa-phone-home" aria-label={`Telefono demo ${clinicPhone}`} />
      </section>
    </div>
  );
}

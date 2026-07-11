import { describe, expect, it } from "vitest";
import { buildWhatsAppTextPayload, parseWhatsAppCloudMessages } from "@/lib/whatsapp";

describe("parseWhatsAppCloudMessages", () => {
  it("extracts text messages from Meta WhatsApp Cloud payloads", () => {
    const messages = parseWhatsAppCloudMessages({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [
                  {
                    profile: { name: "Laura Paciente" },
                    wa_id: "34629179640"
                  }
                ],
                messages: [
                  {
                    from: "34629179640",
                    id: "wamid.test",
                    timestamp: "1783764000",
                    type: "text",
                    text: { body: "Hola, me duele una muela y quiero cita en Elche." }
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    expect(messages).toEqual([
      {
        id: "wamid.test",
        from: "+34629179640",
        name: "Laura Paciente",
        body: "Hola, me duele una muela y quiero cita en Elche.",
        type: "text",
        timestamp: "1783764000"
      }
    ]);
  });

  it("ignores status-only webhook payloads", () => {
    const messages = parseWhatsAppCloudMessages({
      entry: [{ changes: [{ value: { statuses: [{ id: "sent" }] } }] }]
    });

    expect(messages).toEqual([]);
  });
});

describe("buildWhatsAppTextPayload", () => {
  it("builds a Cloud API text payload without plus signs in recipient", () => {
    expect(buildWhatsAppTextPayload({ to: "+34 629 179 640", body: "Mensaje de prueba" })).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "34629179640",
      type: "text",
      text: {
        preview_url: false,
        body: "Mensaje de prueba"
      }
    });
  });
});

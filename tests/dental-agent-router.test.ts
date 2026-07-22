import { describe, expect, it } from "vitest";
import { routeConversationIntent } from "@/lib/agent/dental-agent-router";

describe("routeConversationIntent", () => {
  it("routes a bare greeting", () => {
    expect(routeConversationIntent("hola")).toBe("greeting");
    expect(routeConversationIntent("Buenas tardes!")).toBe("greeting");
  });

  it("routes a bare thanks distinctly from a generic closing acknowledgment", () => {
    expect(routeConversationIntent("gracias")).toBe("thanks");
    expect(routeConversationIntent("muchas gracias!!")).toBe("thanks");
    expect(routeConversationIntent("perfecto")).toBe("confirm");
    expect(routeConversationIntent("vale")).toBe("confirm");
  });

  it("routes a location question", () => {
    expect(routeConversationIntent("hola, donde estais?")).toBe("ask_location");
  });

  it("routes a team/specialty question", () => {
    expect(routeConversationIntent("que especialidades teneis?")).toBe("ask_team");
  });

  it("routes a price question", () => {
    expect(routeConversationIntent("cuanto cuesta una limpieza?")).toBe("ask_price");
  });

  it("falls back to unknown for a clinical/symptom message", () => {
    expect(routeConversationIntent("me duele una muela y sangra")).toBe("unknown");
  });

  it("prioritizes greeting over any other match when the message is only a greeting", () => {
    expect(routeConversationIntent("hola")).not.toBe("ask_location");
  });
});

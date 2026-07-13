import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runDentalAgentTurn, runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";
import { fetchWithTimeout, RequestTimeoutError } from "@/lib/http";

const originalProvider = process.env.LLM_PROVIDER;
const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGeminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL;

afterEach(() => {
  process.env.LLM_PROVIDER = originalProvider;
  process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  process.env.GEMINI_API_KEY = originalGeminiApiKey;
  process.env.GEMINI_MODEL = originalGeminiModel;
  process.env.GEMINI_FALLBACK_MODEL = originalGeminiFallbackModel;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockHangingFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
  );
}

describe("fetchWithTimeout", () => {
  it("rejects with RequestTimeoutError when the request hangs", async () => {
    vi.useFakeTimers();
    mockHangingFetch();

    const promise = fetchWithTimeout("https://example.test/slow", {}, 5_000);
    const assertion = expect(promise).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(5_100);
    await assertion;
  });

  it("returns the response when the request completes in time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);

    const response = await fetchWithTimeout("https://example.test/fast", {}, 5_000);
    expect(response.ok).toBe(true);
  });
});

describe("dental agent under hanging LLM APIs", () => {
  it("replies with the local engine when OpenAI hangs, instead of waiting forever", async () => {
    delete process.env.LLM_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";

    vi.useFakeTimers();
    mockHangingFetch();

    const promise = runOpenAiDentalAgentTurn({
      latestPatientMessage: "Me duele una muela con frio y al morder, no tengo fiebre ni hinchazon.",
      history: [],
      state: initialDentalAgentState
    });
    await vi.advanceTimersByTimeAsync(13_000);
    const result = await promise;

    expect(result.runtime).toBe("local");
    expect(result.fallbackReason).toContain("Sin respuesta");
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.state.intent).toBe("caries_restoration");
  });

  it("replies with the local engine when Gemini hangs and does not retry the fallback model", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-hang-test";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-flash-test";

    vi.useFakeTimers();
    const fetchMock = mockHangingFetch();

    const promise = runDentalAgentTurn({
      latestPatientMessage: "Quiero saber precio de un implante y si se puede financiar.",
      history: [],
      state: initialDentalAgentState
    });
    await vi.advanceTimersByTimeAsync(13_000);
    const result = await promise;

    expect(result.runtime).toBe("local");
    expect(result.fallbackReason).toContain("Sin respuesta");
    expect(result.reply.length).toBeGreaterThan(0);
    // Un timeout no debe encadenar una segunda espera con el modelo de fallback.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

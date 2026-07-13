const DEFAULT_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Sin respuesta del proveedor externo en ${Math.round(timeoutMs / 1000)}s`);
    this.name = "RequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isTimeoutError(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError;
}

/**
 * fetch con limite de tiempo total (cabeceras + cuerpo). El temporizador no se
 * cancela al recibir cabeceras: si el cuerpo se queda a medias tambien aborta,
 * que es el caso real que dejaba el chat "pensando" indefinidamente.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs) as unknown as { unref?: () => void };
  timer.unref?.();

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RequestTimeoutError(timeoutMs);
    }
    throw error;
  }
}

export function resolveTimeoutMs(envName: string, fallbackMs: number): number {
  const raw = process.env[envName];
  if (!raw) {
    return fallbackMs;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1_000 && parsed <= 60_000 ? parsed : fallbackMs;
}

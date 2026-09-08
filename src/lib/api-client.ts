import { requestLoadingBus } from "@/lib/loading-bus";

export type FieldErrors = Record<string, string[]>;

export class ApiRequestError extends Error {
  status: number;
  code: string;
  fieldErrors?: FieldErrors;
  constructor(status: number, code: string, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function extractFieldErrors(details: unknown): FieldErrors | undefined {
  if (!details || typeof details !== "object") return undefined;
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return undefined;
  return fieldErrors as FieldErrors;
}

function humanizeErrorCode(code: string) {
  switch (code) {
    case "VALIDATION_ERROR":
      return "Check the form for errors and try again.";
    case "FORBIDDEN":
      return "You do not have permission to do this.";
    case "UNAUTHENTICATED":
      return "Please sign in again.";
    case "NOT_FOUND":
      return "That record could not be found.";
    case "CONFLICT":
      return "That name is already in use.";
    case "RATE_LIMITED":
      return "Too many requests. Please try again shortly.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// Transient failures (dropped connections, a free-tier host waking from cold
// start, a momentary 5xx) are retried with backoff; anything with an actual
// response in the 4xx range is a deterministic rejection and is never
// retried, since resending it can't change the outcome.
const MAX_RETRIES = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_API_MAX_RETRIES);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
})();
const RETRY_BASE_DELAY_MS = 300;
const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  requestLoadingBus.begin();
  try {
    let attempt = 0;
    for (;;) {
      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          headers: { "Content-Type": "application/json", ...init?.headers },
        });
      } catch (networkError) {
        if (attempt >= MAX_RETRIES) throw networkError;
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        attempt += 1;
        continue;
      }

      if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        attempt += 1;
        continue;
      }

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body?.error ?? "REQUEST_FAILED";
        const message =
          typeof body?.details === "string" ? body.details : humanizeErrorCode(code);
        throw new ApiRequestError(response.status, code, message, extractFieldErrors(body?.details));
      }
      return body as T;
    }
  } finally {
    requestLoadingBus.end();
  }
}

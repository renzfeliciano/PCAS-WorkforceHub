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

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  requestLoadingBus.begin();
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const code = body?.error ?? "REQUEST_FAILED";
      const message =
        typeof body?.details === "string" ? body.details : humanizeErrorCode(code);
      throw new ApiRequestError(response.status, code, message, extractFieldErrors(body?.details));
    }
    return body as T;
  } finally {
    requestLoadingBus.end();
  }
}

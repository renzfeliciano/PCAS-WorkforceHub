export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
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
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error ?? "REQUEST_FAILED";
    const message =
      typeof body?.details === "string" ? body.details : humanizeErrorCode(code);
    throw new ApiRequestError(response.status, code, message);
  }
  return body as T;
}

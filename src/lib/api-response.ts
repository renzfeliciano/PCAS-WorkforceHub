import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConflictError, ForbiddenActionError, NotFoundError } from "@/lib/app-errors";
import { UnparseableNameError } from "@/lib/username";

type Headers = Record<string, string>;

export function apiJson(
  data: unknown,
  requestId: string,
  headers?: Headers,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: { "X-Request-Id": requestId, ...headers },
  });
}

export function apiError(
  code: string,
  status: number,
  requestId: string,
  headers?: Headers,
  details?: unknown,
) {
  return NextResponse.json(
    { error: code, requestId, ...(details ? { details } : {}) },
    { status, headers: { "X-Request-Id": requestId, ...headers } },
  );
}

export function mapServiceError(error: unknown, requestId: string, headers?: Headers) {
  if (error instanceof ZodError)
    return apiError("VALIDATION_ERROR", 400, requestId, headers, error.flatten());
  if (error instanceof ForbiddenActionError)
    return apiError("FORBIDDEN", 403, requestId, headers, error.message);
  if (error instanceof NotFoundError)
    return apiError("NOT_FOUND", 404, requestId, headers, error.message);
  if (error instanceof ConflictError)
    return apiError("CONFLICT", 409, requestId, headers, error.message);
  if (error instanceof UnparseableNameError)
    return apiError("VALIDATION_ERROR", 400, requestId, headers, error.message);
  console.error(error);
  return apiError("INTERNAL_ERROR", 500, requestId, headers);
}

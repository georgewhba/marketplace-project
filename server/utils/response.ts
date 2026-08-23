import type { Context } from 'hono';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(c: Context, data: T, statusCode = 200, meta?: PaginationMeta) {
  const response: SuccessResponse<T> = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return c.json(response, statusCode as 200);
}

export function sendError(c: Context, statusCode: number, code: string, message: string, details?: unknown) {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return c.json(response, statusCode as 400);
}

export function sendCreated<T>(c: Context, data: T) {
  return sendSuccess(c, data, 201);
}

export function sendNoContent(c: Context) {
  return c.body(null, 204);
}

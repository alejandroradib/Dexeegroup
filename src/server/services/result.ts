export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string; details?: Record<string, string[]> };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = (error: string, details?: Record<string, string[]>): Err => ({ ok: false, error, details });

/** Error codes returned to the client, translated with `common.errors` or the area namespace. */
export const ERR = {
  generic: "generic",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  notFound: "notFound",
  validation: "validation",
  rateLimited: "rateLimited",
  duplicate: "duplicate",
  conflict: "conflict",
} as const;

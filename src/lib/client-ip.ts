type HeaderReader = { get(name: string): string | null };

/**
 * Client IP for rate limiting (audit C5). The first value of `x-forwarded-for` is whatever
 * the client sent, so it is never used. Order: the header Vercel injects, then Vercel's own
 * copy of the forwarding chain, then the last hop of `x-forwarded-for`, which the proxy in
 * front of the app appended.
 */
export function pickClientIp(headers: HeaderReader): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel.split(",").pop()?.trim() || "unknown";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").pop()?.trim() || "unknown";
  return "unknown";
}

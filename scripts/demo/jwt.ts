/** Minimal HS256 JWT signing and verification with Node crypto (no dependencies). */
import { createHmac, timingSafeEqual } from "node:crypto";

import { ACCESS_TOKEN_TTL_SECONDS, JWT_ISSUER, JWT_SECRET } from "./config";

export type Claims = Record<string, unknown> & { exp?: number; role?: string; sub?: string };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signJwt(claims: Claims, secret = JWT_SECRET): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Returns the claims when the signature is valid and the token is not expired, else null. */
export function verifyJwt(token: string, secret = JWT_SECRET): Claims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof claims !== "object" || claims === null) return null;
  const result = claims as Claims;
  if (typeof result.exp === "number" && result.exp < Math.floor(Date.now() / 1000)) return null;
  return result;
}

/** Long-lived API keys, deterministic so every process computes the same strings. */
const KEY_ISSUED_AT = 1_700_000_000;
const KEY_EXPIRY = KEY_ISSUED_AT + 10 * 365 * 24 * 3600;

export function apiKey(role: "anon" | "service_role"): string {
  return signJwt({ iss: "supabase-demo", ref: "local", role, iat: KEY_ISSUED_AT, exp: KEY_EXPIRY });
}

export type SessionUserClaims = {
  id: string;
  email: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};

export function accessToken(user: SessionUserClaims, sessionId: string) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TOKEN_TTL_SECONDS;
  const token = signJwt({
    iss: JWT_ISSUER,
    sub: user.id,
    aud: "authenticated",
    exp,
    iat,
    email: user.email,
    phone: "",
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "password", timestamp: iat }],
    session_id: sessionId,
    is_anonymous: false,
  });
  return { token, exp, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

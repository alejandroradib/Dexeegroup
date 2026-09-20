import "server-only";

import { logger } from "@/lib/logger";

/**
 * Google Indexing API ping for job pages (PHASES-GTM 9.5).
 *
 * Feature-flagged behind `INDEXING_API_CREDENTIALS`, a service account JSON key. Without
 * it every call is a silent no-op, so publishing a vacancy works the same in development
 * and in a deployment that has not been granted the credential.
 *
 * Failures never propagate: publishing a job must not fail because Google is slow.
 */

type IndexingAction = "URL_UPDATED" | "URL_DELETED";

type ServiceAccount = { client_email: string; private_key: string };

const SCOPE = "https://www.googleapis.com/auth/indexing";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";

function credentials(): ServiceAccount | null {
  const raw = process.env.INDEXING_API_CREDENTIALS;
  if (!raw || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    logger.warn("indexing_api_credentials_unparseable");
    return null;
  }
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Strips the PEM header, footer and newlines so the key can be imported as PKCS#8. */
function pemToBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Signs a JWT with RS256 using Web Crypto, so no extra dependency is needed. */
async function accessToken(account: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(account.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );
  const assertion = `${header}.${claim}.${base64url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    logger.warn({ status: response.status }, "indexing_api_token_failed");
    return null;
  }
  const body = (await response.json()) as { access_token?: string };
  return body.access_token ?? null;
}

/**
 * Tells Google a job URL was published or removed. Returns true only when the ping was
 * accepted; false covers "no credential" as well as a failed call, since neither is an
 * error the caller should act on.
 */
export async function notifyIndexing(url: string, action: IndexingAction): Promise<boolean> {
  const account = credentials();
  if (!account) return false;
  try {
    const token = await accessToken(account);
    if (!token) return false;
    const response = await fetch(PUBLISH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, type: action }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status, url, action }, "indexing_api_publish_failed");
      return false;
    }
    return true;
  } catch (error) {
    logger.warn({ err: (error as Error).message, url, action }, "indexing_api_error");
    return false;
  }
}

/** Pings both locale URLs of a job. Never throws; the caller does not await a result. */
export async function notifyJobIndexed(
  siteUrl: string,
  slug: string,
  action: IndexingAction,
  locales: readonly string[] = ["en", "es"],
): Promise<void> {
  await Promise.all(
    locales.map((locale) => notifyIndexing(`${siteUrl}/${locale}/jobs/${slug}`, action)),
  );
}

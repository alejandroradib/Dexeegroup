/**
 * Seeds carry fixed passwords and demo data, so they only ever run against a local Supabase
 * (audit I20). The check is on the API URL's host; anything that is not loopback, a private
 * address or a local development name is refused.
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "host.docker.internal",
  "kong",
  "supabase_kong",
]);

const PRIVATE_IPV4 = /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

export function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    LOCAL_HOSTS.has(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.startsWith("supabase_kong_") ||
    PRIVATE_IPV4.test(host)
  );
}

/**
 * Throws unless the URL points at a local Supabase. `overrideVariable`, when given and set to
 * "1" in the environment, lets a script that is designed for a hosted demo run remotely on
 * purpose; the plain seed has no override.
 */
export function assertLocalSupabaseUrl(
  url: string | undefined,
  script: string,
  overrideVariable?: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (isLocalSupabaseUrl(url)) return;
  if (overrideVariable && env[overrideVariable] === "1") return;
  const host = (() => {
    try {
      return new URL(url ?? "").host;
    } catch {
      return String(url);
    }
  })();
  const hint = overrideVariable
    ? ` Set ${overrideVariable}=1 to run it against a hosted project on purpose.`
    : "";
  throw new Error(
    `${script} refuses to run against ${host}: seeds are for a local Supabase only.${hint}`,
  );
}

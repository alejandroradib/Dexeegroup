/** Fixed settings for the local demo stack. Nothing here is a real secret. */
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const DEMO_DIR = path.join(ROOT, ".demo");
export const STORAGE_DIR = path.join(DEMO_DIR, "storage");
export const POSTGREST_BIN = path.join(DEMO_DIR, "bin", "postgrest");
export const POSTGREST_CONF = path.join(DEMO_DIR, "postgrest.conf");
export const ENV_FILE = path.join(ROOT, ".env.demo");

export const PG_PORT = 54329;
export const PG_URL = `postgres://postgres@127.0.0.1:${PG_PORT}/dexee`;
export const POSTGREST_DB_URI = `postgres://authenticator@127.0.0.1:${PG_PORT}/dexee`;
export const POSTGREST_PORT = 3001;
export const GATEWAY_HOST = "127.0.0.1";
export const GATEWAY_PORT = 54320;
export const GATEWAY_URL = `http://${GATEWAY_HOST}:${GATEWAY_PORT}`;
export const SITE_URL = "http://localhost:3000";

export const POSTGREST_RELEASE =
  "https://github.com/PostgREST/postgrest/releases/download/v13.0.4/postgrest-v13.0.4-linux-static-x86-64.tar.xz";

/** HS256 secret shared by the fake GoTrue and PostgREST (>= 32 chars, as PostgREST requires). */
export const JWT_SECRET = "dexee-local-demo-jwt-secret-do-not-use-in-production-0123456789";
export const JWT_ISSUER = `${GATEWAY_URL}/auth/v1`;
export const ACCESS_TOKEN_TTL_SECONDS = 3600;
export const CRON_SECRET = "demo-cron-secret-12345678";
export const EMAIL_FROM = "Dexee <no-reply@dexeegroup.com>";

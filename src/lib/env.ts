import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const publicEnvSchema = z.object({
  // Trailing slashes are stripped so every `${siteUrl}/...` join yields a single slash (audit D1).
  NEXT_PUBLIC_SITE_URL: z
    .url()
    .default("http://localhost:3000")
    .transform((url) => url.replace(/\/+$/, "")),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_ANALYTICS_PROVIDER: z.enum(["none", "plausible", "ga4"]).default("none"),
  NEXT_PUBLIC_ANALYTICS_ID: optionalString,
});

/**
 * A cron secret has to be random: 32 characters or more and none of the placeholders that
 * ship in examples (audit I17). `openssl rand -hex 32` produces a valid one.
 */
const CRON_SECRET_PLACEHOLDER = /change[-_]?me|placeholder|example|dummy|xxx/i;
const SINGLE_CHARACTER = /^(.)\1+$/;
export const cronSecretSchema = z
  .string()
  .min(32, "CRON_SECRET must have at least 32 characters (openssl rand -hex 32)")
  .refine(
    (value) => !CRON_SECRET_PLACEHOLDER.test(value) && !SINGLE_CHARACTER.test(value),
    "CRON_SECRET looks like a placeholder; generate a random value (openssl rand -hex 32)",
  );

export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_URL: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  OPENAI_API_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().default("Dexee <info@dexeegroup.com>"),
  CRON_SECRET: cronSecretSchema,
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  /** Names the Upstash integration of the Vercel Marketplace creates; read when the UPSTASH_* pair is absent. */
  KV_REST_API_URL: optionalString,
  KV_REST_API_TOKEN: optionalString,
  SENTRY_DSN: optionalString,
  /** Booking link. Optional: when unset the "book a call" buttons are not rendered. */
  CALENDLY_URL: optionalString,
  ADMIN_EMAIL: optionalString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * REST credentials of the shared rate-limit store. A manual setup provides UPSTASH_REDIS_REST_*;
 * the Vercel Marketplace integration provides KV_REST_API_*. A pair is used only when complete.
 */
export function redisRestCredentials(
  env: Pick<
    ServerEnv,
    "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN" | "KV_REST_API_URL" | "KV_REST_API_TOKEN"
  >,
): { url: string; token: string } | undefined {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN };
  }
  return undefined;
}

function formatIssues(scope: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  return [
    `Invalid ${scope} environment configuration.`,
    ...lines,
    "Copy .env.example to .env.local and fill in the missing values.",
  ].join("\n");
}

export function parsePublicEnv(source: NodeJS.ProcessEnv = process.env): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ANALYTICS_PROVIDER: emptyToUndefined(source.NEXT_PUBLIC_ANALYTICS_PROVIDER),
    NEXT_PUBLIC_ANALYTICS_ID: source.NEXT_PUBLIC_ANALYTICS_ID,
  });
  if (!result.success) throw new Error(formatIssues("public", result.error));
  return result.data;
}

export function parseServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) throw new Error(formatIssues("server", result.error));
  return result.data;
}

let cachedPublic: PublicEnv | undefined;
let cachedServer: ServerEnv | undefined;

/** Public variables are inlined by Next.js, so they must be referenced explicitly. */
export function publicEnv(): PublicEnv {
  cachedPublic ??= parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ANALYTICS_PROVIDER: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  } as unknown as NodeJS.ProcessEnv);
  return cachedPublic;
}

/** Server-only variables. Never import this from a client component. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser");
  }
  cachedServer ??= parseServerEnv();
  return cachedServer;
}

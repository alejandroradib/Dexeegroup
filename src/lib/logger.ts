import pino from "pino";

/** Structured logger. Request ids are attached by callers via `logger.child({ requestId })`. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "dexee-platform" },
  redact: ["email", "phone", "password", "*.password", "*.token"],
});

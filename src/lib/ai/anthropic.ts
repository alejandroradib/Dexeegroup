import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import type { z } from "zod";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  const env = serverEnv();
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** Rough USD per million tokens, used only for the ai_usage cost estimate. */
const PRICE_PER_MTOK = { input: 3, output: 15 };

export type CompleteJsonOptions = {
  feature: string;
  actorUserId?: string | null;
  maxTokens?: number;
  temperature?: number;
  retries?: number;
};

/**
 * Sends a system and user prompt, expects strict JSON back and validates it with the given schema.
 * Retries once on parse failure. Logs tokens to ai_usage.
 */
export async function completeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  options: CompleteJsonOptions,
): Promise<T> {
  const env = serverEnv();
  const retries = options.retries ?? 1;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await getClient().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0,
      system: `${system}\n\nRespond with a single JSON object and nothing else. No markdown fences.`,
      messages: [
        {
          role: "user",
          content:
            attempt === 0
              ? user
              : `${user}\n\nYour previous answer was not valid JSON for the schema. Return only the JSON object.`,
        },
      ],
    });
    await logUsage(
      options.feature,
      env.ANTHROPIC_MODEL,
      response.usage.input_tokens,
      response.usage.output_tokens,
      options.actorUserId,
    );
    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    try {
      const json = JSON.parse(extractJson(text));
      return schema.parse(json);
    } catch (error) {
      lastError = error;
      logger.warn({ feature: options.feature, attempt }, "ai_json_parse_failed");
    }
  }
  throw lastError instanceof Error ? lastError : new Error("ai_json_parse_failed");
}

function extractJson(text: string): string {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

async function logUsage(
  feature: string,
  model: string,
  input: number,
  output: number,
  actorUserId?: string | null,
) {
  const cost = (input * PRICE_PER_MTOK.input + output * PRICE_PER_MTOK.output) / 1_000_000;
  const { error } = await createAdminClient()
    .from("ai_usage")
    .insert({
      feature,
      model,
      input_tokens: input,
      output_tokens: output,
      cost_estimate: cost,
      actor_user_id: actorUserId ?? null,
    });
  if (error) logger.error({ err: error.message }, "ai_usage_insert_failed");
}

export function aiConfigured(): boolean {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}

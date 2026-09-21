/**
 * Loads supabase/seed.sql (optional, --sql) and the JSON question banks into the linked project.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Idempotent: existing rows are
 * matched by the bank item id stored in `options.bank_id` (mcq/likert/situational) or by prompt (writing/audio).
 */
import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { loadBanks, resolveBanksDir, type BankQuestion } from "./lib/banks";

import type { Database, Json } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

async function upsertQuestions(assessmentId: string, questions: BankQuestion[]) {
  const { data: existing } = await supabase
    .from("assessment_questions")
    .select("id, options, prompt")
    .eq("assessment_id", assessmentId);
  const byBankId = new Map<string, string>();
  for (const row of existing ?? []) {
    const bankId = (row.options as { bank_id?: string } | null)?.bank_id;
    if (bankId) byBankId.set(bankId, row.id);
  }
  let inserted = 0;
  let updated = 0;
  for (const q of questions) {
    const row = {
      assessment_id: assessmentId,
      section: q.section,
      band: q.band ?? null,
      sort_order: q.sort_order,
      prompt: q.prompt,
      question_type: q.question_type,
      options: { ...q.options, bank_id: q.bank_id } as Json,
      answer_key: (q.answer_key ?? null) as Json,
      weight: 1,
      factor: q.factor ?? null,
      is_active: true,
    };
    const id = byBankId.get(q.bank_id);
    if (id) {
      const { error } = await supabase.from("assessment_questions").update(row).eq("id", id);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from("assessment_questions").insert(row);
      if (error) throw error;
      inserted += 1;
    }
  }
  return { inserted, updated };
}

async function main() {
  if (process.argv.includes("--sql")) {
    console.log(
      "Apply supabase/seed.sql with `supabase db reset` or psql; the JS client cannot run raw SQL.",
    );
  }
  const banks = loadBanks(resolveBanksDir());
  const { data: assessments, error } = await supabase.from("assessments").select("id, type");
  if (error) throw error;
  for (const type of ["english_written", "english_oral", "psychometric", "disc"] as const) {
    const assessment = (assessments ?? []).find((a) => a.type === type);
    if (!assessment) {
      console.warn(`No assessments row for ${type}; run the SQL seed first.`);
      continue;
    }
    const result = await upsertQuestions(assessment.id, banks[type]);
    console.log(`${type}: ${result.inserted} inserted, ${result.updated} updated`);
  }
  console.log(
    readFileSync(path.resolve(process.cwd(), "supabase/seed/english_written.json"), "utf8").length >
      0
      ? "Banks loaded."
      : "",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

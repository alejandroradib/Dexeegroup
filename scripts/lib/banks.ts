/** Reads the JSON question banks and normalizes them into assessment_questions rows. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { bankTexts, hashBankText, type RetiredHashes } from "./bank-hashes";

/** Banks that are public domain by nature and may stay in the repository (audit E1). */
const PUBLIC_DOMAIN_BANKS = new Set(["ipip50.json"]);
const REPO_BANKS = "supabase/seed";
const FIXTURE_BANKS = "tests/fixtures/banks";

/**
 * Where the real question banks live (audit E1). The banks carry the answer keys, so they
 * are kept outside version control and read from ASSESSMENT_BANKS_DIR. There is no silent
 * fallback to a sample bank: a caller that needs real items and has no directory configured
 * stops with an explanation. Tests and the migration harness opt into the fixtures instead.
 */
export function resolveBanksDir(options: { allowFixtures?: boolean } = {}): string {
  const configured = process.env.ASSESSMENT_BANKS_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (options.allowFixtures) return path.resolve(process.cwd(), FIXTURE_BANKS);
  throw new Error(
    [
      "ASSESSMENT_BANKS_DIR is not set.",
      "The assessment banks hold the answer keys and are not stored in this repository.",
      "Point the variable at the directory that holds them, for example:",
      "  ASSESSMENT_BANKS_DIR=./.banks npm run db:seed",
      "The fixtures under tests/fixtures/banks are deliberately fake and are only for tests.",
    ].join("\n"),
  );
}

export type BankQuestion = {
  bank_id: string;
  section: string;
  band: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  sort_order: number;
  prompt: string;
  question_type: "mcq" | "writing" | "audio" | "likert" | "situational";
  options: Record<string, unknown>;
  answer_key: Record<string, unknown> | null;
  factor: string | null;
};

type WrittenBank = {
  mcq: {
    id: string;
    section: string;
    band: "band1" | "band2" | "band3";
    prompt: string;
    passage_id: string | null;
    options: { id: string; text: string }[];
    correct: string;
  }[];
  passages: { id: string; band: string; title: string; text: string }[];
  writing_prompts: {
    id: string;
    band: string;
    prompt: string;
    min_words: number;
    max_words: number;
  }[];
};
type OralBank = {
  prompts: {
    id: string;
    category: string;
    prompt: string;
    prep_seconds: number;
    min_seconds: number;
    max_seconds: number;
  }[];
};
type IpipBank = {
  scale: unknown;
  items: { id: string; factor: string; reverse: boolean; text_en: string; text_es: string }[];
};
type DiscBank = {
  scale: unknown;
  items: {
    id: string;
    style: "D" | "I" | "S" | "C";
    reverse: boolean;
    text_en: string;
    text_es: string;
  }[];
};
type SjtBank = {
  items: {
    id: string;
    theme: string;
    prompt_en: string;
    prompt_es: string;
    options: { id: string; text_en: string; text_es: string }[];
    best: string;
  }[];
};

/** Band quotas use the representative CEFR level of each band for the `band` column. */
const BAND_LEVEL: Record<"band1" | "band2" | "band3", "B1" | "B2" | "C1"> = {
  band1: "B1",
  band2: "B2",
  band3: "C1",
};

export function loadBanks(dir: string) {
  const read = <T>(name: string): T => {
    const primary = path.join(dir, name);
    // A public-domain bank may live in the repository; a keyed one must come from `dir`.
    const file =
      existsSync(primary) || !PUBLIC_DOMAIN_BANKS.has(name)
        ? primary
        : path.resolve(process.cwd(), REPO_BANKS, name);
    if (!existsSync(file)) {
      throw new Error(`Assessment bank ${name} not found at ${file}. See resolveBanksDir().`);
    }
    const parsed = JSON.parse(readFileSync(file, "utf8")) as T;
    assertNotRetired(dir, name, parsed);
    return parsed;
  };
  const written = read<WrittenBank>("english_written.json");
  const oral = read<OralBank>("english_oral.json");
  const ipip = read<IpipBank>("ipip50.json");
  const sjt = read<SjtBank>("sjt_remote.json");
  const discBank = read<DiscBank>("disc.json");
  const passages = new Map(written.passages.map((p) => [p.id, p]));

  const english_written: BankQuestion[] = [
    ...written.mcq.map((q, i) => ({
      bank_id: q.id,
      section: q.section,
      band: BAND_LEVEL[q.band],
      sort_order: i,
      prompt: q.prompt,
      question_type: "mcq" as const,
      options: {
        choices: q.options,
        band: q.band,
        passage: q.passage_id ? (passages.get(q.passage_id) ?? null) : null,
      },
      answer_key: { correct: q.correct },
      factor: null,
    })),
    ...written.writing_prompts.map((w, i) => ({
      bank_id: w.id,
      section: "writing",
      band: (w.band as BankQuestion["band"]) ?? null,
      sort_order: 1000 + i,
      prompt: w.prompt,
      question_type: "writing" as const,
      options: { min_words: w.min_words, max_words: w.max_words },
      answer_key: null,
      factor: null,
    })),
  ];

  const english_oral: BankQuestion[] = oral.prompts.map((p, i) => ({
    bank_id: p.id,
    section: p.category,
    band: null,
    sort_order: i,
    prompt: p.prompt,
    question_type: "audio" as const,
    options: {
      prep_seconds: p.prep_seconds,
      min_seconds: p.min_seconds,
      max_seconds: p.max_seconds,
    },
    answer_key: null,
    factor: null,
  }));

  const psychometric: BankQuestion[] = [
    ...ipip.items.map((item, i) => ({
      bank_id: item.id,
      section: "likert",
      band: null,
      sort_order: i,
      prompt: item.text_en,
      question_type: "likert" as const,
      options: { text_es: item.text_es, scale: ipip.scale },
      answer_key: { factor: item.factor, reverse: item.reverse },
      factor: item.factor,
    })),
    ...sjt.items.map((item, i) => ({
      bank_id: item.id,
      section: "situational",
      band: null,
      sort_order: 100 + i,
      prompt: item.prompt_en,
      question_type: "situational" as const,
      options: {
        prompt_es: item.prompt_es,
        theme: item.theme,
        choices: item.options.map((o) => ({ id: o.id, text: o.text_en, text_es: o.text_es })),
      },
      answer_key: { best: item.best },
      factor: null,
    })),
  ];

  // DISC-style profile: Likert only, seven items per style, `factor` carries the style letter.
  const disc: BankQuestion[] = discBank.items.map((item, i) => ({
    bank_id: item.id,
    section: "disc",
    band: null,
    sort_order: i,
    prompt: item.text_en,
    question_type: "likert" as const,
    options: { text_es: item.text_es, scale: discBank.scale },
    answer_key: { style: item.style, reverse: item.reverse },
    factor: item.style,
  }));

  return { english_written, english_oral, psychometric, disc };
}

/**
 * Refuses a bank that reuses an item from the banks exposed in the public repository
 * (audit E2). `.banks/retired-hashes.json` holds the fingerprints; without that file the
 * check is skipped, which is the case for the fixtures.
 */
function assertNotRetired(dir: string, name: string, bank: unknown) {
  const file = path.join(dir, "retired-hashes.json");
  if (!existsSync(file)) return;
  const retired = new Set((JSON.parse(readFileSync(file, "utf8")) as RetiredHashes).hashes);
  for (const text of bankTexts(bank)) {
    if (retired.has(hashBankText(text))) {
      throw new Error(
        `Assessment bank ${name} reuses a retired item: "${text.slice(0, 60)}...". ` +
          "Items from the exposed banks must not come back.",
      );
    }
  }
}

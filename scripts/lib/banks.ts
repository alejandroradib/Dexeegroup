/** Reads the JSON question banks and normalizes them into assessment_questions rows. */
import { readFileSync } from "node:fs";
import path from "node:path";

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
  const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T;
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

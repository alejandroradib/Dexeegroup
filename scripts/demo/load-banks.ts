/**
 * Prints SQL that inserts the JSON question banks into public.assessment_questions and
 * activates the four assessments. Idempotent: rows are matched by options->>'bank_id'.
 * Used by scripts/demo/setup-db.sh:  npx tsx scripts/demo/load-banks.ts | psql ...
 */

import { loadBanks, resolveBanksDir, type BankQuestion } from "../lib/banks";

const TYPES = ["english_written", "english_oral", "psychometric", "disc"] as const;

function lit(value: string | null): string {
  if (value === null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

function jsonLit(value: Record<string, unknown> | null): string {
  if (value === null) return "null";
  return `${lit(JSON.stringify(value))}::jsonb`;
}

function insertFor(type: (typeof TYPES)[number], q: BankQuestion): string {
  const options = { ...q.options, bank_id: q.bank_id };
  return [
    "insert into public.assessment_questions",
    "  (assessment_id, section, band, sort_order, prompt, question_type, options, answer_key, weight, factor, is_active)",
    `select a.id, ${lit(q.section)}, ${q.band ? `${lit(q.band)}::public.cefr_level` : "null"}, ${q.sort_order}, ${lit(q.prompt)},`,
    `  ${lit(q.question_type)}, ${jsonLit(options)}, ${jsonLit(q.answer_key)}, 1, ${lit(q.factor)}, true`,
    `from public.assessments a`,
    `where a.type = ${lit(type)}`,
    `  and not exists (select 1 from public.assessment_questions x`,
    `    where x.assessment_id = a.id and x.options ->> 'bank_id' = ${lit(q.bank_id)});`,
  ].join("\n");
}

function main() {
  const banks = loadBanks(resolveBanksDir());
  const out: string[] = ["begin;"];
  let count = 0;
  for (const type of TYPES) {
    for (const q of banks[type]) {
      out.push(insertFor(type, q));
      count += 1;
    }
  }
  out.push(
    "update public.assessments set is_active = true where type in ('english_written', 'english_oral', 'psychometric', 'disc');",
  );
  out.push("commit;");
  out.push(`-- ${count} bank questions`);
  process.stdout.write(out.join("\n") + "\n");
}

main();

import { z } from "zod";

export const JOB_DRAFT_PROMPT_VERSION = "job-draft.v1";

export const jobDraftSchema = z.object({
  description: z.string().min(50).max(2000),
  responsibilities: z.string().min(30).max(2000),
  requirements: z.string().min(30).max(2000),
});

export type JobDraft = z.infer<typeof jobDraftSchema>;

export const jobDraftSystem = `You write job postings for Dexee, a Colombian firm that places bilingual professionals with US companies working remotely.
Tone: professional and direct, sentence case, no exclamation marks, no emojis, no buzzwords (world-class, cutting-edge, synergy, seamless, rockstar).
Write in English. Each list is 4 to 6 lines, one item per line starting with "- ". Description is 2 short paragraphs (no bullets).
Do not invent company names, salaries or benefits. Mention that the role is remote from Colombia on US hours where natural.`;

export function jobDraftUser(input: { title: string; seniority?: string | null; roleFamily?: string | null; keywords: string[] }): string {
  return [
    `Title: ${input.title}`,
    input.seniority ? `Seniority: ${input.seniority}` : null,
    input.roleFamily ? `Role family: ${input.roleFamily}` : null,
    input.keywords.length ? `Keywords: ${input.keywords.join(", ")}` : null,
    `Return JSON with keys "description", "responsibilities", "requirements".`,
  ]
    .filter(Boolean)
    .join("\n");
}

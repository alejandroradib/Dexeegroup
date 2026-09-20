/**
 * Redaction applied to a resume before the model reads it (Phase 10).
 *
 * Two goals. Contact data must not reach the analysis, because the fit report is shown to
 * a company before Dexee releases contact details. And protected characteristics must not
 * reach it, because Colombian resumes routinely carry a photo, a date of birth and a
 * marital status, and CLAUDE.md rule 9 says Dexee never uses them. The model is also told
 * to ignore anything that slips through; this pass makes sure little does.
 *
 * Pure and synchronous so it can be unit-tested against real resume fragments.
 */

export type RedactionCounts = {
  emails: number;
  phones: number;
  urls: number;
  ids: number;
  protectedLines: number;
};

/** Lines mentioning a protected attribute are removed whole; the value is never inspected. */
const PROTECTED_LINE =
  /\b(fecha\s+de\s+nacimiento|date\s+of\s+birth|birth\s*date|born\s+(on|in)|nacid[oa]\s+(el|en)|edad\s*[:.]|\bage\s*[:.]|a[ñn]os\s+de\s+edad|years\s+old|estado\s+civil|marital\s+status|casad[oa]\b|solter[oa]\b|divorciad[oa]\b|viud[oa]\b|married\b|single\b|divorced\b|widowed\b|religi[oó]n|religion|creencias|g[eé]nero\s*[:.]|gender\s*[:.]|sexo\s*[:.]|\bsex\s*[:.]|nacionalidad|nationality|grupo\s+sanguíneo|blood\s+type|libreta\s+militar|military\s+service|hijos\s*[:.]|children\s*[:.]|dependientes|dependents|discapacidad|disability|afiliaci[oó]n\s+pol[ií]tica|political|foto(graf[ií]a)?\s*[:.]|photo\s*[:.]|number\s+of\s+children|situaci[oó]n\s+militar)/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
/** Phone numbers: seven or more digits with optional separators, optional country code. */
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}\b/g;
const URL =
  /\b(?:https?:\/\/|www\.)[^\s)]+|\b(?:linkedin\.com|github\.com|behance\.net|dribbble\.com)\/[^\s)]+/gi;
/** Colombian and common national identifiers when labelled. */
const NATIONAL_ID =
  /\b(?:c\.?\s?c\.?|c[eé]dula(?:\s+de\s+ciudadan[ií]a)?|cedula|t\.?\s?i\.?|pasaporte|passport|dni|nit|ssn|social\s+security)\s*(?:no\.?|n[uú]mero|number|#|:)?\s*[:.]?\s*[\d.\s-]{6,}/gi;

/** Only a phone if it has enough digits; avoids eating years and salary figures. */
function looksLikePhone(match: string): boolean {
  const digits = match.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && !/^(19|20)\d{2}$/.test(digits);
}

export const MAX_RESUME_CHARS = 12_000;

export function redactResumeText(input: string): { text: string; counts: RedactionCounts } {
  const counts: RedactionCounts = { emails: 0, phones: 0, urls: 0, ids: 0, protectedLines: 0 };
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (PROTECTED_LINE.test(line)) {
      counts.protectedLines += 1;
      continue;
    }
    kept.push(line);
  }
  let text = kept.join("\n");
  text = text.replace(EMAIL, () => {
    counts.emails += 1;
    return "[email removed]";
  });
  text = text.replace(URL, () => {
    counts.urls += 1;
    return "[link removed]";
  });
  text = text.replace(NATIONAL_ID, () => {
    counts.ids += 1;
    return "[id removed]";
  });
  text = text.replace(PHONE, (match) => {
    if (!looksLikePhone(match)) return match;
    counts.phones += 1;
    return "[phone removed]";
  });
  text = text.replace(/[ \t]{2,}/g, " ").trim();
  if (text.length > MAX_RESUME_CHARS) text = `${text.slice(0, MAX_RESUME_CHARS)}\n[truncated]`;
  return { text, counts };
}

/** Applied to model output as well: a summary must never carry an address or a number. */
export function stripContactData(text: string): string {
  return text
    .replace(EMAIL, "[removed]")
    .replace(URL, "[removed]")
    .replace(PHONE, (match) => (looksLikePhone(match) ? "[removed]" : match));
}

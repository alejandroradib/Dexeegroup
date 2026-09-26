/** Leading characters that make a spreadsheet evaluate the cell as a formula (audit I15). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * One CSV cell: arrays are joined, nulls are empty, formula triggers are neutralised with a
 * leading apostrophe, and quoting follows RFC 4180.
 */
export function csvCell(value: unknown): string {
  let text =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join("; ")
        : String(value);
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

import { describe, expect, it } from "vitest";

import { csvCell } from "@/lib/csv";

/** Audit I15: a cell that starts with a formula trigger is neutralised before it reaches Excel. */
describe("csv cells", () => {
  it("prefixes formula triggers with an apostrophe", () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvCell("+1 300")).toBe("'+1 300");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tx")).toBe("'\tx");
  });
  it("quotes commas, quotes and newlines and joins arrays", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(["sql", "excel"])).toBe("sql; excel");
    expect(csvCell(null)).toBe("");
    expect(csvCell(7)).toBe("7");
  });
});

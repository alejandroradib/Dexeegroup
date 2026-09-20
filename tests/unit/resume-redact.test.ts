import { describe, expect, it } from "vitest";

import { MAX_RESUME_CHARS, redactResumeText, stripContactData } from "@/lib/resume/redact";

const SAMPLE = `LAURA GÓMEZ
Contadora Pública
Barranquilla, Colombia
Correo: laura.gomez@example.com
Celular: +57 300 111 2233
LinkedIn: https://www.linkedin.com/in/laura-gomez-example
C.C. 1.045.678.901
Fecha de nacimiento: 12 de marzo de 1990
Estado civil: Casada
Edad: 36 años

EXPERIENCIA
Accounting Lead, Caribe Freight Group, 2021 - presente
Lideré el cierre mensual de tres subsidiarias en Estados Unidos y migré el grupo a NetSuite.
Senior Accountant, Atlántico Textiles, 2017 - 2021
Estados consolidados bajo IFRS y US GAAP. Presupuesto anual de USD 4,500,000.

EDUCACIÓN
Universidad del Norte, Contaduría Pública, 2016
`;

describe("resume redaction", () => {
  const { text, counts } = redactResumeText(SAMPLE);

  it("removes email, phone, link and national id", () => {
    expect(text).not.toContain("laura.gomez@example.com");
    expect(text).not.toContain("300 111 2233");
    expect(text).not.toContain("linkedin.com");
    expect(text).not.toContain("1.045.678.901");
    expect(counts.emails).toBe(1);
    expect(counts.phones).toBeGreaterThanOrEqual(1);
    expect(counts.urls).toBe(1);
    expect(counts.ids).toBe(1);
  });

  it("drops whole lines that carry a protected attribute, without reading the value", () => {
    expect(text).not.toMatch(/nacimiento|1990|Casada|Estado civil|Edad/);
    expect(counts.protectedLines).toBe(3);
  });

  it("keeps the work history, years and amounts the analysis needs", () => {
    expect(text).toContain("Accounting Lead, Caribe Freight Group, 2021 - presente");
    expect(text).toContain("US GAAP");
    expect(text).toContain("2017 - 2021");
    expect(text).toContain("USD 4,500,000");
    expect(text).toContain("Universidad del Norte");
  });

  it("handles English resumes the same way", () => {
    const en = redactResumeText(
      "Date of birth: 03/12/1990\nMarital status: single\nPhone: (305) 555-0142\nReligion: none\nLed a team of 6 analysts.",
    );
    expect(en.text).toBe("Phone: [phone removed]\nLed a team of 6 analysts.");
    expect(en.counts.protectedLines).toBe(3);
  });

  it("does not mistake a year or a headcount for a phone number", () => {
    const { text: out } = redactResumeText("Joined in 2019. Managed 12 people. Budget 250000.");
    expect(out).toBe("Joined in 2019. Managed 12 people. Budget 250000.");
  });

  it("caps very long resumes so a document cannot blow up the prompt", () => {
    const long = redactResumeText("word ".repeat(10_000));
    expect(long.text.length).toBeLessThanOrEqual(MAX_RESUME_CHARS + 12);
    expect(long.text.endsWith("[truncated]")).toBe(true);
  });
});

describe("output scrubbing", () => {
  it("removes contact data the model might echo back", () => {
    expect(stripContactData("Reach her at ana@x.co or +57 301 222 3344, see www.site.com")).toBe(
      "Reach her at [removed] or [removed], see [removed]",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  diffMaterialTerms,
  MATERIAL_TERMS,
  snapshotMaterialTerms,
} from "@/lib/jobs/material-terms";

const job = {
  salary_min_usd: 2600,
  salary_max_usd: 3300,
  contract_type: "dexee_eor",
  employment_type: "full_time",
  seniority: "senior",
  english_level_required: "B2",
  work_mode: "remote",
  hours_per_week: 40,
  title: "ignored",
};

/** Audit D4: applicants are told when the conditions of a job change while it is edited. */
describe("material terms of a job", () => {
  it("snapshots exactly the eight material fields", () => {
    const snap = snapshotMaterialTerms(job);
    expect(Object.keys(snap).sort()).toEqual([...MATERIAL_TERMS].sort());
    expect(snap).not.toHaveProperty("title");
  });
  it("reports only the fields that changed", () => {
    const before = snapshotMaterialTerms(job);
    const after = snapshotMaterialTerms({ ...job, salary_max_usd: 3000, hours_per_week: 30 });
    expect(diffMaterialTerms(before, after)).toEqual([
      { field: "salary_max_usd", before: 3300, after: 3000 },
      { field: "hours_per_week", before: 40, after: 30 },
    ]);
    expect(diffMaterialTerms(before, before)).toEqual([]);
  });
  it("treats null and undefined as the same absence", () => {
    const before = snapshotMaterialTerms({ ...job, hours_per_week: null });
    const after = snapshotMaterialTerms({ ...job, hours_per_week: undefined });
    expect(diffMaterialTerms(before, after)).toEqual([]);
  });
});

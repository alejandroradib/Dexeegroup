import { describe, expect, it } from "vitest";

import { readSeedPassword } from "../../scripts/lib/seed-password";

describe("seed password", () => {
  it("is optional, trimmed, and at least 12 characters", () => {
    expect(readSeedPassword({} as NodeJS.ProcessEnv)).toBeUndefined();
    expect(
      readSeedPassword({ SEED_PASSWORD: "  " } as unknown as NodeJS.ProcessEnv),
    ).toBeUndefined();
    expect(() =>
      readSeedPassword({ SEED_PASSWORD: "short" } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/12 characters/);
    expect(
      readSeedPassword({ SEED_PASSWORD: " a-local-seed-value " } as unknown as NodeJS.ProcessEnv),
    ).toBe("a-local-seed-value");
  });
});

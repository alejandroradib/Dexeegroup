import { expect, test, type Page } from "@playwright/test";

/**
 * PHASES-GTM 9.7: every event fires once per action and carries no personal data.
 *
 * Analytics is behind NEXT_PUBLIC_ANALYTICS_PROVIDER, so no provider script loads in
 * these runs. We install a stub named `plausible` before the page scripts execute, which
 * is exactly what `track()` looks for, and record what it receives.
 */
type Captured = { event: string; props: Record<string, unknown> };

async function captureEvents(page: Page): Promise<Captured[]> {
  const captured: Captured[] = [];
  await page.exposeFunction("__capture", (event: string, props: Record<string, unknown>) => {
    captured.push({ event, props: props ?? {} });
  });
  await page.addInitScript(() => {
    (window as unknown as { plausible: unknown }).plausible = (
      event: string,
      options?: { props?: Record<string, unknown> },
    ) => {
      (window as unknown as { __capture: (e: string, p?: unknown) => void }).__capture(
        event,
        options?.props,
      );
    };
  });
  return captured;
}

/** Nothing in an event may identify a person. */
function expectNoPersonalData(captured: Captured[]) {
  for (const item of captured) {
    for (const [key, value] of Object.entries(item.props)) {
      expect(String(value), `${item.event}.${key} looks like an email`).not.toContain("@");
      expect(
        ["email", "name", "company", "phone", "candidate_id", "user_id", "id"],
        `${item.event} carries ${key}`,
      ).not.toContain(key);
      if (typeof value === "string") expect(value.length).toBeLessThanOrEqual(40);
    }
  }
}

test.describe("analytics events", () => {
  test("view_pricing fires once on the pricing page", async ({ page }) => {
    const captured = await captureEvents(page);
    await page.goto("/en/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);
    expect(captured.filter((c) => c.event === "view_pricing")).toHaveLength(1);
    expectNoPersonalData(captured);
  });

  test("view_sample_report fires once on the sample report", async ({ page }) => {
    const captured = await captureEvents(page);
    await page.goto("/en/sample-report");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);
    expect(captured.filter((c) => c.event === "view_sample_report")).toHaveLength(1);
  });

  test("use_calculator fires once however many figures change", async ({ page }) => {
    const captured = await captureEvents(page);
    await page.goto("/en/pricing");
    const salary = page.getByLabel("US salary, monthly");
    await salary.fill("9000");
    await salary.fill("9500");
    await page.getByLabel("Colombia salary, monthly").fill("3500");
    await page.getByRole("button", { name: "Dexee employs" }).click();
    await page.waitForTimeout(300);
    expect(captured.filter((c) => c.event === "use_calculator")).toHaveLength(1);
    expectNoPersonalData(captured);
  });

  test("start_lead_form fires once however many fields are touched", async ({ page }) => {
    const captured = await captureEvents(page);
    await page.goto("/en/pricing");
    await page.getByLabel("Your name").fill("Dana");
    await page.getByLabel("Work email").fill("dana@example.com");
    await page.getByLabel("Role to fill").fill("Support lead");
    await page.waitForTimeout(300);
    expect(captured.filter((c) => c.event === "start_lead_form")).toHaveLength(1);
    // The name and the email were typed into the form; neither may reach an event.
    expectNoPersonalData(captured);
  });

  test("submit_lead fires once, with the category fields only", async ({ page }) => {
    test.skip(!process.env.E2E_SEEDED, "requires a database that accepts the insert");
    const captured = await captureEvents(page);
    await page.goto("/en/pricing");
    await page.getByLabel("Your name").fill("Dana Whitfield");
    await page.getByLabel("Work email").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Company", { exact: true }).fill("Northstar Logistics");
    await page.getByLabel("Role to fill").fill("Customer support lead");
    await page.getByLabel("Seniority").selectOption("senior");
    await page.getByLabel("Monthly budget per person").selectOption("2k_4k");
    await page.getByRole("button", { name: "Send the brief" }).click();
    await expect(page.getByText("Your brief reached Dexee")).toBeVisible();
    const submits = captured.filter((c) => c.event === "submit_lead");
    expect(submits).toHaveLength(1);
    expect(submits[0]?.props).toEqual({ seniority: "senior", budget: "2k_4k" });
    expectNoPersonalData(captured);
  });

  test("view_job fires once per job page and carries only the role family", async ({ page }) => {
    test.skip(!process.env.E2E_SEEDED, "requires seeded jobs");
    const captured = await captureEvents(page);
    await page.goto("/en/jobs");
    const firstJob = page.locator('a[href*="/en/jobs/"]').first();
    await expect(firstJob).toBeVisible();
    await firstJob.click();
    await expect(page).toHaveURL(/\/en\/jobs\/.+/);
    await page.waitForTimeout(500);
    const views = captured.filter((c) => c.event === "view_job");
    expect(views).toHaveLength(1);
    expect(Object.keys(views[0]?.props ?? {})).toEqual(["role_family"]);
    expectNoPersonalData(captured);
  });

  test("no event fires on a page that measures nothing", async ({ page }) => {
    const captured = await captureEvents(page);
    await page.goto("/en/about");
    await page.waitForTimeout(500);
    expect(captured).toHaveLength(0);
  });
});

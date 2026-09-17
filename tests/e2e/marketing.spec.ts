import { expect, test } from "@playwright/test";

test.describe("marketing site", () => {
  test("serves both locales with the language switch", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vetted Colombian talent");
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Talento colombiano");
  });

  test("jobs board renders filters and the job page carries JobPosting JSON-LD", async ({
    page,
  }) => {
    await page.goto("/en/jobs");
    await expect(page.getByLabel("Keyword")).toBeVisible();
    const firstJob = page.locator("article h3 a").first();
    if (await firstJob.count()) {
      await firstJob.click();
      const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(jsonLd).toBeTruthy();
      const parsed = JSON.parse(jsonLd ?? "{}") as { "@type": string; jobLocationType: string };
      expect(parsed["@type"]).toBe("JobPosting");
      expect(parsed.jobLocationType).toBe("TELECOMMUTE");
    }
  });

  test("contact form validates required fields", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("app routes redirect anonymous users to sign-in with next preserved", async ({ page }) => {
    await page.goto("/en/company/jobs");
    await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fen%2Fcompany%2Fjobs/);
  });
});

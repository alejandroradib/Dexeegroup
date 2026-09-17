import { expect, test } from "@playwright/test";

test.describe("authentication", () => {
  test("candidate sign-up requires the Law 1581 consent", async ({ page }) => {
    await page.goto("/es/sign-up/candidate");
    await page.getByLabel("Nombre").fill("Prueba");
    await page.getByLabel("Apellido").fill("Candidata");
    await page.getByLabel("Correo").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Contraseña", { exact: true }).fill("Password123!");
    await page.getByRole("button", { name: "Crear mi perfil" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "autorización" })).toBeVisible();
  });

  test("sign-in with seeded admin lands on the admin dashboard", async ({ page }) => {
    test.skip(!process.env.E2E_SEEDED, "requires a seeded Supabase project");
    await page.goto("/en/sign-in");
    await page.getByLabel("Email").fill("admin@dexeegroup.com");
    await page.getByLabel("Password").fill("DexeeSeed2026!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
  });

  test("company pipeline drawer never leaks contact data before release", async ({ page }) => {
    test.skip(!process.env.E2E_SEEDED, "requires a seeded Supabase project");
    await page.goto("/en/sign-in");
    await page.getByLabel("Email").fill("owner@brightline.example.com");
    await page.getByLabel("Password").fill("DexeeSeed2026!");
    await page.getByRole("button", { name: "Sign in" }).click();
    const payloads: string[] = [];
    page.on("response", async (response) => {
      if (response.request().method() === "POST" && response.url().includes("/company/"))
        payloads.push(await response.text().catch(() => ""));
    });
    await page.goto("/en/company/jobs/e0000000-0000-4000-8000-000000000003/pipeline");
    await page.getByRole("button", { name: "Open details" }).first().click();
    await expect(page.getByText("Contact details available through Dexee")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("andres.pineda@example.com");
    expect(html).not.toContain("+57 301 222 3344");
    for (const body of payloads) expect(body).not.toContain("andres.pineda@example.com");
  });
});

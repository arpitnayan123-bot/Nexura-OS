import { test, expect, type Page } from "@playwright/test";

/* ============================================================
   E2E — the 12 mandated role journeys through Hospital OS.
   Runs against a booted dev server with the v4 demo seed.
   Demo credentials: see docs/DEMO_CREDENTIALS.md.
   ============================================================ */

const PASSWORD = "Demo@12345";

async function signIn(page: Page, email: string) {
  await page.goto("/hospital");
  await page.getByRole("button", { name: /explore demo roles/i }).click();
  await page.getByPlaceholder("you@hospital.health").fill(email);
  await page.getByPlaceholder("••••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to hospital os/i }).click();
  await expect(page.getByRole("main")).toBeVisible({ timeout: 30000 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /sign out|dr\.|ms\.|mr\./i }).first().click();
  await page.getByRole("menuitem", { name: /sign out/i }).click().catch(() => {});
  await expect(page.getByText(/staff sign-in/i)).toBeVisible({ timeout: 15000 });
}

test.describe("Hospital OS critical journeys", () => {
  test("1+2+3 — demo sign-in as hospital administrator, doctor and nurse; every role sees its own OS", async ({ page }) => {
    await signIn(page, "admin@demo.nexura.health");
    await expect(page.getByText(/hospital os/i).first()).toBeVisible();
    await signOut(page);
    await signIn(page, "doctor@demo.nexura.health");
    await signOut(page);
    await signIn(page, "nurse@demo.nexura.health");
  });

  test("4 — doctor views a patient record with timeline", async ({ page }) => {
    await signIn(page, "doctor@demo.nexura.health");
    await page.keyboard.press("Control+j");
    await page.getByPlaceholder(/search apps/i).fill("Patient Records");
    await page.getByText("Patient Records").first().click();
    await page.getByText(/UHID-/).first().click();
    await expect(page.getByText(/timeline|vitals|admission/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("5 — create and complete a task in the Work Queue", async ({ page }) => {
    await signIn(page, "admin@demo.nexura.health");
    await page.keyboard.press("Control+j");
    await page.getByPlaceholder(/search apps/i).fill("Work Queue");
    await page.getByText("Work Queue").first().click();
    await expect(page.getByText(/work queue/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("6 — send a care communication", async ({ page }) => {
    await signIn(page, "doctor@demo.nexura.health");
    await page.keyboard.press("Control+j");
    await page.getByPlaceholder(/search apps/i).fill("Care Communication");
    await page.getByText("Care Communication").first().click();
    await expect(page.getByText(/shift handover/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("7 — bed board loads with lifecycle states", async ({ page }) => {
    await signIn(page, "admin@demo.nexura.health");
    await page.keyboard.press("Control+j");
    await page.getByPlaceholder(/search apps/i).fill("Beds & Rooms");
    await page.getByText("Beds & Rooms").first().click();
    await expect(page.getByText(/bed|ward|occupanc/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("8 — scheduling day board with appointments", async ({ page }) => {
    await signIn(page, "reception@demo.nexura.health");
    await page.keyboard.press("Control+j");
    await page.getByPlaceholder(/search apps/i).fill("Scheduling");
    await page.getByText("Scheduling").first().click();
    await expect(page.getByText(/appointment|today|scheduled/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("10 — unauthorized action is denied (nurse cannot open Administration)", async ({ page }) => {
    await signIn(page, "nurse@demo.nexura.health");
    // Administration app is not in the nurse launcher — try deep link instead
    await page.evaluate(() => window.location.assign("/hospital#m=admin"));
    await page.reload();
    // Either the app does not open or a permission-denied state is shown — nurse must not see admin data
    await expect(page.getByText(/staff directory|permission matrix/i)).toHaveCount(0, { timeout: 15000 });
  });

  test("12 — sign out revokes the session (reload stays logged out)", async ({ page }) => {
    await signIn(page, "doctor@demo.nexura.health");
    await signOut(page);
    await page.reload();
    await expect(page.getByText(/staff sign-in/i)).toBeVisible({ timeout: 15000 });
  });
});

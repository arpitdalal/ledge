import { expect, test } from "@playwright/test";

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(Math.min(now.getDate(), 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("create, preview, pause, skip, and see upcoming cash flow on dashboard", async ({ page }) => {
  const start = todayInputValue();
  const payee = `Test Gym ${Date.now()}`;

  await page.goto("/recurring");
  await expect(page.getByRole("heading", { name: "Recurring" })).toBeVisible();
  await page.getByRole("link", { name: "New recurring rule" }).first().click();

  await expect(page.getByRole("heading", { name: "New recurring rule" })).toBeVisible();
  await page.getByLabel("Type").selectOption("EXPENSE");
  await page.getByLabel("Amount").fill("35");
  await page.getByLabel("Payee / rule name").fill(payee);
  await page.getByLabel("Category").selectOption({ label: "Subscriptions" });
  await page.getByLabel("Frequency").selectOption("WEEKLY");
  await page.getByLabel("Start date").fill(start);

  await expect(page.getByText("Upcoming preview")).toBeVisible();
  const previewItems = page.locator("ul li").filter({ hasText: "$35.00" });
  await expect(previewItems).toHaveCount(5);

  await page.getByRole("button", { name: "Create rule" }).click();
  await expect(page).toHaveURL(/\/recurring$/);
  await expect(page.getByText(payee).first()).toBeVisible();

  await page.goto("/dashboard");
  const upcomingSection = page.getByTestId("upcoming-cash-flow");
  await expect(upcomingSection).toBeVisible();
  await expect(upcomingSection.getByText(payee).first()).toBeVisible();
  await expect(upcomingSection.getByText("Upcoming net")).toBeVisible();

  await page.goto("/transactions");
  await expect(page.getByText("Upcoming recurring").first()).toBeVisible();
  await expect(page.getByText(payee).first()).toBeVisible();

  const firstSkipButton = page.getByRole("button", { name: new RegExp(`Skip ${payee}`) }).first();
  await firstSkipButton.click();

  await page.goto("/recurring");
  await page.getByRole("button", { name: `Pause ${payee}` }).click();
  await expect(page.getByText("Paused").first()).toBeVisible();

  await page.getByRole("button", { name: `Resume ${payee}` }).click();
  await page.getByRole("button", { name: `Delete ${payee}` }).click();
  await expect(page.getByText(payee)).not.toBeVisible();
});

test("recurring form validates end date before start date", async ({ page }) => {
  await page.goto("/recurring/new");

  await page.getByLabel("Payee / rule name").fill("Broken rule");
  await page.getByLabel("Amount").fill("10");
  await page.getByLabel("Category").selectOption({ label: "Subscriptions" });
  await page.getByLabel("Start date").fill("2026-05-01");
  await page.getByLabel("End date").fill("2026-04-01");

  await expect(page.getByRole("button", { name: "Create rule" })).toBeDisabled();
});

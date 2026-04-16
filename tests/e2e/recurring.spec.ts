import { expect, test } from "@playwright/test";

test("can create, preview, and manage a recurring expense", async ({ page }) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(Math.min(now.getDate(), 28)).padStart(2, "0");
  const startDate = `${now.getFullYear()}-${month}-${day}`;
  const payee = `Gym ${Date.now()}`;

  await page.goto("/recurring/new");
  await expect(page.getByRole("heading", { name: "New recurring rule" })).toBeVisible();

  await page.getByLabel("Type").selectOption("EXPENSE");
  await page.getByLabel("Amount").fill("49.99");
  await page.getByLabel("Name / payee").fill(payee);
  await page.getByLabel("Category").selectOption({ label: "Subscriptions" });
  await page.getByLabel("Frequency").selectOption("MONTHLY");
  await page.getByLabel("Start date").fill(startDate);

  const preview = page.getByLabel("Preview of upcoming occurrences");
  await expect(preview).toBeVisible();
  await expect(preview.locator("li")).toHaveCount(5);
  await expect(preview.getByText("-$49.99").first()).toBeVisible();

  await page.getByRole("button", { name: "Create recurring rule" }).click();

  await expect(page).toHaveURL(/\/recurring$/);
  await expect(page.getByText(payee, { exact: false }).first()).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Upcoming cash flow" })).toBeVisible();
  await expect(page.getByText("Upcoming expenses")).toBeVisible();
  await expect(page.getByText(payee).first()).toBeVisible();

  await page.goto("/transactions");
  await expect(page.getByText("Upcoming from recurring")).toBeVisible();
  await expect(page.getByText(payee).first()).toBeVisible();

  await page.goto("/recurring");
  const card = page.locator("section").filter({ hasText: payee }).first();
  await card.getByRole("button", { name: `Pause ${payee}` }).click();
  await expect(card.getByText("Paused", { exact: true }).first()).toBeVisible();

  await page.goto("/dashboard");
  const upcomingSection = page.getByLabel("Upcoming cash flow");
  await expect(upcomingSection.getByText(payee)).toHaveCount(0);
});

test("can skip a single upcoming occurrence without deleting the rule", async ({ page }) => {
  await page.goto("/recurring");
  await expect(page.getByRole("heading", { name: "Recurring" })).toBeVisible();

  const upcomingTable = page.locator("section").filter({ hasText: "Upcoming 30-day view" }).locator("table");
  const firstRow = upcomingTable.locator("tbody tr").first();
  const rowsBefore = await upcomingTable.locator("tbody tr").count();
  expect(rowsBefore).toBeGreaterThan(0);

  const firstPayeeText = (await firstRow.locator("td").first().innerText()).trim().split("\n")[0];
  const skipButton = firstRow.getByRole("button", { name: /^Skip / });
  await skipButton.click();

  const rowsAfter = upcomingTable.locator("tbody tr");
  await expect(async () => {
    const count = await rowsAfter.count();
    expect(count).toBeLessThan(rowsBefore);
  }).toPass();

  const firstRowAfter = await upcomingTable.locator("tbody tr").first().locator("td").first().innerText();
  expect(firstRowAfter).not.toContain(firstPayeeText);

  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
});

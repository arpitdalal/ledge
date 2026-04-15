import { expect, test } from "@playwright/test";

test("can load app and dashboard renders key data", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Income vs expense")).toBeVisible();
  await expect(page.getByText("Recent transactions")).toBeVisible();
});

test("can create, edit, and filter a transaction", async ({ page }) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(Math.min(now.getDate(), 28)).padStart(2, "0");
  const date = `${now.getFullYear()}-${month}-${day}`;

  await page.goto("/transactions/new");

  await page.getByLabel("Type").selectOption("EXPENSE");
  await page.getByLabel("Amount").fill("12.34");
  await page.getByLabel("Date").fill(date);
  await page.getByLabel("Category").selectOption({ label: "Dining" });
  await page.getByLabel("Payee / merchant").fill("Demo Cafe");
  await page.getByLabel("Payment method").selectOption("Credit card");
  await page.getByLabel("Note").fill("Workshop coffee");
  await page.getByRole("button", { name: "Add transaction" }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByText("Demo Cafe")).toBeVisible();

  await page.getByLabel("Edit Demo Cafe").click();
  await page.getByLabel("Amount").fill("15.50");
  await page.getByLabel("Payee / merchant").fill("Demo Cafe Updated");
  await page.getByRole("button", { name: "Save transaction" }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByText("Demo Cafe Updated")).toBeVisible();
  await expect(page.getByText("$15.50")).toBeVisible();

  await page.getByPlaceholder("Search payee, note, category").fill("Updated");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("Demo Cafe Updated")).toBeVisible();
  await expect(page.getByText("Farm Boy")).not.toBeVisible();

  await page.getByLabel("Delete Demo Cafe Updated").click();
  await expect(page.getByText("Demo Cafe Updated")).not.toBeVisible();
});

test("can create and delete a custom category", async ({ page }) => {
  const categoryName = `Coffee ${Date.now()}`;

  await page.goto("/categories");
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();

  await page.getByLabel("Name").fill(categoryName);
  await page.getByLabel("Type").selectOption("EXPENSE");
  await page.getByLabel("Color").selectOption("amber");
  await page.getByLabel("Icon").selectOption("utensils");
  await page.getByRole("button", { name: "Create category" }).click();

  await expect(page.getByText(categoryName)).toBeVisible();
  await expect(page.getByText("0 transactions")).toBeVisible();

  await page.getByLabel(`Delete ${categoryName}`).click();
  await expect(page.getByText(categoryName)).not.toBeVisible();
});

test("reports can switch periods and show empty states", async ({ page }) => {
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Category breakdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Largest expenses" })).toBeVisible();

  await page.getByLabel("Report year").fill("2099");
  await page.getByRole("button", { name: "View" }).click();

  await expect(page.getByText("No report data")).toBeVisible();
});

test("can update workspace settings", async ({ page }) => {
  const workspaceName = `Household ${Date.now()}`;

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByLabel("Preferred currency").selectOption("CAD");
  await page.getByLabel("Locale / date format").fill("en-CA");
  await page.getByRole("button", { name: "Save settings" }).click();

  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Workspace name")).toHaveValue(workspaceName);
});

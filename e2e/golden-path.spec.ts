import { expect, test } from "@playwright/test";

test("transfer to investigation to pause to replay and audit", async ({ page }) => {
  await page.goto("/transfer");
  await page.getByRole("button", { name: "Review transfer" }).click();
  await page.getByRole("button", { name: /Send \$4,800/ }).click();
  await expect(page).toHaveURL(/investigation\/demo-case/);
  await page.getByRole("button", { name: "Yes" }).nth(0).click();
  await page.getByRole("button", { name: "Yes" }).nth(1).click();
  await page.getByRole("button", { name: "Yes" }).nth(2).click();
  await expect(page.getByText("Skeptic Agent", { exact: true })).toBeVisible();
  await expect(page.getByText(/Critical risk • 100\/100/)).toBeVisible();
  await page.getByRole("link", { name: "Open intervention" }).click();
  await expect(page.getByText("We paused this transfer to protect you.")).toBeVisible();
  await page.getByRole("link", { name: "Test another explanation" }).click();
  await expect(page.getByText("Legitimate scenario")).toBeVisible();
  await page.getByRole("link", { name: "Open audit trail" }).click();
  await expect(page.getByText("Investigation audit trail")).toBeVisible();
});

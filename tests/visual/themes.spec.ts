import { test, expect } from "@playwright/test";

test("theme visual baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("theme.png", { fullPage: true });
});

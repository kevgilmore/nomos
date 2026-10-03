import { test, expect } from "@playwright/test";

test("responsive visual baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("responsive.png", { fullPage: true });
});

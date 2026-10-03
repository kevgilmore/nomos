import { test, expect } from "@playwright/test";

test("app shell visual baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("app-shell.png", { fullPage: true, maxDiffPixelRatio: 0.05 });
});

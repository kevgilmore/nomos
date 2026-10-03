import { test, expect } from "@playwright/test";
test("home app renders without a runtime error", async ({ page }) => { await page.goto("/"); await expect(page.locator("body")).toBeVisible(); await expect(page.locator("body")).not.toContainText("Application error"); });

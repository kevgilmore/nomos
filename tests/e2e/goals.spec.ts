import { test, expect } from "@playwright/test";
test("goals root opens the first navigation page", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_goals_session", value: "local-development", url: "http://127.0.0.1:3006" }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/today\/$/);
  await expect(page.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
});
test("goals app renders without a runtime error", async ({ page }) => { await page.goto("/today/"); await expect(page.locator("body")).toBeVisible(); await expect(page.locator("body")).not.toContainText("Application error"); });
test("goals week uses the shared frame without a duplicate page title", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_goals_session", value: "local-development", url: "http://127.0.0.1:3006" }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/week/");
  await expect(page).toHaveTitle("Goals");
  await expect(page.locator("body")).toContainText("Top 3 priorities");
  await expect(page.getByRole("heading", { name: "Week", level: 2 })).toHaveCount(0);
  const main = await page.locator("main#main-content").boundingBox();
  const frame = await page.locator("main#main-content > div").first().boundingBox();
  expect(main).not.toBeNull();
  expect(frame).not.toBeNull();
  expect((frame?.width ?? 0) / (main?.width ?? 1)).toBeGreaterThan(0.9);
});

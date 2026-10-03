import { test, expect } from "@playwright/test";

test("navigation links have usable destinations", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("a[href]");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    await expect(links.nth(index)).toHaveAttribute("href", /.+/);
  }
});

import { test, expect } from "@playwright/test";
const hustleUrl = "http://127.0.0.1:3009";

test("hustle app renders without a runtime error", async ({ page }) => {
  await page.goto(`${hustleUrl}/`);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("hustle root opens the first navigation page", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  await page.goto(`${hustleUrl}/`);
  await expect(page).toHaveURL(/\/pulse\/$/);
  await expect(page.getByRole("link", { name: "Pulse" })).toHaveAttribute("aria-current", "page");
});

test("hustle navigation contains only Pulse and Simplysent", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  await page.goto(`${hustleUrl}/pulse/`);
  await expect(page).toHaveTitle("Hustle");
  await expect(page.getByRole("link", { name: "Pulse" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Simplysent" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("pulse-dashboard")).toBeVisible();
  await expect(page.getByTestId("project-summary")).toContainText("CTR");
  await expect(page.getByTestId("project-summary")).toContainText("8.4%");
  await expect(page.getByRole("tab", { name: "Ads" })).toBeVisible();
  await expect(page.getByText("Ads · CTR", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Date range: Last 12 months" }).click();
  await expect(page.getByRole("menuitem", { name: "Last 30 days" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Last 30 days" }).click();
  await expect(page.getByRole("button", { name: "Date range: Last 30 days" })).toBeVisible();
  await page.getByRole("tab", { name: "Funnel" }).click();
  await expect(page.getByRole("heading", { name: "Conversion funnel" })).toBeVisible();
  await page.getByRole("tab", { name: "Engagement" }).click();
  await expect(page.getByText("Cost per engaged visitor", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Collapse Simplysent project" }).click();
  await expect(page.getByRole("button", { name: "Expand Simplysent project" })).toBeVisible();
  await expect(page.getByTestId("project-summary")).toContainText("CTR");
  await expect(page.getByTestId("project-summary")).toContainText("4,820");
  await expect(page.getByTestId("project-summary")).toContainText("68.2%");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.getByRole("button", { name: "Expand Simplysent project" }).click();
  await expect(page.getByRole("tab", { name: "Ads" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ventures" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ideas" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Experimenter Workflow" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pulse", level: 1 })).toHaveCount(0);

  await page.getByRole("link", { name: "Simplysent" }).click();
  await expect(page).toHaveURL(/\/simplysent\/$/);
  await expect(page).toHaveTitle("Hustle");
  await expect(page.getByRole("heading", { name: "Simplysent", level: 1 })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Funnel" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Simplysent analytics" })).toBeVisible();
  await page.getByRole("button", { name: "Ad segment: All" }).click();
  await page.getByRole("menuitem", { name: "Returning visitors" }).click();
  await expect(page.getByRole("button", { name: "Ad segment: Returning visitors" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Funnel", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Onboarding" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Onboarding steps");
});

test("simplysent keeps one shared content frame at phone, tablet, and desktop widths", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 1366 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${hustleUrl}/simplysent/`);
    await expect(page.getByRole("tab", { name: "Funnel" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.getByRole("heading", { name: "Simplysent", level: 1 })).toHaveCount(0);
  }
});

test("pulse keeps the project dashboard usable across responsive widths", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${hustleUrl}/pulse/`);
    await expect(page.getByTestId("pulse-dashboard")).toBeVisible();
    await expect(page.getByTestId("project-summary")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Ads" })).toBeVisible();
    await expect(page.getByText("Ads · CTR", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${hustleUrl}/pulse/`);
  const projectBox = await page.getByTestId("simplysent-project").boundingBox();
  expect(projectBox).not.toBeNull();
  expect(projectBox?.height ?? 0).toBeGreaterThan(0);
  await expect(page.getByTestId("project-body")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ad campaigns" })).toBeVisible();
});

test("simplysent uses the available shell width", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${hustleUrl}/simplysent/`);
  const frame = page.locator("main#main-content > div").first();
  const mainBox = await page.locator("main#main-content").boundingBox();
  const frameBox = await frame.boundingBox();
  expect(mainBox).not.toBeNull();
  expect(frameBox).not.toBeNull();
  expect((frameBox?.width ?? 0) / (mainBox?.width ?? 1)).toBeGreaterThan(0.9);
});

test("simplysent keeps equal desktop outer gutters", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${hustleUrl}/simplysent/`);
  const gaps = await page.locator("main#main-content > div").first().evaluate((node) => {
    const frame = node.getBoundingClientRect();
    const main = node.parentElement!.getBoundingClientRect();
    return { left: frame.left - main.left, right: main.right - frame.right };
  });
  expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(1);
});

test("simplysent keeps stable shell-relative gaps when desktop expands", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  const measurements = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1200 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${hustleUrl}/simplysent/`);
    measurements.push(await page.locator("[data-nomos-content-frame]").evaluate((frame) => {
      const main = frame.parentElement!.getBoundingClientRect();
      const content = frame.querySelector("[aria-labelledby='conversion-funnel-title']")!.getBoundingClientRect();
      return { left: content.left - main.left, top: content.top - main.top };
    }));
  }
  expect(Math.abs(measurements[0].left - measurements[1].left)).toBeLessThanOrEqual(1);
  expect(Math.abs(measurements[0].top - measurements[1].top)).toBeLessThanOrEqual(1);
});

test("simplysent keeps the content clear of the desktop agent", async ({ page }) => {
  await page.context().addCookies([{ name: "nomos_hustle_session", value: "local-development", url: hustleUrl }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${hustleUrl}/simplysent/`);
  const measurements = await page.locator("[data-nomos-content-frame]").evaluate((frame) => {
    const main = frame.parentElement!.getBoundingClientRect();
    const content = frame.querySelector("[aria-labelledby='conversion-funnel-title']")!.getBoundingClientRect();
    const agent = document.querySelector("[aria-label='Open AI agent']")!.getBoundingClientRect();
    return { left: content.left - main.left, right: main.right - content.right, agentGap: agent.left - content.right };
  });
  expect(measurements.right - measurements.left).toBeGreaterThanOrEqual(15);
  expect(measurements.right - measurements.left).toBeLessThanOrEqual(17);
  expect(measurements.agentGap).toBeGreaterThanOrEqual(16);
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("pricing toggle switches between yearly and 6-month INR prices", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });

  await expect(page.getByRole("button", { name: /Yearly/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("₹8,999").first()).toBeVisible();
  await expect(page.getByText("₹17,999").first()).toBeVisible();

  await page.getByRole("button", { name: "6 months" }).click();
  await expect(page.getByRole("button", { name: "6 months" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("₹4,999").first()).toBeVisible();
  await expect(page.getByText("₹9,999").first()).toBeVisible();
});

test("/pricing has no serious accessibility violations", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
});

import { expect, test } from "@playwright/test";

test("Three.js activates only on the homepage and switches Earth to Moon", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.goto("./");
  const scene = page.locator("[data-celestial-scene]");
  await expect(scene).toHaveAttribute("data-celestial-status", "active");
  await expect(scene).toHaveAttribute("data-celestial-mode", "earth");
  await expect(page.locator("canvas[data-celestial-canvas]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "__AURORA_THREE_LOADED__"))).toBe(true);

  await page.getByRole("button", { name: "切换为浅色主题" }).click();
  await expect(scene).toHaveAttribute("data-celestial-mode", "moon");

  await page.goto("categories/");
  await expect(page.locator("[data-celestial-scene]")).toHaveCount(0);
});

test("reduced motion keeps the static celestial fallback", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("./");

  await expect(page.locator("[data-celestial-scene]")).toHaveAttribute(
    "data-celestial-status",
    "fallback",
  );
  await expect(page.locator("[data-celestial-fallback]")).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "__AURORA_THREE_LOADED__"))).toBeUndefined();
});

test("a WebGL failure falls back without hiding the hero", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("./");

  await expect(page.locator("[data-celestial-scene]")).toHaveAttribute(
    "data-celestial-status",
    "fallback",
  );
  await expect(page.locator("[data-celestial-fallback]")).toBeVisible();
  await expect(page.getByRole("heading", { name: /向未知前行/ })).toBeVisible();
});

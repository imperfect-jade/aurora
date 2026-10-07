import { expect, test, type Page } from "@playwright/test";

async function renderedGlass(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderTopColor,
      backdropFilter: style.backdropFilter,
      boxShadow: style.boxShadow,
    };
  });
}

async function renderedBackgroundImage(page: Page) {
  try {
    return await page.locator(".sky").evaluate((element) => getComputedStyle(element).backgroundImage);
  } catch {
    return "";
  }
}

test("dark theme exposes the galaxy through one consistent glass material", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aurora-theme", "dark"));
  await page.goto("./");

  await expect.poll(() => renderedBackgroundImage(page)).toContain("aurora-galaxy-dark.webp");

  for (const selector of [".site-header", ".hero-search", ".section-panel"]) {
    const style = await renderedGlass(page, selector);
    expect(style.backgroundColor).toBe("rgba(255, 255, 255, 0.14)");
    expect(style.borderColor).toBe("rgba(255, 255, 255, 0.17)");
    expect(style.backdropFilter).toBe("blur(20px)");
    expect(style.boxShadow).toContain("rgba(0, 0, 0, 0.5) 0px 2px 20px");
  }

  const nestedCard = await renderedGlass(page, ".category-card");
  expect(nestedCard.backgroundColor).toBe("rgba(255, 255, 255, 0.06)");
  expect(nestedCard.borderColor).toBe("rgba(255, 255, 255, 0.17)");
  expect(nestedCard.backdropFilter).toBe("blur(20px)");

  await page.locator(".category-card").first().hover();
  await expect
    .poll(async () => (await renderedGlass(page, ".category-card")).backgroundColor)
    .toBe("rgba(255, 255, 255, 0.1)");

  await page.goto("notes/e2e-chapter/");
  const readerNavigation = await renderedGlass(page, "[data-reader-chapters]");
  expect(readerNavigation.backgroundColor).toBe("rgba(255, 255, 255, 0.14)");
});

test("light theme uses a separate airy cosmos and a light glass palette", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aurora-theme", "light"));
  await page.goto("./");

  await expect.poll(() => renderedBackgroundImage(page)).toContain("aurora-cosmos-light.webp");
  expect(await renderedBackgroundImage(page)).not.toContain("aurora-galaxy-dark.webp");

  for (const selector of [".site-header", ".hero-search", ".section-panel"]) {
    const style = await renderedGlass(page, selector);
    expect(style.backgroundColor).toBe("rgba(255, 255, 255, 0.32)");
    expect(style.borderColor).toBe("rgba(255, 255, 255, 0.62)");
    expect(style.backdropFilter).toBe("blur(20px)");
  }

  const nestedCard = await renderedGlass(page, ".category-card");
  expect(nestedCard.backgroundColor).toBe("rgba(255, 255, 255, 0.16)");
  expect(nestedCard.borderColor).toBe("rgba(255, 255, 255, 0.62)");

  await page.locator(".category-card").first().hover();
  await expect
    .poll(async () => (await renderedGlass(page, ".category-card")).backgroundColor)
    .toBe("rgba(255, 255, 255, 0.22)");

  await page.goto("notes/e2e-chapter/");
  const readerNavigation = await renderedGlass(page, "[data-reader-chapters]");
  expect(readerNavigation.backgroundColor).toBe("rgba(255, 255, 255, 0.32)");
});

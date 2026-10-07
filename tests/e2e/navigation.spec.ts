import { expect, test } from "@playwright/test";

test("a reader can navigate from category to course to chapter", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /向未知前行，.*也向更清晰的自己靠近。/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: /课程笔记/ }).first().click();
  await expect(page).toHaveURL(/\/aurora\/categories\/courses\/$/);
  await expect(page.getByRole("heading", { name: "课程笔记" })).toBeVisible();

  await page.getByRole("link", { name: /E2E 图形学课程/ }).click();
  await expect(page).toHaveURL(/\/aurora\/courses\/e2e-course\/$/);
  await expect(page.getByRole("heading", { name: "E2E 图形学课程" }).first()).toBeVisible();

  await page.getByRole("link", { name: /第一章：向量基础/ }).click();
  await expect(page).toHaveURL(/\/aurora\/notes\/e2e-chapter\/$/);
  await expect(page.locator("[data-reader-chapters]")).toBeVisible();
  await expect(page.locator("[data-reader-toc]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "核心概念" })).toBeVisible();
  await expect(page.getByText("阅读进度")).toHaveCount(0);
  await expect(page.getByText("适合人群")).toHaveCount(0);
  await expect(page.getByText("预计学习范围")).toHaveCount(0);
});

test("the reader layout collapses sidebars on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("notes/e2e-chapter/");

  await expect(page.locator("[data-reader-chapters]")).toBeHidden();
  await expect(page.locator("[data-reader-toc]")).toBeHidden();
  await expect(page.locator("[data-mobile-reader-nav]")).toBeVisible();
});

test("the skip link supports keyboard navigation", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到正文" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

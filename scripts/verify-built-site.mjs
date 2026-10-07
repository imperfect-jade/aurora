import { chromium } from "@playwright/test";

const baseUrl = process.env.AURORA_PREVIEW_URL ?? "http://127.0.0.1:4322/aurora/";
const previewOrigin = new URL(baseUrl).origin;
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  if (await page.locator("html").getAttribute("data-theme") === null) {
    throw new Error("Built homepage did not initialize a theme");
  }
  const localResources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  if (localResources.some((url) => new URL(url).origin === previewOrigin && !new URL(url).pathname.startsWith("/aurora/"))) {
    throw new Error("A built resource escaped the /aurora/ base path");
  }

  await page.goto(new URL("search/", baseUrl).toString());
  const input = page.getByRole("searchbox");
  const status = page.locator("[data-search-status]");

  await input.fill("向量基础");
  await status.getByText(/找到 \d+ 条结果/).waitFor();
  await page.getByRole("link", { name: /第一章：向量基础/ }).waitFor();

  await input.fill("核心概念");
  await status.getByText(/找到 \d+ 条结果/).waitFor();

  await input.fill("bodyonlyuniquetoken");
  await status.getByText(/没有找到/).waitFor();

  const missing = await page.goto(new URL("route-that-does-not-exist/", baseUrl).toString());
  if (missing?.status() !== 404) throw new Error(`Expected a 404 response, received ${missing?.status()}`);
  await page.getByRole("heading", { name: "这条路径尚未形成。" }).waitFor();

  console.log("Built site preserves the base path, metadata-only search, theme initialization and 404 page.");
} finally {
  await browser.close();
}

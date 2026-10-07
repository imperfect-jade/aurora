import { chromium } from "@playwright/test";

const baseUrl = process.env.AURORA_PREVIEW_URL ?? "http://127.0.0.1:4322/aurora/";
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
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

  console.log("Built search finds public metadata and excludes body-only terms.");
} finally {
  await browser.close();
}

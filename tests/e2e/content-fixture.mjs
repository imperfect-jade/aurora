import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const fixtureDirectory = resolve("src/generated/notes");
const fixtureFiles = ["e2e-course.md", "e2e-chapter.md"];

export async function createContentFixture() {
  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(
    resolve(fixtureDirectory, fixtureFiles[0]),
    `---
title: E2E 图形学课程
type: course-moc
slug: e2e-course
category: courses
summary: 用于验证读者导航的安全测试课程。
status: complete
created: "2026-09-01"
updated: "2026-10-01"
tags:
  - 图形学
---

# E2E 图形学课程

## 先修知识

线性代数。

## 学习路线

从第一章开始。
`,
    "utf8",
  );
  await writeFile(
    resolve(fixtureDirectory, fixtureFiles[1]),
    `---
title: 第一章：向量基础
type: note
slug: e2e-chapter
category: courses
summary: 测试章节的向量基础。
status: complete
created: "2026-09-02"
updated: "2026-10-02"
course: e2e-course
chapter: 1
tags:
  - 数学
---

# 第一章：向量基础

## 核心概念

向量具有方向和长度。

### 示例

这是一个测试示例。

bodyonlyuniquetoken
`,
    "utf8",
  );
}

export async function removeContentFixture() {
  await Promise.all(
    fixtureFiles.map((file) => rm(resolve(fixtureDirectory, file), { force: true })),
  );
}

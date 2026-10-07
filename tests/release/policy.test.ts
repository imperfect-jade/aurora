import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policyPath = resolve("src/lib/release/policy.ts");

async function loadPolicy() {
  expect(existsSync(policyPath), "release policy module must exist").toBe(true);
  return import(policyPath);
}

describe("release authorization policy", () => {
  it.each([
    ["new note", ["content-add"], "manual"],
    ["ordinary update", ["content-update"], "manual"],
    ["deletion", ["content-delete"], "manual"],
    ["withdrawal", ["content-withdrawal"], "manual"],
    ["slug change", ["slug-change"], "manual"],
    ["category move", ["category-move"], "manual"],
    ["large diff", ["large-diff"], "manual"],
    ["dependency change", ["dependency-change"], "manual"],
    ["workflow change", ["workflow-change"], "manual"],
    ["visual code change", ["visual-change"], "manual"],
    ["rollback", ["rollback"], "manual"],
  ] as const)("keeps %s under the required confirmation boundary", async (_label, changeKinds, expected) => {
    const { classifyRelease } = await loadPolicy();
    const result = classifyRelease({
      changeKinds: [...changeKinds],
      taskCategory: "course-note-update",
      authorizedTaskCategories: [],
      validationPassed: true,
      blockers: [],
      warnings: [],
    });
    expect(result.status).toBe(expected);
  });

  it("allows only an exact, explicitly authorized low-risk task category", async () => {
    const { classifyRelease } = await loadPolicy();
    expect(classifyRelease({
      changeKinds: ["content-update"],
      taskCategory: "course-note-update",
      authorizedTaskCategories: ["course-note-update"],
      validationPassed: true,
      blockers: [],
      warnings: [],
    }).status).toBe("auto");

    expect(classifyRelease({
      changeKinds: ["content-update"],
      taskCategory: "tool-note-update",
      authorizedTaskCategories: ["course-note-update"],
      validationPassed: true,
      blockers: [],
      warnings: [],
    }).status).toBe("manual");
  });

  it("never lets automatic authorization override warnings or forever-manual changes", async () => {
    const { classifyRelease } = await loadPolicy();
    const authorized = ["course-note-update"];

    expect(classifyRelease({
      changeKinds: ["content-update"], taskCategory: "course-note-update", authorizedTaskCategories: authorized,
      validationPassed: true, blockers: [], warnings: ["missing-alt"],
    }).status).toBe("manual");
    expect(classifyRelease({
      changeKinds: ["content-update", "slug-change"], taskCategory: "course-note-update", authorizedTaskCategories: authorized,
      validationPassed: true, blockers: [], warnings: [],
    }).status).toBe("manual");
  });

  it("hard-blocks failed validation and blocking findings", async () => {
    const { classifyRelease } = await loadPolicy();
    expect(classifyRelease({
      changeKinds: ["content-update"], taskCategory: "course-note-update", authorizedTaskCategories: ["course-note-update"],
      validationPassed: false, blockers: [], warnings: [],
    }).status).toBe("blocked");
    expect(classifyRelease({
      changeKinds: ["content-update"], taskCategory: "course-note-update", authorizedTaskCategories: ["course-note-update"],
      validationPassed: true, blockers: ["sensitive-data"], warnings: [],
    }).status).toBe("blocked");
  });
});

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportPath = resolve("src/lib/release/report.ts");

describe("redacted release report", () => {
  it("summarizes content, URLs, attachments and validation without leaking sensitive values", async () => {
    expect(existsSync(reportPath), "release report module must exist").toBe(true);
    const { createReleaseReport } = await import(reportPath);
    const privatePath = ["C:", "Users", "reader", "vault"].join("\\");
    const fakeCredential = `ghp_${"1234567890".repeat(3)}`;
    const report = createReleaseReport({
      decision: { status: "blocked", reasons: [`Sensitive value found at ${privatePath}`] },
      changes: {
        added: ["chapter-one"], updated: ["chapter-two"], deleted: [],
        urlChanges: [{ from: "/notes/old/", to: "/notes/new/" }],
        attachments: [{ path: "assets/diagram.webp", status: "optimized" }],
      },
      validation: { typecheck: "passed", tests: "passed", build: "failed" },
      findings: [{ level: "blocker", code: "credential-token", detail: fakeCredential }],
    });

    const serialized = JSON.stringify(report);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain(privatePath);
    expect(serialized).not.toContain(fakeCredential);
    expect(report.changes.added).toEqual(["chapter-one"]);
    expect(report.validation.build).toBe("failed");
  });
});

import { redactSensitiveText } from "../security/sensitive-scan.ts";
import type { ReleaseDecision } from "./policy.ts";

export interface ReleaseReportInput {
  decision: ReleaseDecision;
  changes: {
    added: string[];
    updated: string[];
    deleted: string[];
    urlChanges: { from: string; to: string }[];
    attachments: { path: string; status: string }[];
  };
  validation: Record<string, string>;
  findings: { level: "blocker" | "warning" | "info"; code: string; detail: string }[];
}

function redactValue<T>(value: T): T {
  if (typeof value === "string") return redactSensitiveText(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactValue(item)]),
    ) as T;
  }
  return value;
}

export function createReleaseReport(input: ReleaseReportInput) {
  return redactValue({
    generatedAt: new Date().toISOString(),
    decision: input.decision,
    changes: input.changes,
    validation: input.validation,
    findings: input.findings,
    pushExecuted: false,
    deploymentExecuted: false,
  });
}

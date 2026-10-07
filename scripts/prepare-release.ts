import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { classifyRelease, type ReleasePolicyInput } from "../src/lib/release/policy.ts";
import { createReleaseReport, type ReleaseReportInput } from "../src/lib/release/report.ts";

interface PreparationInput {
  policy: ReleasePolicyInput;
  changes: ReleaseReportInput["changes"];
  validation: ReleaseReportInput["validation"];
  findings: ReleaseReportInput["findings"];
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const inputPath = argument("--input");
if (!inputPath) {
  throw new Error("Usage: node scripts/prepare-release.ts --input <summary.json> [--output <report.json>]");
}

const outputPath = argument("--output") ?? ".aurora-release-report.json";
const input = JSON.parse(await readFile(resolve(inputPath), "utf8")) as PreparationInput;
const decision = classifyRelease(input.policy);
const report = createReleaseReport({
  decision,
  changes: input.changes,
  validation: input.validation,
  findings: input.findings,
});

await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Release preparation: ${decision.status}. Report written to ${resolve(outputPath)}.`);
if (decision.status === "blocked") process.exitCode = 2;

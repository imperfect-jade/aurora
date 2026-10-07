import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { scanRepositoryFiles } from "../src/lib/security/repository-scan.ts";

const root = resolve(".");
const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf8",
});
const paths = output.split("\0").filter(Boolean);
const findings = await scanRepositoryFiles(root, paths);

if (findings.length) {
  console.error(JSON.stringify({ status: "blocked", findings }, null, 2));
  process.exitCode = 2;
} else {
  console.log(`Sensitive-text scan passed for ${paths.length} tracked or unignored files.`);
}

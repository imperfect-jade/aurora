import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";

const skillRoot = resolve("tools/skills/notes-website-maintainer");
const requiredReferences = [
  "site-contract.md",
  "sync-workflow.md",
  "release-authorization.md",
  "maintenance-and-recovery.md",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const skill = await readFile(resolve(skillRoot, "SKILL.md"), "utf8");
const frontmatter = skill.match(/^---\r?\n([\s\S]+?)\r?\n---/)?.[1];
assert(frontmatter, "SKILL.md frontmatter is missing");
const metadata = parse(frontmatter);
assert(metadata.name === "notes-website-maintainer", "skill name must match its directory");
assert(metadata.description?.startsWith("Use when"), "description must describe trigger conditions");
assert(!skill.includes("TODO"), "skill contains unfinished scaffold text");

for (const reference of requiredReferences) {
  assert(skill.includes(`references/${reference}`), `${reference} is not routed from SKILL.md`);
  await readFile(resolve(skillRoot, "references", reference), "utf8");
}

const agentConfig = parse(await readFile(resolve(skillRoot, "agents/openai.yaml"), "utf8"));
assert(agentConfig.interface?.default_prompt?.includes("$notes-website-maintainer"), "default prompt must invoke the skill explicitly");

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
for (const command of ["sync:check", "sync", "security:scan", "validate", "dev", "preview", "release:prepare"]) {
  assert(packageJson.scripts?.[command], `repository command is missing: ${command}`);
}

const scenarios = (await readdir(resolve(skillRoot, "tests/scenarios"))).filter((file) => file.endsWith(".md"));
assert(scenarios.length >= 6, "at least six pressure scenarios are required");

const textFiles = [
  skill,
  await readFile(resolve(skillRoot, "agents/openai.yaml"), "utf8"),
  ...(await Promise.all(requiredReferences.map((file) => readFile(resolve(skillRoot, "references", file), "utf8")))),
];
const combined = textFiles.join("\n");
assert(!/\b[A-Za-z]:[\\/]/.test(combined), "skill package contains a local Windows path");
assert(!/\/(?:Users|home)\/[^\s/]+/.test(combined), "skill package contains a local home path");

console.log(`Skill structure valid: ${scenarios.length} scenarios, ${requiredReferences.length} routed references, all stable commands present.`);

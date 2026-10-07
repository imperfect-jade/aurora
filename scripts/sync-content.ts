import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { syncPublicNotes } from "../src/lib/sync/sync-public-notes";

const configArgument = process.argv.find((argument) => argument.startsWith("--config="));
const configPath = resolve(configArgument?.slice("--config=".length) ?? "config/vault.local.yml");
const config = parseYaml(await readFile(configPath, "utf8")) as { vaultRoot?: string };

if (!config.vaultRoot || config.vaultRoot === "PATH_TO_YOUR_OBSIDIAN_VAULT") {
  throw new Error("Configure vaultRoot in config/vault.local.yml before syncing");
}

const result = await syncPublicNotes({
  vaultRoot: config.vaultRoot,
  repoRoot: resolve("."),
});

console.log(JSON.stringify(result, null, 2));

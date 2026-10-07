import { resolve } from "node:path";
import { close, createIndex } from "pagefind";

const outputDirectory = resolve("dist");
const indexDirectory = resolve("dist/pagefind");

const { index, errors } = await createIndex({
  forceLanguage: "zh",
  rootSelector: "[data-pagefind-body]",
});
if (!index || errors.length) {
  throw new Error(`Unable to create Pagefind index: ${errors.join("; ") || "unknown error"}`);
}

const indexed = await index.addDirectory({ path: outputDirectory });
if (indexed.errors.length) {
  throw new Error(`Unable to read built pages: ${indexed.errors.join("; ")}`);
}

const written = await index.writeFiles({ outputPath: indexDirectory });
if (written.errors.length) {
  throw new Error(`Unable to write Pagefind index: ${written.errors.join("; ")}`);
}

await close();
console.log(`Pagefind indexed ${indexed.page_count} public pages into ${indexDirectory}.`);

/**
 * Compiles yml_source/<pack>/*.yml (hand-authored source documents, one per
 * file) into the LevelDB compendium packs declared in system.json's `packs`
 * array, using the standard modern Foundry workflow (@foundryvtt/foundryvtt-cli).
 *
 * Fails if a system.json pack has no source folder, or a source folder has no
 * matching system.json pack.
 *
 * Usage: npm run build:packs
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SRC_ROOT = path.join(ROOT, "yml_source");
const DEST_ROOT = path.join(ROOT, "packs");

const packNames = fs
  .readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const declared = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8")).packs.map(
  (p) => path.basename(p.path),
);
const problems = [
  ...declared
    .filter((n) => !packNames.includes(n))
    .map((n) => `system.json pack "${n}" has no yml_source/${n}/`),
  ...packNames
    .filter((n) => !declared.includes(n))
    .map((n) => `yml_source/${n}/ is not declared in system.json packs`),
];
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

for (const name of packNames) {
  const src = path.join(SRC_ROOT, name);
  const dest = path.join(DEST_ROOT, name);
  console.log(`Compiling pack "${name}" (${src} -> ${dest})`);
  await compilePack(src, dest, { yaml: true, recursive: true, log: true });
}

console.log(`Done. Compiled ${packNames.length} pack(s): ${packNames.join(", ")}`);

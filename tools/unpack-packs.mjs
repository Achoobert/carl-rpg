/**
 * The reverse of build-packs.mjs: extracts the LevelDB compendium packs
 * declared in system.json's `packs` array back into hand-editable
 * yml_source/<pack>/*.yml files, so in-world edits (e.g. swapping an
 * item's icon directly in the compendium) get captured back into source
 * control instead of being silently lost the next time `npm run build:packs`
 * recompiles from yml_source/.
 *
 * Filenames are kept in the same kebab-case-name.yml / _folder-name.yml
 * convention already used throughout yml_source/ (the CLI's own default
 * naming is `<Name>_<id>.yml`, which this overrides via transformName).
 *
 * Must be run while Foundry is fully closed - ClassicLevel (the pack
 * format) only allows one process to have a given pack directory open at a
 * time, same restriction as build:packs.
 *
 * Usage: npm run unpack:packs
 */
import { extractPack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SRC_ROOT = path.join(ROOT, "packs");
const DEST_ROOT = path.join(ROOT, "yml_source");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const packNames = fs
  .readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const name of packNames) {
  const src = path.join(SRC_ROOT, name);
  const dest = path.join(DEST_ROOT, name);
  console.log(`Extracting pack "${name}" (${src} -> ${dest})`);
  await extractPack(src, dest, {
    yaml: true,
    log: true,
    clean: true,
    omitVolatile: true,
    transformName: (doc, { documentType }) => {
      const slug = slugify(doc.name || doc._id);
      return documentType === "Folder" ? `_folder-${slug}.yml` : `${slug}.yml`;
    },
  });
}

console.log(`Done. Extracted ${packNames.length} pack(s): ${packNames.join(", ")}`);

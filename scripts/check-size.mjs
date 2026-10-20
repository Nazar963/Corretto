// Size budget for the shipped builds (NFR performance). Run after `npm run build` / `build:firefox`.
// Usage: node scripts/check-size.mjs [.output/chrome-mv3 ...]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
/** Injected into every page, so it must stay small (docs/requirements/product.md NFR). */
const CONTENT_SCRIPT_GZ = 30 * KB;
/** Whole extension; catches an accidental heavy dependency. */
const TOTAL_GZ = 300 * KB;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['.output/chrome-mv3', '.output/firefox-mv3'];
let failed = false;

for (const dir of dirs) {
  let total = 0;
  const rows = [];
  for (const path of files(dir)) {
    const gz = gzipSync(readFileSync(path)).length;
    total += gz;
    if (path.endsWith('.js')) rows.push([relative(dir, path), gz]);
  }
  const content = rows.find(([name]) => name.startsWith('content-scripts/'))?.[1] ?? 0;
  console.log(`\n${dir}`);
  for (const [name, gz] of rows.sort((a, b) => b[1] - a[1])) console.log(`  ${(gz / KB).toFixed(1).padStart(6)} KB gz  ${name}`);
  console.log(`  ${(total / KB).toFixed(1).padStart(6)} KB gz  total (all files)`);
  if (content > CONTENT_SCRIPT_GZ) {
    console.error(`  FAIL content script ${(content / KB).toFixed(1)} KB > ${CONTENT_SCRIPT_GZ / KB} KB`);
    failed = true;
  }
  if (total > TOTAL_GZ) {
    console.error(`  FAIL total ${(total / KB).toFixed(1)} KB > ${TOTAL_GZ / KB} KB`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('\nSize budget OK.');

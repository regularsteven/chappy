import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serviceCatalogBase, accentColors } from '../src/renderer/data/serviceCatalog.core.mjs';

assert(Array.isArray(accentColors), 'accentColors must be an array');
assert(accentColors.length > 0, 'accentColors must have at least one color');

assert(Array.isArray(serviceCatalogBase), 'service catalog must be an array');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconDirectory = path.resolve(__dirname, '../src/renderer/assets/icons');

assert(fs.existsSync(iconDirectory), `Icon directory not found: ${iconDirectory}`);
assert(fs.existsSync(path.join(iconDirectory, 'custom.svg')), 'Default fallback icon is missing: custom.svg');

for (const tab of serviceCatalogBase) {
  assert(typeof tab.id === 'string' && tab.id.length > 0, 'Each service needs a stable id');
  assert(typeof tab.title === 'string' && tab.title.length > 0, 'Each service needs a title');
  assert(typeof tab.url === 'string' && tab.url.startsWith('https://'), 'Each service needs an HTTPS URL');
  const iconPath = path.join(iconDirectory, `${tab.id}.svg`);
  assert(fs.existsSync(iconPath), `Missing icon for service "${tab.id}": ${iconPath}`);
}

console.log(`✅ Default chat services ready (${serviceCatalogBase.length} entries).`);

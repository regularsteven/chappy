import assert from 'node:assert/strict';
import { serviceCatalogBase, accentColors } from '../src/renderer/data/serviceCatalog.core.mjs';

assert(Array.isArray(accentColors), 'accentColors must be an array');
assert(accentColors.length > 0, 'accentColors must have at least one color');

assert(Array.isArray(serviceCatalogBase), 'service catalog must be an array');
for (const tab of serviceCatalogBase) {
  assert(typeof tab.id === 'string' && tab.id.length > 0, 'Each service needs a stable id');
  assert(typeof tab.title === 'string' && tab.title.length > 0, 'Each service needs a title');
  assert(typeof tab.url === 'string' && tab.url.startsWith('https://'), 'Each service needs an HTTPS URL');
}

console.log(`✅ Default chat services ready (${serviceCatalogBase.length} entries).`);

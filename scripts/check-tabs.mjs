import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  serviceCatalogBase,
  accentColors,
  filterServicesByQuery,
  serviceMatchesQuery
} from '../src/renderer/data/serviceCatalog.core.mjs';

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

// Quick Add search: title or domain, case-insensitive substring, on every keypress.
const idsFor = (query) => filterServicesByQuery(serviceCatalogBase, query).map((service) => service.id);

assert.deepEqual(idsFor('bsky.app'), ['bluesky'], 'domain query narrows to the one matching service');
assert.deepEqual(idsFor('Blue'), ['bluesky'], 'title prefix narrows to the one matching service');
assert(idsFor('Sky').includes('bluesky'), 'a fragment anywhere in the title still matches');
assert(idsFor('sky').includes('bluesky'), 'matching is case-insensitive');
assert.deepEqual(idsFor('https://bsky.app'), ['bluesky'], 'a pasted full URL still finds its catalog entry');
assert.deepEqual(idsFor('https://bsky.app/'), ['bluesky'], 'a trailing slash on the query is ignored');
assert.equal(filterServicesByQuery(serviceCatalogBase, ''), serviceCatalogBase, 'empty query returns the full list untouched');
assert.equal(filterServicesByQuery(serviceCatalogBase, '   '), serviceCatalogBase, 'whitespace-only query returns the full list untouched');
assert.equal(filterServicesByQuery(serviceCatalogBase, 'https://'), serviceCatalogBase, 'a bare scheme does not filter anything');
assert.deepEqual(idsFor('no-such-service-xyz'), [], 'an unmatched query yields an empty grid');
assert(!idsFor('https').includes('bluesky'), 'the scheme itself is never a match target');
assert(serviceMatchesQuery({ title: 'Messenger', url: 'https://www.facebook.com/messages/' }, 'facebook.com'), 'domain inside a longer address matches');
assert(!serviceMatchesQuery({ title: 'Messenger', url: 'https://www.facebook.com/messages/' }, 'bsky'), 'unrelated query does not match');

console.log(`✅ Default chat services ready (${serviceCatalogBase.length} entries), Quick Add search filters by title and domain.`);

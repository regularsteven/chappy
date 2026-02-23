import assert from 'node:assert/strict';
import { defaultTabs, accentColors } from '../src/renderer/data/defaultTabs.mjs';

assert(Array.isArray(accentColors), 'accentColors must be an array');
assert(accentColors.length > 0, 'accentColors must have at least one color');

assert(Array.isArray(defaultTabs), 'defaultTabs must be an array');
for (const tab of defaultTabs) {
  assert(typeof tab.id === 'string' && tab.id.length > 0, 'Each tab needs a stable id');
  assert(typeof tab.title === 'string' && tab.title.length > 0, 'Each tab needs a title');
  assert(typeof tab.url === 'string' && tab.url.startsWith('https://'), 'Each tab needs an HTTPS URL');
}

console.log(`✅ Default chat tabs ready (${defaultTabs.length} preconfigured).`);

import assert from 'node:assert/strict';
import { defaultTabs, accentColors } from '../src/renderer/data/defaultTabs.mjs';

assert(Array.isArray(accentColors), 'accentColors must be an array');
assert(accentColors.length > 0, 'accentColors must have at least one color');

assert(Array.isArray(defaultTabs), 'defaultTabs must be an array');
assert(defaultTabs.length >= 3, 'There should be at least three preconfigured chats');

const requiredTabIds = ['whatsapp', 'messenger', 'discord'];
for (const requiredId of requiredTabIds) {
  const tab = defaultTabs.find((entry) => entry.id === requiredId);
  assert(tab, `Missing required default tab "${requiredId}"`);
  assert(tab.url.startsWith('https://'), `Tab "${requiredId}" must point to an https:// URL`);
  assert(typeof tab.title === 'string' && tab.title.length > 0, `Tab "${requiredId}" needs a readable title`);
}

console.log('✅ Default chat tabs look healthy (whatsapp, messenger, discord).');

#!/usr/bin/env node
/**
 * Full icon fetch test: fetch page, parse, fetch icon, save to disk.
 * Run: node scripts/test-icon-full-flow.mjs
 * Verifies the main-process logic works outside the app.
 */
import { pickIconUrlFromHtml } from './icon-extract.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PAGE_URL = 'https://webexpo.net/';
const CHAPPY_DIR = path.join(os.homedir(), '.chappy');
const ICONS_DIR = path.join(CHAPPY_DIR, 'icons');
const TEST_FILE = path.join(ICONS_DIR, 'test-debug-primary.png');

async function run() {
  console.log('1. Fetching page...');
  const res = await fetch(PAGE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!res.ok) {
    throw new Error(`Page fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const finalUrl = res.url || PAGE_URL;
  console.log('   OK, got', html.length, 'bytes');

  console.log('2. Parsing for icon...');
  const iconUrl = pickIconUrlFromHtml(html, finalUrl);
  if (!iconUrl) {
    throw new Error('No icon URL found');
  }
  console.log('   OK:', iconUrl);

  console.log('3. Fetching icon...');
  const iconRes = await fetch(iconUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'image/*,*/*;q=0.8'
    }
  });
  if (!iconRes.ok) {
    throw new Error(`Icon fetch failed: ${iconRes.status}`);
  }
  const buffer = Buffer.from(await iconRes.arrayBuffer());
  console.log('   OK, got', buffer.length, 'bytes');

  console.log('4. Saving to', TEST_FILE);
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.writeFileSync(TEST_FILE, buffer);
  console.log('   OK');

  console.log('\n✅ Full flow succeeded. Icon saved to:', TEST_FILE);
}

run().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Automated test for website icon extraction.
 * Uses https://webexpo.net as the test case (site under user control).
 * Run: npm run test:fetch-icon
 */
import { pickIconUrlFromHtml } from './icon-extract.mjs';

const TEST_URL = 'https://webexpo.net/';
const EXPECTED_ICON_PATTERN = /apple-touch-icon|favicon\.ico/i;

async function run() {
  let html;
  let finalUrl = TEST_URL;
  try {
    const res = await fetch(TEST_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    finalUrl = res.url || TEST_URL;
    html = await res.text();
  } catch (err) {
    console.error('❌ Failed to fetch', TEST_URL, err?.message || err);
    process.exit(1);
  }

  const iconUrl = pickIconUrlFromHtml(html, finalUrl);
  if (!iconUrl) {
    console.error('❌ No icon URL extracted from HTML');
    process.exit(1);
  }

  if (!EXPECTED_ICON_PATTERN.test(iconUrl)) {
    console.error('❌ Unexpected icon URL:', iconUrl);
    console.error('   Expected pattern:', EXPECTED_ICON_PATTERN.toString());
    process.exit(1);
  }

  console.log('✅ Icon extraction test passed');
  console.log('   URL:', iconUrl);
}

run();

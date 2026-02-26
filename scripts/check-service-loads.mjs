import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { serviceCatalogBase } from '../src/renderer/data/serviceCatalog.core.mjs';

const REQUEST_TIMEOUT_SECONDS = Number.parseInt(process.env.CHAPPY_SERVICE_TIMEOUT_SECONDS || '20', 10);
const MIN_BODY_CHARS = Number.parseInt(process.env.CHAPPY_SERVICE_MIN_BODY_CHARS || '80', 10);
const SNIPPET_LENGTH = 4096;
const STATUS_TOKEN = '__CHAPPY_STATUS__';
const TYPE_TOKEN = '__CHAPPY_CTYPE__';
const URL_TOKEN = '__CHAPPY_EFFECTIVE_URL__';

const isHtmlLikeResponse = (contentType, snippet) => {
  const normalizedType = (contentType || '').toLowerCase();
  if (normalizedType.includes('text/html') || normalizedType.includes('application/xhtml+xml')) {
    return true;
  }
  const normalizedSnippet = (snippet || '').toLowerCase();
  return (
    normalizedSnippet.includes('<!doctype html') ||
    normalizedSnippet.includes('<html') ||
    normalizedSnippet.includes('<body')
  );
};

const parseCurlOutput = (stdout) => {
  const statusMarker = `\n${STATUS_TOKEN}=`;
  const statusStart = stdout.lastIndexOf(statusMarker);
  if (statusStart === -1) {
    return null;
  }

  const body = stdout.slice(0, statusStart);
  const metadata = stdout.slice(statusStart + 1).trim().split('\n');
  const fields = {};
  for (const line of metadata) {
    const [key, ...rest] = line.split('=');
    fields[key] = rest.join('=');
  }

  return {
    body,
    statusCode: Number.parseInt(fields[STATUS_TOKEN] || '0', 10),
    contentType: fields[TYPE_TOKEN] || '',
    effectiveUrl: fields[URL_TOKEN] || '',
  };
};

const runCurlLoad = (url) => {
  const result = spawnSync(
    'curl',
    [
      '--max-time',
      String(REQUEST_TIMEOUT_SECONDS),
      '--location',
      '--silent',
      '--show-error',
      '--write-out',
      `\n${STATUS_TOKEN}=%{http_code}\n${TYPE_TOKEN}=%{content_type}\n${URL_TOKEN}=%{url_effective}\n`,
      url,
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || '').trim() || `curl exited with code ${result.status}`);
  }

  const parsed = parseCurlOutput(result.stdout || '');
  if (!parsed) {
    throw new Error('Unable to parse curl output metadata.');
  }
  return parsed;
};

const curlVersionCheck = spawnSync('curl', ['--version'], { encoding: 'utf8' });
assert(curlVersionCheck.status === 0, '`curl` is required for service smoke tests.');
assert(Array.isArray(serviceCatalogBase), 'Service catalog must be an array.');
assert(serviceCatalogBase.length > 0, 'Service catalog must not be empty.');

const failures = [];
const passes = [];

for (const service of serviceCatalogBase) {
  const { id, title, url } = service;
  const label = `${title} (${id})`;
  try {
    const { body, statusCode, contentType, effectiveUrl } = runCurlLoad(url);
    const snippet = body.slice(0, SNIPPET_LENGTH);
    const hasBody = body.trim().length >= MIN_BODY_CHARS;
    const isHtmlLike = isHtmlLikeResponse(contentType, snippet);

    if (!(statusCode >= 200 && statusCode < 400)) {
      failures.push(`${label}: HTTP ${statusCode} at ${effectiveUrl || url}`);
      continue;
    }
    if (!isHtmlLike) {
      failures.push(`${label}: non-HTML response (${contentType || 'unknown content-type'})`);
      continue;
    }
    if (!hasBody) {
      failures.push(`${label}: response body too small (${body.trim().length} chars)`);
      continue;
    }

    passes.push(`${label}: ${statusCode} ${effectiveUrl || url}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failures.push(`${label}: request failed (${detail})`);
  }
}

for (const line of passes) {
  console.log(`✅ ${line}`);
}

if (failures.length > 0) {
  for (const line of failures) {
    console.error(`❌ ${line}`);
  }
  console.error(
    `\nService smoke test failed: ${failures.length} of ${serviceCatalogBase.length} services did not load valid web content.`
  );
  process.exit(1);
}

console.log(`\n✅ Service smoke test passed (${passes.length}/${serviceCatalogBase.length}).`);

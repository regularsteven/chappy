#!/usr/bin/env node
/**
 * Collates feature docs into release notes markdown.
 * Usage: node scripts/collate-release-notes.js [version]
 *
 * If version is provided (e.g., 0.0.3), includes features merged since the previous tag.
 * If omitted, includes all features (excluding TEMPLATE).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FEATURES_DIR = path.join(PROJECT_ROOT, 'docs', 'features');

function getTagDate(tag) {
  const result = spawnSync('git', ['log', '-1', '--format=%ci', tag], {
    encoding: 'utf8',
    cwd: PROJECT_ROOT
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return result.stdout.trim().slice(0, 10); // YYYY-MM-DD
}

function getTagsSorted() {
  const result = spawnSync('git', ['tag', '-l', 'v*', '--sort=-version:refname'], {
    encoding: 'utf8',
    cwd: PROJECT_ROOT
  });
  if (result.status !== 0) return [];
  return result.stdout.trim().split(/\n/).filter(Boolean);
}

function parseFeatureDoc(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const titleMatch = content.match(/^# (.+)$/m);
  const idMatch = content.match(/\*\*ID:\*\*\s*(\d+)/);
  const typeMatch = content.match(/\*\*Type:\*\*\s*(\w+)/);
  const mergedMatch = content.match(/\*\*Merged:\*\*\s*(.+)$/m);
  const summaryMatch = content.match(/## Summary\s*\n\s*(.+?)(?=\n##|\n$)/s);

  const merged = mergedMatch ? mergedMatch[1].trim() : '';
  const mergedDate = /^\d{4}-\d{2}-\d{2}$/.test(merged) ? merged : null;

  return {
    id: idMatch ? parseInt(idMatch[1], 10) : 0,
    title: titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md'),
    type: typeMatch ? typeMatch[1] : 'feature',
    mergedDate,
    summary: summaryMatch ? summaryMatch[1].trim() : ''
  };
}

function main() {
  const versionArg = process.argv[2];
  let sinceDate = null;

  if (versionArg) {
    const tags = getTagsSorted();
    // Previous tag = most recent existing tag (we're preparing the next release)
    const prevTagName = tags[0];
    if (prevTagName) {
      sinceDate = getTagDate(prevTagName);
    }
  }

  if (!fs.existsSync(FEATURES_DIR)) {
    console.error('docs/features/ not found');
    process.exit(1);
  }

  const files = fs.readdirSync(FEATURES_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md')
    .map((f) => path.join(FEATURES_DIR, f));

  const features = files
    .map(parseFeatureDoc)
    .filter((f) => {
      if (sinceDate && f.mergedDate) {
        return f.mergedDate >= sinceDate;
      }
      if (sinceDate && !f.mergedDate) return false;
      return true;
    })
    .sort((a, b) => a.id - b.id);

  const lines = [];
  for (const f of features) {
    lines.push(`- **${f.title}** (${f.type}): ${f.summary}`);
  }

  console.log(lines.join('\n'));
}

main();

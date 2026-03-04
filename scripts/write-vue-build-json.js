/**
 * Writes vue-build.json to dist for cache invalidation.
 * Run after build:renderer, before electron-builder.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

function computeDistHash() {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(DIST_DIR, { recursive: true }).sort();
  for (const file of files) {
    if (file === 'vue-build.json') continue;
    const fullPath = path.join(DIST_DIR, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    hash.update(file);
    hash.update(fs.readFileSync(fullPath));
  }
  return hash.digest('hex').slice(0, 16);
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Missing dist. Run build:renderer first.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.1';
const hash = computeDistHash();

fs.writeFileSync(
  path.join(DIST_DIR, 'vue-build.json'),
  JSON.stringify({ hash, version }, null, 2),
  'utf8'
);

console.log('✅ vue-build.json written (hash:', hash + ')');

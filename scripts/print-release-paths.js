const fs = require('node:fs');
const path = require('node:path');

const RELEASE_DIR = path.resolve(__dirname, '../release');

if (!fs.existsSync(RELEASE_DIR)) {
  console.error(`❌ Release directory not found: ${RELEASE_DIR}`);
  process.exit(1);
}

const entries = fs.readdirSync(RELEASE_DIR, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile() && (entry.name.endsWith('.dmg') || entry.name.endsWith('.zip')))
  .map((entry) => path.join(RELEASE_DIR, entry.name))
  .sort();

const appDirs = entries
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('mac'))
  .map((entry) => path.join(RELEASE_DIR, entry.name, 'Chappy.app'))
  .filter((candidate) => fs.existsSync(candidate));

if (files.length === 0 && appDirs.length === 0) {
  console.error(`❌ No desktop artifacts found in: ${RELEASE_DIR}`);
  process.exit(1);
}

console.log('✅ Desktop artifacts:');
for (const filePath of files) {
  console.log(`- ${filePath}`);
}
for (const appPath of appDirs) {
  console.log(`- ${appPath}`);
}

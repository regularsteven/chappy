const fs = require('node:fs');
const path = require('node:path');

const RELEASE_DIR = path.resolve(__dirname, '../release');

if (!fs.existsSync(RELEASE_DIR)) {
  console.error(`❌ Release directory not found: ${RELEASE_DIR}`);
  process.exit(1);
}

const entries = fs.readdirSync(RELEASE_DIR, { withFileTypes: true });
const files = entries
  .filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith('.dmg') ||
        entry.name.endsWith('.zip') ||
        entry.name.endsWith('.exe'))
  )
  .map((entry) => path.join(RELEASE_DIR, entry.name))
  .sort();

const appDirs = entries
  .filter(
    (entry) =>
      entry.isDirectory() &&
      (entry.name.startsWith('mac') || entry.name.startsWith('win'))
  )
  .flatMap((entry) => {
    const base = path.join(RELEASE_DIR, entry.name);
    if (entry.name.startsWith('mac')) {
      const appPath = path.join(base, 'Chappy.app');
      return fs.existsSync(appPath) ? [appPath] : [];
    }
    return [base];
  });

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

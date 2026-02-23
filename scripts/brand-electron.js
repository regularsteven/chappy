const fs = require('node:fs');
const path = require('node:path');

const ELECTRON_INFO = path.join(__dirname, '../node_modules/electron/dist/Electron.app/Contents/Info.plist');
const BRANDING = {
  CFBundleDisplayName: 'Chappy',
  CFBundleName: 'Chappy',
  CFBundleIdentifier: 'com.regularsteven.chappy'
};

if (process.platform !== 'darwin') {
  process.exit(0);
}

if (!fs.existsSync(ELECTRON_INFO)) {
  console.warn('Electron Info.plist not found; skipping branding.');
  process.exit(0);
}

let content = fs.readFileSync(ELECTRON_INFO, 'utf8');
let patched = false;

for (const [key, value] of Object.entries(BRANDING)) {
  const regex = new RegExp(`(<key>${key}</key>\s*<string>)([^<]+)(</string>)`, 's');
  if (!regex.test(content)) {
    continue;
  }
  content = content.replace(regex, `$1${value}$3`);
  patched = true;
}

if (patched) {
  fs.writeFileSync(ELECTRON_INFO, content, 'utf8');
  console.log('✅ Electron branding updated: CFBundleName set to Chappy.');
  process.exit(0);
}

console.log('ℹ️ Electron branding already matches Chappy.');

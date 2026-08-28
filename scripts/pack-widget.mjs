#!/usr/bin/env node
// Packs a widget source folder (widgets/<name>/) into an installable ZIP at
// widgets/dist/<name>-<version>.zip. Usage: npm run pack:widget <name>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetsRoot = path.resolve(__dirname, '../widgets');

const name = process.argv[2];
if (!name || name.includes('/') || name.includes('\\')) {
  console.error('Usage: npm run pack:widget <widget-folder-name>');
  process.exit(1);
}

const sourceDir = path.join(widgetsRoot, name);
const manifestPath = path.join(sourceDir, 'widget.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`No widget.json in ${sourceDir}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = typeof manifest.version === 'string' && manifest.version ? manifest.version : '0.0.0';
const distDir = path.join(widgetsRoot, 'dist');
fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, `${name}-${version}.zip`);
fs.rmSync(outPath, { force: true });

if (process.platform === 'win32') {
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outPath}' -Force`
  ], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', outPath, '.', '-x', '.DS_Store', '-x', '*/.DS_Store'], {
    cwd: sourceDir,
    stdio: 'inherit'
  });
}

console.log(`✅ Packed ${manifest.id || name} ${version} -> ${path.relative(process.cwd(), outPath)}`);

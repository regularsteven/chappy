const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const VUE_UPDATES_DIR = path.join(PROJECT_ROOT, 'vue-updates');
const CHAPPY_DIR = path.join(os.homedir(), '.chappy');
const RENDERER_PENDING_DIR = path.join(CHAPPY_DIR, 'renderer-pending');
const GITHUB_REPO = 'regularsteven/chappy';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
};

function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
    cwd: PROJECT_ROOT
  });
  if (result.status !== 0) return 'main';
  return (result.stdout || '').trim() || 'main';
}

function computeDistHash() {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(DIST_DIR, { recursive: true }).sort();
  for (const file of files) {
    const fullPath = path.join(DIST_DIR, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    hash.update(file);
    hash.update(fs.readFileSync(fullPath));
  }
  return hash.digest('hex').slice(0, 16);
}

if (!fs.existsSync(DIST_DIR)) {
  console.error(`❌ Missing build output: ${DIST_DIR}`);
  console.error('Run `npm run build:renderer` first.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const version = pkg.version || '0.0.1';
const hash = computeDistHash();
const branch = getCurrentBranch();

const vueBuildJson = { hash, version };
fs.writeFileSync(
  path.join(DIST_DIR, 'vue-build.json'),
  JSON.stringify(vueBuildJson, null, 2),
  'utf8'
);

fs.mkdirSync(VUE_UPDATES_DIR, { recursive: true });
const zipFileName = `chappy-vue-${hash}.zip`;
const zipFilePath = path.join(VUE_UPDATES_DIR, zipFileName);
const zipUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${branch}/vue-updates/${zipFileName}`;

if (fs.existsSync(zipFilePath)) fs.rmSync(zipFilePath, { force: true });

const zipRelative = path.relative(DIST_DIR, zipFilePath);
run('zip', ['-r', zipRelative, '.'], { cwd: DIST_DIR });

const manifest = {
  version,
  hash,
  url: zipUrl,
  publishedAt: new Date().toISOString()
};
fs.writeFileSync(
  path.join(VUE_UPDATES_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`✅ Vue update built: ${zipFilePath}`);
console.log(`   Hash: ${hash}`);
console.log(`   Branch: ${branch}`);
console.log(`   Manifest: ${path.join(VUE_UPDATES_DIR, 'manifest.json')}`);

fs.mkdirSync(CHAPPY_DIR, { recursive: true });
if (fs.existsSync(RENDERER_PENDING_DIR)) {
  fs.rmSync(RENDERER_PENDING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RENDERER_PENDING_DIR, { recursive: true });
const unzipResult = spawnSync('unzip', ['-o', '-q', zipFilePath, '-d', RENDERER_PENDING_DIR], {
  encoding: 'utf8',
  cwd: PROJECT_ROOT
});
if (unzipResult.status === 0) {
  console.log(`   Installed to ~/.chappy/renderer-pending (restart Chappy to apply)`);
} else {
  console.warn(`   Could not install locally (unzip failed)`);
}

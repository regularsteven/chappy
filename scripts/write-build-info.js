const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUILD_INFO_PATH = path.join(PROJECT_ROOT, 'build-info.json');

function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
    cwd: PROJECT_ROOT
  });
  if (result.status !== 0) return 'main';
  return (result.stdout || '').trim() || 'main';
}

function mapToUpdateBranch(branch) {
  if (branch === 'main') return 'main';
  if (branch === 'test') return 'test';
  if (branch === 'dev') return 'dev';
  if (branch.startsWith('feature/')) return 'dev';
  return 'main';
}

const branch = getCurrentBranch();
const updateBranch = mapToUpdateBranch(branch);

fs.writeFileSync(
  BUILD_INFO_PATH,
  JSON.stringify({ updateBranch }, null, 2),
  'utf8'
);

console.log(`✅ build-info.json written: updateBranch=${updateBranch} (from ${branch})`);

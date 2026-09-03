// Guards the self-update pipeline. electron-updater only works if
// electron-builder writes latest-mac.yml / latest.yml (which needs a publish
// config) and the release workflow uploads them next to the installers.
// Each of these has been silently lost before; fail the test suite instead.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));

assert(pkg.dependencies?.['electron-updater'], 'electron-updater must be a runtime dependency');

const publish = Array.isArray(pkg.build?.publish) ? pkg.build.publish : [pkg.build?.publish].filter(Boolean);
const github = publish.find((entry) => entry?.provider === 'github');
assert(github, 'package.json build.publish must include a github provider (it is what makes electron-builder emit latest*.yml)');
assert.equal(github.owner, 'regularsteven', 'publish owner must match the GitHub repo');
assert.equal(github.repo, 'chappy', 'publish repo must match the GitHub repo');

assert(pkg.build.mac.target.includes('zip'), 'macOS updates are served from the zip target; keep it');
assert(pkg.build.win.target.includes('nsis'), 'Windows updates are served from the nsis target; keep it');

for (const script of ['build:desktop', 'build:desktop:ci', 'build:windows']) {
  assert(pkg.scripts[script], `missing npm script ${script}`);
  assert(!/vue-update|build-info/.test(pkg.scripts[script]), `${script} still references the retired vue-update channel`);
}

const release = read('.github/workflows/release.yml');
for (const asset of ['mac-release/latest-mac.yml', 'windows-release/latest.yml']) {
  assert(release.includes(asset), `release.yml must upload ${asset} with the installers`);
}
assert(/fail_on_unmatched_files:\s*true/.test(release), 'release.yml must fail when an update manifest is missing');

for (const workflow of ['.github/workflows/release.yml', '.github/workflows/release-test.yml']) {
  const text = read(workflow);
  assert(
    text.includes('apple-actions/import-codesign-certs') && text.includes('MACOS_CERTIFICATE_P12_BASE64'),
    `${workflow} must import the Developer ID certificate before building; Squirrel.Mac will not update an ad-hoc-signed app`
  );
}

assert(fs.existsSync(path.join(root, 'main/app-update.js')), 'main/app-update.js is missing');
assert(!fs.existsSync(path.join(root, 'main/vue-update.js')), 'main/vue-update.js should have been removed');
assert(!fs.existsSync(path.join(root, 'vue-updates')), 'vue-updates/ should have been removed');

const mainSource = read('main/main.js');
assert(!mainSource.includes('vue-update'), 'main.js still references the retired vue-update module');
assert(mainSource.includes("require('./app-update.js')"), 'main.js must load the app updater');

console.log('✅ Self-update pipeline wiring checks passed.');

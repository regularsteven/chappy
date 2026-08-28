// Electron integration smoke test for the widget package pipeline.
// Boots the real main/main.js against a scratch HOME, installs the packed
// weather ZIP through the real IPC handler, and serves it through the real
// chappy-widget:// protocol on both sessions a widget webview depends on.
//
// Run with: npm run test:widget-runtime   (opens a Chappy window briefly)
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Isolate ~/.chappy before main.js computes its paths at require time.
const scratchHome = fs.mkdtempSync(path.join(os.tmpdir(), 'chappy-widget-smoke-'));
process.env.HOME = scratchHome;
process.env.USERPROFILE = scratchHome;
delete process.env.VITE_DEV_SERVER_URL;

const { app, ipcMain, net, session } = require('electron');

// Capture the real handlers so the test can invoke them directly.
const ipcHandlers = new Map();
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, handler) => {
  ipcHandlers.set(channel, handler);
  return originalHandle(channel, handler);
};

require('../main/main.js');

const WIDGET_PARTITION = 'persist:chappy-widgets';
const weatherManifest = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../widgets/weather/widget.json'), 'utf8')
);
const zipPath = path.resolve(__dirname, `../widgets/dist/weather-${weatherManifest.version}.zip`);

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

app.whenReady().then(async () => {
  let exitCode = 0;
  try {
    assertOk(fs.existsSync(zipPath), `Missing ${zipPath} — run \`npm run pack:widget weather\` first.`);

    // 1. Install through the real IPC handler (extract, validate, move into place).
    const installHandler = ipcHandlers.get('chappy:install-widget');
    assertOk(typeof installHandler === 'function', 'chappy:install-widget handler not registered');
    const install = await installHandler(null, { name: path.basename(zipPath), buffer: fs.readFileSync(zipPath) });
    assertOk(!install?.error, `Install failed: ${install?.error}`);
    assertOk(install?.manifest?.id === 'weather', 'Installed manifest id mismatch');
    assertOk(install.manifest.entry === 'index.html', 'Installed manifest entry mismatch');
    console.log(`✅ install-widget: ${install.manifest.name} v${install.manifest.version}`);

    // 2. The catalog scan sees it.
    const listed = await ipcHandlers.get('chappy:list-widgets')(null);
    assertOk(Array.isArray(listed) && listed.some((m) => m.id === 'weather'), 'list-widgets does not report weather');
    console.log(`✅ list-widgets: ${listed.length} installed`);

    // 3. The protocol serves the entry on the default session (catalog icons)…
    const defaultResponse = await net.fetch('chappy-widget://weather/index.html?instance=smoke');
    const defaultBody = await defaultResponse.text();
    assertOk(defaultResponse.ok && defaultBody.includes('<title>Weather</title>'), 'default-session protocol fetch failed');
    console.log('✅ chappy-widget:// serves entry on default session');

    // 4. …and on the widget partition (what the canvas webviews resolve against).
    const widgetSession = session.fromPartition(WIDGET_PARTITION);
    const partitionResponse = await widgetSession.fetch('chappy-widget://weather/icon.svg');
    assertOk(partitionResponse.ok, 'widget-partition protocol fetch failed');
    console.log(`✅ chappy-widget:// serves assets on ${WIDGET_PARTITION}`);

    // 5. Traversal outside the widget folder is refused.
    fs.writeFileSync(path.join(scratchHome, '.chappy', 'secret.txt'), 'nope');
    const traversal = await net.fetch('chappy-widget://weather/..%2Fsecret.txt');
    assertOk(traversal.status === 404, `traversal fetch returned ${traversal.status}, expected 404`);
    console.log('✅ path traversal outside the widget folder is refused');

    // 5b. A symlink inside the package pointing outside it is refused too.
    if (process.platform !== 'win32') {
      const linkPath = path.join(scratchHome, '.chappy', 'widgets', 'weather', 'escape.txt');
      fs.symlinkSync(path.join(scratchHome, '.chappy', 'secret.txt'), linkPath);
      const symlinkFetch = await net.fetch('chappy-widget://weather/escape.txt');
      assertOk(symlinkFetch.status === 404, `symlink fetch returned ${symlinkFetch.status}, expected 404`);
      console.log('✅ symlinked files outside the widget folder are refused');
    }

    // 6. Uninstall through the real handler.
    const removed = await ipcHandlers.get('chappy:remove-widget')(null, { widgetId: 'weather' });
    assertOk(removed?.ok, 'remove-widget failed');
    const listedAfter = await ipcHandlers.get('chappy:list-widgets')(null);
    assertOk(!listedAfter.some((m) => m.id === 'weather'), 'weather still listed after removal');
    console.log('✅ remove-widget cleans up');

    console.log('\n✅ Widget runtime smoke test passed.');
  } catch (error) {
    console.error(`❌ ${error?.message || String(error)}`);
    exitCode = 1;
  } finally {
    fs.rmSync(scratchHome, { recursive: true, force: true });
    app.exit(exitCode);
  }
});

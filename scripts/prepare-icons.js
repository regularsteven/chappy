const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Resvg } = require('@resvg/resvg-js');

const LOGO_SVG = path.join(__dirname, '../resources/chappy-logo.svg');
const LOGO_PNG = path.join(__dirname, '../resources/chappy-logo.png');
const LOGO_ICNS = path.join(__dirname, '../resources/chappy-logo.icns');
const ICONSET_DIR = path.join(os.tmpdir(), 'chappy-logo.iconset');

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
};

const renderPngFromSvg = () => {
  const svgMarkup = fs.readFileSync(LOGO_SVG, 'utf8');
  const renderer = new Resvg(svgMarkup, {
    fitTo: {
      mode: 'width',
      value: 1024
    }
  });
  const pngData = renderer.render();
  fs.writeFileSync(LOGO_PNG, pngData.asPng());
};

const hasExistingIcns = () => {
  try {
    return fs.existsSync(LOGO_ICNS) && fs.statSync(LOGO_ICNS).size > 0;
  } catch {
    return false;
  }
};

if (!fs.existsSync(LOGO_SVG)) {
  console.error(`❌ Missing logo file: ${LOGO_SVG}`);
  process.exit(1);
}

if (process.platform !== 'darwin') {
  console.log('ℹ️ Icon generation skipped (currently implemented for macOS with sips/iconutil).');
  process.exit(0);
}

try {
  renderPngFromSvg();

  fs.rmSync(ICONSET_DIR, { recursive: true, force: true });
  fs.mkdirSync(ICONSET_DIR, { recursive: true });

  const sizes = [16, 32, 128, 256, 512];
  for (const size of sizes) {
    const standardName = path.join(ICONSET_DIR, `icon_${size}x${size}.png`);
    const retinaName = path.join(ICONSET_DIR, `icon_${size}x${size}@2x.png`);
    run('sips', ['-z', `${size}`, `${size}`, LOGO_PNG, '--out', standardName]);
    run('sips', ['-z', `${size * 2}`, `${size * 2}`, LOGO_PNG, '--out', retinaName]);
  }

  try {
    run('iconutil', ['-c', 'icns', ICONSET_DIR, '-o', LOGO_ICNS]);
  } catch (error) {
    if (!hasExistingIcns()) {
      throw error;
    }
    console.warn('⚠️ iconutil rejected the generated iconset; keeping existing .icns asset.');
    console.warn(error.message);
  }
  console.log(`✅ App icons generated:\n- ${LOGO_PNG}\n- ${LOGO_ICNS}`);
} catch (error) {
  console.error('❌ Failed to prepare app icons.');
  console.error(error.message);
  process.exit(1);
} finally {
  fs.rmSync(ICONSET_DIR, { recursive: true, force: true });
}

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { notarize } = require('@electron/notarize');

const REQUIRED_ENV = ['APPLE_API_KEY_ID'];

function resolveApiKeyPath() {
  const fromPath = process.env.APPLE_API_KEY_PATH;
  if (fromPath) {
    return { path: fromPath, temporary: false };
  }

  const inlineKey = process.env.APPLE_API_KEY;
  if (!inlineKey) {
    return { path: '', temporary: false };
  }

  const keyId = process.env.APPLE_API_KEY_ID || 'local';
  const filePath = path.join(os.tmpdir(), `AuthKey_${keyId}.p8`);
  fs.writeFileSync(filePath, inlineKey, { mode: 0o600 });
  return { path: filePath, temporary: true };
}

exports.default = async function notarizeMac(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const requireSigning = process.env.CHAPPY_REQUIRE_MAC_SIGNING === 'true';

  const missingRequired = REQUIRED_ENV.filter((name) => !process.env[name]);
  const apiKey = resolveApiKeyPath();

  if (!apiKey.path || missingRequired.length > 0) {
    if (requireSigning) {
      throw new Error(
        `Missing notarization credentials. Required env vars: APPLE_API_KEY_PATH or APPLE_API_KEY, APPLE_API_KEY_ID. Missing: ${missingRequired.join(', ')}`
      );
    }

    console.log('Skipping macOS notarization: Apple credentials not set.');
    return;
  }

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot notarize macOS app. Missing app bundle at: ${appPath}`);
  }

  try {
    console.log(`Notarizing macOS app at: ${appPath}`);
    const runNotarize = async (includeIssuer) => {
      const options = {
        appPath,
        tool: 'notarytool',
        appleApiKey: apiKey.path,
        appleApiKeyId: process.env.APPLE_API_KEY_ID
      };

      if (includeIssuer && process.env.APPLE_API_ISSUER) {
        options.appleApiIssuer = process.env.APPLE_API_ISSUER;
      }

      await notarize(options);
    };

    if (process.env.APPLE_API_ISSUER) {
      try {
        await runNotarize(true);
      } catch (error) {
        console.warn('Initial notarization attempt failed; retrying without APPLE_API_ISSUER.');
        await runNotarize(false);
      }
    } else {
      await runNotarize(false);
    }
    console.log('Notarization finished.');
  } finally {
    if (apiKey.temporary) {
      fs.rmSync(apiKey.path, { force: true });
    }
  }
};

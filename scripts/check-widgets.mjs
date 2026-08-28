import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinWidgets, widgetTaxonomies, WIDGET_ID_PATTERN } from '../src/renderer/data/widgetCatalog.core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetsRoot = path.resolve(__dirname, '../widgets');

const SLUG_PATTERN = WIDGET_ID_PATTERN;

// Built-in (native) widget catalog integrity.
assert(Array.isArray(builtinWidgets) && builtinWidgets.length > 0, 'builtinWidgets must be a non-empty array');
for (const widget of builtinWidgets) {
  assert(SLUG_PATTERN.test(widget.id), `Built-in widget id must be a slug: ${widget.id}`);
  assert(typeof widget.title === 'string' && widget.title.length > 0, `Built-in widget "${widget.id}" needs a title`);
  assert(Array.isArray(widget.taxonomies), `Built-in widget "${widget.id}" needs a taxonomies array`);
}
assert(typeof widgetTaxonomies === 'object' && widgetTaxonomies !== null, 'widgetTaxonomies must be an object');

// Every widget source folder in widgets/ must hold a valid, installable package.
const sourceDirs = fs.readdirSync(widgetsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'dist')
  .map((entry) => entry.name);

assert(sourceDirs.includes('weather'), 'Reference weather widget source is missing from widgets/');

for (const dirName of sourceDirs) {
  const dir = path.join(widgetsRoot, dirName);
  const manifestPath = path.join(dir, 'widget.json');
  assert(fs.existsSync(manifestPath), `Missing widget.json in widgets/${dirName}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(SLUG_PATTERN.test(manifest.id), `widgets/${dirName}: manifest id must be a slug, got "${manifest.id}"`);
  assert(typeof manifest.name === 'string' && manifest.name.length > 0, `widgets/${dirName}: manifest needs a name`);
  assert(typeof manifest.entry === 'string' && manifest.entry.length > 0, `widgets/${dirName}: manifest needs an entry`);
  assert(!manifest.entry.includes('..'), `widgets/${dirName}: entry must not traverse upward`);
  assert(fs.existsSync(path.join(dir, manifest.entry)), `widgets/${dirName}: entry file "${manifest.entry}" missing`);
  if (manifest.icon) {
    assert(!manifest.icon.includes('..'), `widgets/${dirName}: icon must not traverse upward`);
    assert(fs.existsSync(path.join(dir, manifest.icon)), `widgets/${dirName}: icon file "${manifest.icon}" missing`);
  }
  if (manifest.tags) {
    assert(Array.isArray(manifest.tags), `widgets/${dirName}: tags must be an array`);
    for (const tag of manifest.tags) {
      assert(SLUG_PATTERN.test(tag), `widgets/${dirName}: tag must be a slug, got "${tag}"`);
    }
  }
  for (const sizeKey of ['defaultSize', 'minSize']) {
    if (manifest[sizeKey] !== undefined) {
      assert(
        Number.isFinite(manifest[sizeKey]?.width) && Number.isFinite(manifest[sizeKey]?.height),
        `widgets/${dirName}: ${sizeKey} needs numeric width and height`
      );
    }
  }
}

console.log(`✅ Widget catalog ready (${builtinWidgets.length} built-in, ${sourceDirs.length} package source${sourceDirs.length === 1 ? '' : 's'}).`);

# Extendable widget architecture with runtime-installable packages

- **ID:** 017
- **Type:** feature
- **Severity:** major
- **Version bump:** minor
- **Branches:** feature/widget-architecture
- **Merged:** 2026-08-28

## Summary

Widgets become a first-class, extendable system: a new mirror-gated **Widgets** tab
with a filterable catalog and a Quick Add ZIP drop zone, runtime-installable HTML
widget packages (no app rebuild), and a reference **Weather** widget package.

## Details

**Package format** (defined in `widgets/README.md`): a ZIP containing a
`widget.json` manifest (id, name, entry, icon, tags, default/min sizes) plus an
HTML entry point and assets. Packages install to `~/.chappy/widgets/<id>/` and are
served to sandboxed `<webview>`s via a new `chappy-widget://<id>/<path>` protocol,
registered on both the default session and the shared `persist:chappy-widgets`
partition. Each widget id is its own origin, so per-widget storage is isolated;
per-instance state is namespaced by the `?instance=<id>` query parameter (this is
how several Weather widgets hold different locations). Re-dropping a ZIP with the
same id updates the widget in place and remounts live instances.

**Main process**: `chappy:list-widgets`, `chappy:install-widget` (ZIP buffer →
extract-zip → manifest validation → staged atomic install, so a failed update
never destroys the existing version), and `chappy:remove-widget` IPC; manifest
and path sanitization with symlink (realpath) containment at serve time;
built-in widget ids reserved; a `will-navigate` guard plus renderer-level
drag/drop suppression so a ZIP dropped outside the Quick Add zone can never
navigate the app away; `mirrorWidgets` config schema extended with
`type: 'package'` entries carrying `widgetId`, `width`, and `height` (clock
entries unchanged, existing configs keep working).

**Renderer**:

- New **Widgets** subtab (between Configure and Settings). When display mode is
  not Mirror it states "Enable Mirror display to use widgets" with a one-click
  enable button; otherwise it shows the widget catalog (built-in Clock + installed
  packages) with taxonomy filters and the Quick Add drop zone / file picker.
- **Your Chappy** gains a Widgets panel listing placed widget instances with
  remove controls.
- **Configure** gains a Widgets section mirroring the catalog with a link to the
  Widgets tab.
- The mirror canvas **+** button now opens Chappy → Widgets instead of directly
  adding a clock; the clock is added from the catalog instead.
- New `PackageWidget.vue` renders package instances as draggable, resizable,
  hover-chrome windows on the canvas (webview src snapshotted once to avoid the
  reactive-src double-load pitfall); missing packages render a placeholder rather
  than breaking the canvas.

**Weather widget** (`widgets/weather/`, installable via Quick Add; build the ZIP
with `npm run pack:widget weather`): country + city selection (Open-Meteo
geocoding, keyless), current temperature, today's high, and a 3-day forecast with
weekday, high, and low. Location is changeable per instance via the hover gear.

**Tooling/tests**: `scripts/pack-widget.mjs` packs a widget source folder into an
installable ZIP; `scripts/check-widgets.mjs` validates built-in catalog integrity
and every `widgets/*/widget.json` package source, wired into `npm test`.

**Deliberate scope limits**: widget HTML is not CSP-restricted or signed (UX/
architecture prototype — see the security posture note in `widgets/README.md`),
and the mirror canvas is only visible while a service tab is active, so a config
with zero services has no way to display widgets yet.

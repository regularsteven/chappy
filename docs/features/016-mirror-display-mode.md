# Mirror display mode with floating service windows and clock widgets

- **ID:** 016
- **Type:** feature
- **Severity:** medium
- **Version bump:** minor
- **Branches:** feature/mirror-display-mode
- **Merged:** 2026-08-19

## Summary

Adds a Display setting (Desktop / Mirror). Mirror mode turns the workspace into a pure-black
canvas where each service opens in its own draggable, resizable floating window, plus
draggable clock widgets (local time or any city) as the first proof-of-concept widgets.

## Details

**Settings → Display.** A new "Layout mode" panel in the Chappy Settings tab toggles between
Desktop (the existing full-bleed layout, unchanged) and Mirror. The choice is persisted in the
config as `displayMode` and sanitized in both the main process and the renderer.

**Mirror mode.** The left service rail is kept but everything renders on pure black.
Mirror is black-only by design (the smart-mirror use case — light up as few pixels as
possible): while it is active the effective theme is forced to dark and a
`data-display="mirror"` CSS layer overrides the palette to true black, so choosing Light
or Dark in the header changes nothing until you switch back to Desktop.
Instead of a full-width service view, each service opens in a free-floating window:

- Sidebar click opens (or re-focuses) the service's window on the canvas.
- Windows drag by the title bar, resize from the bottom-right corner, and clamp to the canvas
  (full screen minus the sidebar). The ⛶ button (or double-clicking the title bar) fills the
  available canvas; ✕ closes the window (the session partition is shared with Desktop mode,
  so logins survive both mode switches and window closes, though the page itself reloads).
- Geometry, z-order, and open state persist per tab (`tab.mirrorWindow`) across restarts;
  open windows resume (and load) at launch by design — a mirror should come back the way
  it was left. Persisted geometry is re-clamped to the live canvas on mount and on window
  resize, so nothing can be stranded off-screen by a display change, and z-order is
  compacted at load so it stays below fixed chrome layers.
- Adding a service (Configure, Quick Add, or the custom form) while in Mirror mode opens
  its floating window immediately.
- The Chappy tab (Your Chappy / Configure / Settings) still shows as a normal full view so
  configuration stays reachable in Mirror mode.

**Clock widgets (PoC).** A dim "+" button in the canvas corner adds a clock: large
thin-face time, date + place caption, draggable anywhere on the canvas. Hovering a clock
reveals a time-zone picker (local time or any IANA zone, e.g. a world clock for another city)
and a remove button. Widgets persist in the config as `mirrorWidgets`.

**Known limitation.** Clicking inside a service's web content raises its window only via
the webview focus event; if a guest page swallows focus, clicking the window's title bar
always works.

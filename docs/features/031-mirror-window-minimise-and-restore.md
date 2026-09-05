# Minimise button, maximise/restore toggle, and a loaded-in-memory dot in the services menu

- **ID:** 031
- **Type:** feature
- **Severity:** medium
- **Version bump:** minor
- **Branches:** feature/mirror-window-minimise-maximise
- **Merged:** 2026-09-05

## Summary

Mirror windows gain a third title-bar control: minimise (−) hides a service without closing it,
so its page stays loaded and clicking the service in the menu brings it straight back with no
reload. The ⛶ button becomes a toggle — fill the canvas, then put the window back exactly where
it was. In both Desktop and Mirror mode, a small white dot beside a service icon in the menu
means that service still has a live page in memory.

## Details

**The problem.** ✕ was the only way to get a window off the canvas, and ✕ unmounts the webview:
the service leaves memory and the next click reloads it from scratch — a long wait for a chat
app, and any unsent message or scroll position is gone. There was also no way to tell, from the
services menu, which services were still loaded and which would cost a full reload to open.

**Three window states.** A service window is now closed, minimised, or visible:

| State | `mirrorWindow` | Webview | Re-opening from the services menu |
|---|---|---|---|
| Closed | `open: false` | unmounted | reloads the page |
| Minimised | `open: true, minimized: true` | mounted, hidden, still running | instant, page untouched |
| Visible | `open: true` | mounted, on the canvas | re-focuses it |

Minimise only sets a flag; the window keeps its place in the render list and is hidden with
`display: none`. Nothing moves in the DOM, so the guest is never re-attached and never
re-navigates — the same mechanism Desktop mode's preserved tabs already rely on. Verified in the
built app by setting a variable inside a service's page, minimising, re-opening from the menu,
and reading the variable back unchanged.

Minimised windows are loaded but not on the canvas, so they take no part in anything about how
the canvas looks: the "Select a service or add widgets" hint comes back when the last visible
window is minimised, smart arrange tiles only the windows you can see, and the cascade offset
for the next window ignores them.

**Maximise and restore.** ⛶ fills the canvas and remembers the rect it filled from; the button
then shows ❐ ("Restore size") and puts the window back at exactly that position and size.
Double-clicking the title bar does the same toggle. Dragging, resizing, or smart-arranging a
maximised window ends the maximised state and drops the remembered rect, so restore can never
drop a window somewhere the user never put it. Resizing the app window (or sliding the services
menu in and out) re-fills a maximised window instead of re-clamping it, so it keeps covering the
canvas.

**Loaded-in-memory dot.** Every service in the menu that still has a live webview shows a small
white dot in the gutter to the right of its icon, clear of the unread badge in the corner. What
counts as live differs by mode, and the dot follows the actual webviews in each:

- **Mirror:** every open window, minimised included. Closed means no dot.
- **Desktop, Preserve Tab Memory on:** the service on screen plus every service visited since
  launch — exactly the tabs that stay mounted.
- **Desktop, Preserve Tab Memory off:** only the service on screen.

The dot is white with a soft glow on dark and mirror backgrounds, and picks up a thin dark ring
in the light theme, where white alone would be invisible. The button also carries
`data-loaded="true|false"` for tests, and screen readers hear "<service> (loaded)".

**Persistence.** `minimized`, `maximized`, and the restore rect persist per tab alongside the
existing geometry, and are sanitized in both the renderer and the main process. A minimised
window resumes minimised and loaded, the same way open windows already resume — the mirror comes
back the way it was left. The restore rect is only stored while the window is maximised, so a
stale one can never be re-applied.

**A bug caught on the way.** The persisted config crosses an IPC boundary, which structured-clones
it. The new restore rect is the first nested object inside `mirrorWindow`, and reading it off a
reactive tab yields a Vue proxy — which `structuredClone` refuses, throwing `DataCloneError` and
silently killing every config save for the rest of the session. `serializeMirrorWindow` copies
the nested rect out, and a test asserts the persisted window survives `structuredClone`.

**Tests.** `scripts/check-mirror-window-state.mjs` (added to `npm test`) covers the three window
states, the maximise/restore round-trip including a maximised window whose restore rect went
missing, the release of the maximised state on a hand-move, the persisted shape, and the
loaded-in-memory rule for both modes and both Preserve Tab Memory settings. The built app was
also driven under Playwright: minimise/restore with no reload, maximise/restore geometry, the
hint returning when everything is minimised, state surviving a restart, dot counts matching the
live webview count in Desktop mode with the setting on and off, and a clean console throughout.

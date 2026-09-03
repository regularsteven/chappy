# Auto Hide Services Menu on the Mirror

- **ID:** 023
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/auto-hide-services-menu
- **Merged:** 2026-09-03

## Summary

Mirror mode gains a Display > Layout mode toggle, **Auto Hide Services Menu**, that slides the
left services menu off-canvas and replaces it with a small menu button in the top-left corner.
Pressing the button slides the menu back in for 30 seconds, then it hides again.

## Details

**The problem.** A smart mirror wants as few lit pixels as possible, and the services column is
always on. There was no way to put it away while keeping it reachable from a touch surface with
no mouse.

**Setting.** A new toggle row sits under the Desktop / Mirror switch in Display > Layout mode.
It renders only while Mirror is the active layout, because Desktop has nothing to reclaim the
space with. It persists as `autoHideServicesMenu`, added to the main-process config allowlist
and defaulting to `false` so an existing mirror does not lose its menu on upgrade.

**Hiding.** When the toggle is on and the mirror canvas is showing, the sidebar gets
`sidebar-panel--hidden`, which animates `margin-left` to minus its own width. Sliding by margin
rather than `transform` lets the canvas grow into the freed pixels instead of overlapping them.
While hidden the sidebar is `inert` and `aria-hidden`, so nothing behind the left edge stays
focusable. Reduced-motion users get the same result with no transition.

**Reveal button.** A round menu button (`#mirror-show-menu-button`) appears at the top-left of
the canvas, mirroring the existing `+` add-widgets button at the bottom-right and sharing its
styling. Pressing it removes the button, slides the menu in, and starts a 30 second countdown.
Any pointer interaction with the revealed menu restarts the countdown so it never slides away
from under a finger mid-use. When the countdown ends the menu slides out and the button returns.

**Chappy panel interaction.** Auto-hide only applies over the live canvas. While the Chappy
panel is open the menu stays put, since the user is configuring and the panel already carries
its own Hide control. Opening the panel, leaving Mirror mode, or switching the toggle off all
cancel any in-flight reveal, so the next hide is immediate rather than whenever an old timer
happens to fire. The reveal itself is never persisted; only the toggle is.

**Sessions are untouched.** Nothing here mounts or unmounts a webview. The sidebar is hidden
purely by CSS, so services keep their live pages and logins across any number of hide/reveal
cycles.

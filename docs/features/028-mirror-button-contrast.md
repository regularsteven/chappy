# Mirror canvas buttons get a white disc and dark glyph

- **ID:** 028
- **Type:** bugfix
- **Severity:** minor
- **Version bump:** patch
- **Branches:** feature/mirror-circle-button-contrast
- **Merged:** 2026-09-05

## Summary

The two round buttons that float on the Mirror canvas, the show-menu button (visible when the
services menu is auto-hidden) and the add-widgets button (always visible), now render as a
solid white disc with a dark icon or label instead of a translucent black disc with a dark
slate glyph.

## Details

**The problem.** Both buttons were styled to sit quietly on the black mirror: a 60% black
background, a `#1e293b` border, a `#475569` glyph, and then a 40% resting opacity on top of
all that. On a real mirror the result was a near-invisible grey smudge. The add button is
the only way to reach the Widgets tab from the canvas once the Chappy panel is hidden, and
the menu button is the only way to bring the services menu back when auto-hide is on, so both
need to be findable at a glance.

**The fix.** `#mirror-add-widget-button` and `#mirror-show-menu-button` in
`src/renderer/styles/tailwind.css` now use a white background and border with a `#0f172a`
glyph, and hover shifts the disc to `#e2e8f0` with a slightly darker glyph. The `opacity-40`
/ `hover:opacity-100` utilities were removed from both buttons in `App.vue`, since any
resting opacity would have turned the white disc grey again and undone the contrast gain.

**Scope.** Purely presentational. Button ids, positions, sizes, click handlers, and the
`sr-only` label are unchanged, and nothing here touches tabs, widgets, or persisted config.

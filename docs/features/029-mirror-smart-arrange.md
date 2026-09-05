# Smart arrange button tiles Mirror windows by count and canvas shape

- **ID:** 029
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/smart-arrange-button
- **Merged:** 2026-09-05

## Summary

Mirror mode gains a square arrange button in the bottom-left corner of the canvas. One press
tiles every open service window into equal columns, rows, or a 2 × 2 grid, chosen from how
many windows are open and whether the canvas is wide or tall. The button's icon previews the
split it will apply and disappears when fewer than two windows are open.

## Details

**The problem.** Windows on the mirror are opened one at a time and dragged into place by
hand. With one or two that is fine; with four or five the canvas drifts into overlaps and odd
gaps, and putting it right again means resizing every window individually.

**Placement.** The button sits at the bottom-left of the mirror canvas, 16px in from both
edges, the mirror image of the add-widgets button at the bottom-right. When the services menu
is showing, the canvas starts to the right of it, so the button lands beside the menu. When
Auto Hide Services Menu is on, the canvas spans the full width and the button sits in the
corner directly below the round show-menu button. It shares the white disc and dark glyph of
the other canvas buttons but is square with lightly rounded corners, so it reads as a layout
icon rather than another action bubble.

**Rules.** Windows are numbered in services-menu order, so window 1 is the top service in the
menu and the layout reads left to right or top to bottom in the same order.

| Open windows | Wide canvas | Tall canvas |
|---|---|---|
| 0 or 1 | no button | no button |
| 2 | two columns | two rows |
| 3 | thirds, left to right | thirds, top to bottom |
| 4 | 2 × 2 grid | quarters, top to bottom |
| 5 and up | equal columns | equal rows |

A canvas that is exactly square follows the wide rules. Only service windows are arranged;
clock and package widgets stay where they are.

**Icon.** The glyph is a framed square with one divider per split: a single vertical line for
two columns, a single horizontal line for two rows, a cross for the 2 × 2 grid, and so on. It
is computed from the same grid the click applies, so what you see is what you get. The button
carries a matching accessible name and tooltip, for example "Arrange 4 windows in a 2 × 2
grid", and `data-columns` / `data-rows` attributes for tests.

**Live aspect.** The wide/tall decision uses the mirror canvas itself, not the screen, so it
already accounts for the services menu. A `ResizeObserver` on the canvas keeps a reactive
size, so the icon flips between columns and rows as the app window is resized or the menu
slides in and out. A hidden canvas measures 0 × 0 while the Chappy panel is open; those
readings are ignored so the last real size survives a hide/show cycle.

**Geometry.** `src/renderer/composables/mirrorArrange.mjs` holds the pure rules:
`resolveArrangeGrid` picks columns and rows, `computeArrangedRects` turns them into pixel
rects. Slot edges are rounded from the accumulated fraction rather than from a rounded slot
size, so strips tile the canvas exactly with no 1px seam and no overhang. The rects are
applied through the existing `updateMirrorWindowRect`, so the same minimum-size clamp applies
as for a manual resize: on a canvas too narrow for the requested number of strips the windows
keep their minimum size and overlap rather than collapsing. Z-order, open state, and
webviews are untouched, so no service reloads. The result persists like any drag.

**Tests.** `scripts/check-mirror-arrange.mjs` (added to `npm test`) covers the orientation
rule, every count from 2 to 9 on wide, tall, square, and odd-sized canvases, exact tiling
with no gaps or overlaps, reading-order fill, labels, and glyph dividers. The built app was
also driven under Playwright to confirm placement, the glyph, and the applied geometry in
both orientations.

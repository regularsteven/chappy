# Arrange button flips between columns and rows on each press

- **ID:** 032
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/arrange-toggle-orientation
- **Merged:** 2026-10-08

## Summary

The Mirror arrange button now toggles. The first press still applies the layout the canvas
shape suggests; after that the button flips to the other layout, so pressing it again
switches columns to rows (or rows to columns), and pressing again switches back.

## Details

**The problem.** Smart arrange (doc 029) picks columns on a wide canvas and rows on a tall
one. That is usually right, but not always: two services that read best stacked on a wide
mirror had no way to get there short of resizing both windows by hand, because the button
only ever offered the one layout.

**Behaviour.** The button remembers the layout it last applied and offers the other one next.
Its icon, tooltip, and accessible name always describe what the *next* press will do, so after
arranging two windows into columns the icon shows a horizontal divider and reads "Arrange 2
windows in 2 rows".

| Open windows | Wide canvas, press 1 → 2 → 3 | Tall canvas, press 1 → 2 → 3 |
|---|---|---|
| 2 | columns → rows → columns | rows → columns → rows |
| 3 | columns → rows → columns | rows → columns → rows |
| 4 | 2 × 2 grid → 4 rows → 2 × 2 grid | 4 rows → 2 × 2 grid → 4 rows |
| 5 and up | columns → rows → columns | rows → columns → rows |

The flipped layout is exactly what the doc 029 rules would pick if the canvas were the other
shape, which is why four windows alternate between the 2 × 2 grid and four rows.

**Starting over.** Opening, closing, minimising, or restoring a window changes what there is
to arrange, so the toggle resets and the next press goes back to the canvas-aspect choice.
Dragging or resizing a window does not reset it. The toggle is not saved; after a restart
the button starts from the canvas aspect again.

**Narrow canvases.** Flipping to columns on a tall, narrow canvas can ask for strips thinner
than the 320px minimum window width. As in doc 029, the windows keep their minimum size and
overlap rather than collapsing; one more press flips back to rows.

**Code.** `resolveArrangeGrid` and `computeArrangedRects` in
`src/renderer/composables/mirrorArrange.mjs` take an optional orientation that overrides the
canvas aspect, and `flipArrangeOrientation` swaps wide and tall. `App.vue` keeps the last
applied orientation in memory and clears it when the set of visible windows changes. Renderer
only; no main-process change.

**Tests.** `scripts/check-mirror-arrange.mjs` covers the flip, the override on wide, tall,
and square canvases, the four-window grid/rows alternation, and the fallback to the canvas
aspect when no orientation is given. The built app was driven under Playwright: on a wide
canvas the button alternated columns and rows across three presses, with the glyph and
title flipping each time; opening a third window reset it to columns; on a tall canvas it
alternated rows and columns. No page errors.

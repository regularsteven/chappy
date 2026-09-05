import assert from 'node:assert/strict';
import {
  resolveArrangeOrientation,
  resolveArrangeGrid,
  computeArrangedRects,
  describeArrangeGrid,
  arrangeGlyphDividers,
} from '../src/renderer/composables/mirrorArrange.mjs';

const WIDE = { width: 1920, height: 1080 };
const TALL = { width: 1080, height: 1920 };
const SQUARE = { width: 1000, height: 1000 };

// Orientation: taller than wide is tall, everything else (square included) is wide.
assert.equal(resolveArrangeOrientation(WIDE), 'wide');
assert.equal(resolveArrangeOrientation(TALL), 'tall');
assert.equal(resolveArrangeOrientation(SQUARE), 'wide', 'a square canvas follows the wide rules');

// Fewer than two windows: nothing to arrange, so no button.
for (const count of [0, 1, -1, 1.5, NaN]) {
  assert.equal(resolveArrangeGrid(count, WIDE), null, `no grid for count ${count}`);
  assert.equal(computeArrangedRects(count, WIDE), null, `no rects for count ${count}`);
}

// Grid rules per window count.
const grid = (count, bounds) => {
  const result = resolveArrangeGrid(count, bounds);
  return [result.columns, result.rows];
};
assert.deepEqual(grid(2, WIDE), [2, 1], '2 windows wide: 2 columns');
assert.deepEqual(grid(2, TALL), [1, 2], '2 windows tall: 2 rows');
assert.deepEqual(grid(3, WIDE), [3, 1], '3 windows wide: thirds left to right');
assert.deepEqual(grid(3, TALL), [1, 3], '3 windows tall: thirds top to bottom');
assert.deepEqual(grid(4, WIDE), [2, 2], '4 windows wide: 2 x 2 grid');
assert.deepEqual(grid(4, TALL), [1, 4], '4 windows tall: quarters top to bottom');
assert.deepEqual(grid(5, WIDE), [5, 1], '5 windows wide: fifths');
assert.deepEqual(grid(5, TALL), [1, 5], '5 windows tall: fifths');
assert.deepEqual(grid(6, WIDE), [6, 1], '6 windows wide: sixths');
assert.deepEqual(grid(6, TALL), [1, 6], '6 windows tall: sixths');
assert.deepEqual(grid(9, WIDE), [9, 1], '9 windows wide: ninths');
assert.deepEqual(grid(4, SQUARE), [2, 2], 'square canvas uses the wide 2 x 2 rule');

// Rects tile the canvas exactly: every slot inside bounds, no gaps, no overlaps,
// and the union covers the whole area.
const checkTiling = (count, bounds) => {
  const rects = computeArrangedRects(count, bounds);
  assert.equal(rects.length, count, `${count} rects for ${count} windows`);
  let area = 0;
  for (const rect of rects) {
    for (const value of Object.values(rect)) {
      assert(Number.isInteger(value), `rect values are whole pixels: ${JSON.stringify(rect)}`);
    }
    assert(rect.width > 0 && rect.height > 0, `rect has positive size: ${JSON.stringify(rect)}`);
    assert(rect.x >= 0 && rect.y >= 0, `rect starts inside the canvas: ${JSON.stringify(rect)}`);
    assert(rect.x + rect.width <= bounds.width, `rect ends inside the canvas width: ${JSON.stringify(rect)}`);
    assert(rect.y + rect.height <= bounds.height, `rect ends inside the canvas height: ${JSON.stringify(rect)}`);
    area += rect.width * rect.height;
  }
  for (let a = 0; a < rects.length; a += 1) {
    for (let b = a + 1; b < rects.length; b += 1) {
      const first = rects[a];
      const second = rects[b];
      const overlaps =
        first.x < second.x + second.width && second.x < first.x + first.width &&
        first.y < second.y + second.height && second.y < first.y + first.height;
      assert(!overlaps, `rects ${a} and ${b} overlap for ${count} windows in ${JSON.stringify(bounds)}`);
    }
  }
  assert.equal(area, bounds.width * bounds.height, `rects cover the whole canvas for ${count} windows in ${JSON.stringify(bounds)}`);
  return rects;
};

for (const bounds of [WIDE, TALL, SQUARE, { width: 1366, height: 768 }, { width: 1001, height: 1003 }]) {
  for (let count = 2; count <= 9; count += 1) {
    checkTiling(count, bounds);
  }
}

// Ordering: window 1 is left / top, and the 2 x 2 grid fills in reading order.
const two = computeArrangedRects(2, WIDE);
assert.deepEqual(two, [
  { x: 0, y: 0, width: 960, height: 1080 },
  { x: 960, y: 0, width: 960, height: 1080 },
], '2 windows wide: left and right halves');
assert.deepEqual(computeArrangedRects(2, TALL), [
  { x: 0, y: 0, width: 1080, height: 960 },
  { x: 0, y: 960, width: 1080, height: 960 },
], '2 windows tall: top and bottom halves');
const four = computeArrangedRects(4, WIDE);
assert.deepEqual(four.map((rect) => [rect.x, rect.y]), [[0, 0], [960, 0], [0, 540], [960, 540]], '2 x 2 grid fills top-left, top-right, bottom-left, bottom-right');
const thirds = computeArrangedRects(3, { width: 1000, height: 600 });
assert.deepEqual(thirds.map((rect) => rect.width), [333, 334, 333], 'thirds absorb the rounding remainder without a seam');

// Labels and glyph dividers follow the grid.
assert.equal(describeArrangeGrid(resolveArrangeGrid(2, WIDE), 2), 'Arrange 2 windows in 2 columns');
assert.equal(describeArrangeGrid(resolveArrangeGrid(3, TALL), 3), 'Arrange 3 windows in 3 rows');
assert.equal(describeArrangeGrid(resolveArrangeGrid(4, WIDE), 4), 'Arrange 4 windows in a 2 × 2 grid');
assert.deepEqual(arrangeGlyphDividers(resolveArrangeGrid(2, WIDE)), { vertical: [0.5], horizontal: [] }, '2 columns: one vertical line in the middle');
assert.deepEqual(arrangeGlyphDividers(resolveArrangeGrid(2, TALL)), { vertical: [], horizontal: [0.5] }, '2 rows: one horizontal line in the middle');
assert.deepEqual(arrangeGlyphDividers(resolveArrangeGrid(4, WIDE)), { vertical: [0.5], horizontal: [0.5] }, '2 x 2: a cross');
assert.deepEqual(arrangeGlyphDividers(resolveArrangeGrid(3, WIDE)).vertical.length, 2, '3 columns: two dividers');
assert.deepEqual(arrangeGlyphDividers(resolveArrangeGrid(5, TALL)).horizontal.length, 4, '5 rows: four dividers');

console.log('✅ Mirror smart arrange tiles 2–9 windows into seamless columns, rows, or a 2 × 2 grid by canvas aspect.');

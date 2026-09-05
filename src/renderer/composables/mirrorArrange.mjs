// Smart-arrange geometry for Mirror mode. Pure functions with no Vue or DOM
// dependency so scripts/check-mirror-arrange.mjs can exercise them under Node.
//
// Rules (see docs/features/029-mirror-smart-arrange.md):
//   1 window   no arrangement (the button is not shown)
//   2, 3, 5+   equal strips along the canvas's long axis: columns on a wide
//              canvas, rows on a tall one
//   4          2 x 2 grid on a wide canvas, four rows on a tall one
// A square canvas follows the wide rules.

export const resolveArrangeOrientation = (bounds) =>
  bounds.height > bounds.width ? 'tall' : 'wide';

export const resolveArrangeGrid = (count, bounds) => {
  if (!Number.isInteger(count) || count < 2) {
    return null;
  }
  const orientation = resolveArrangeOrientation(bounds);
  if (orientation === 'wide') {
    return count === 4
      ? { columns: 2, rows: 2, orientation }
      : { columns: count, rows: 1, orientation };
  }
  return { columns: 1, rows: count, orientation };
};

// Slot edges are rounded from the accumulated fraction rather than from a
// rounded slot size, so the strips tile the canvas exactly: no 1px seam
// between windows and no overhang past the far edge.
const slotEdge = (index, slots, total) => Math.round((index * total) / slots);

export const computeArrangedRects = (count, bounds) => {
  const grid = resolveArrangeGrid(count, bounds);
  if (!grid) {
    return null;
  }
  const rects = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const x = slotEdge(column, grid.columns, bounds.width);
    const y = slotEdge(row, grid.rows, bounds.height);
    rects.push({
      x,
      y,
      width: slotEdge(column + 1, grid.columns, bounds.width) - x,
      height: slotEdge(row + 1, grid.rows, bounds.height) - y,
    });
  }
  return rects;
};

export const describeArrangeGrid = (grid, count) => {
  if (grid.columns > 1 && grid.rows > 1) {
    return `Arrange ${count} windows in a ${grid.columns} × ${grid.rows} grid`;
  }
  if (grid.columns > 1) {
    return `Arrange ${count} windows in ${grid.columns} columns`;
  }
  return `Arrange ${count} windows in ${grid.rows} rows`;
};

// Divider positions (0..1 fractions of the icon box) for the button glyph, so
// the icon previews exactly the split the button will apply.
export const arrangeGlyphDividers = (grid) => ({
  vertical: Array.from({ length: grid.columns - 1 }, (_, index) => (index + 1) / grid.columns),
  horizontal: Array.from({ length: grid.rows - 1 }, (_, index) => (index + 1) / grid.rows),
});

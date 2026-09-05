import assert from 'node:assert/strict';
import {
  isServiceInMemory,
  isWindowMaximized,
  isWindowMinimized,
  isWindowOpen,
  isWindowVisible,
  maximizedRect,
  rectOf,
  releaseMaximizeState,
  serializeMirrorWindow,
  toggleMaximizeState,
} from '../src/renderer/composables/mirrorWindowState.mjs';

const CANVAS = { width: 1600, height: 900 };
const WINDOWED = { x: 120, y: 80, width: 760, height: 540, z: 3, open: true };

// --- the three window states -------------------------------------------------
const closed = { ...WINDOWED, open: false };
const minimized = { ...WINDOWED, minimized: true };

assert.equal(isWindowOpen(WINDOWED), true, 'an open window is open');
assert.equal(isWindowOpen(minimized), true, 'a minimised window is still open — it stays loaded');
assert.equal(isWindowOpen(closed), false, 'a closed window is not open');
assert.equal(isWindowOpen(undefined), false, 'a service that was never opened has no window');
assert.equal(isWindowOpen(null), false, 'a null window is not open');

assert.equal(isWindowVisible(WINDOWED), true, 'an open, un-minimised window is drawn');
assert.equal(isWindowVisible(minimized), false, 'a minimised window is not drawn');
assert.equal(isWindowVisible(closed), false, 'a closed window is not drawn');

assert.equal(isWindowMinimized(minimized), true, 'minimised is open plus hidden');
assert.equal(isWindowMinimized(WINDOWED), false, 'a visible window is not minimised');
assert.equal(
  isWindowMinimized({ ...closed, minimized: true }),
  false,
  'closed wins over a leftover minimised flag'
);

// --- maximise / restore ------------------------------------------------------
assert.deepEqual(maximizedRect(CANVAS), { x: 0, y: 0, width: 1600, height: 900 }, 'maximised fills the canvas');
assert.deepEqual(rectOf(WINDOWED), { x: 120, y: 80, width: 760, height: 540 }, 'rectOf drops non-geometry fields');

const filled = toggleMaximizeState(WINDOWED, CANVAS);
assert.equal(filled.maximized, true, 'first press maximises');
assert.deepEqual(
  { x: filled.x, y: filled.y, width: filled.width, height: filled.height },
  { x: 0, y: 0, width: 1600, height: 900 },
  'first press fills the canvas'
);
assert.deepEqual(filled.restore, { x: 120, y: 80, width: 760, height: 540 }, 'the pre-fill rect is remembered');

const restored = toggleMaximizeState({ ...WINDOWED, ...filled }, CANVAS);
assert.equal(restored.maximized, false, 'second press un-maximises');
assert.deepEqual(
  { x: restored.x, y: restored.y, width: restored.width, height: restored.height },
  { x: 120, y: 80, width: 760, height: 540 },
  'second press restores the exact size and position from before'
);
assert.equal(restored.restore, undefined, 'the restore rect is dropped once it has been used');

// A maximised window whose remembered rect went missing must still un-maximise
// somewhere sane rather than collapsing to nothing.
const orphan = toggleMaximizeState({ ...WINDOWED, ...maximizedRect(CANVAS), maximized: true }, CANVAS);
assert.equal(orphan.maximized, false, 'a maximised window with no restore rect still un-maximises');
assert.deepEqual(
  { x: orphan.x, y: orphan.y, width: orphan.width, height: orphan.height },
  { x: 0, y: 0, width: 1600, height: 900 },
  'with nothing remembered the window keeps the size it has'
);

// Re-filling after a canvas resize follows the new canvas.
const smaller = { width: 900, height: 1400 };
assert.deepEqual(maximizedRect(smaller), { x: 0, y: 0, width: 900, height: 1400 }, 'a resized canvas re-fills');

assert.equal(isWindowMaximized({ ...WINDOWED, maximized: true }), true, 'the flag reads back');
assert.equal(isWindowMaximized(WINDOWED), false, 'a plain window is not maximised');
assert.equal(isWindowMaximized(undefined), false, 'no window is not maximised');

// --- a hand-moved window is no longer maximised ------------------------------
assert.equal(releaseMaximizeState(WINDOWED), null, 'moving a plain window changes no flags');
assert.deepEqual(
  releaseMaximizeState({ ...WINDOWED, maximized: true, restore: rectOf(WINDOWED) }),
  { maximized: false, restore: undefined },
  'dragging or resizing a maximised window ends the maximised state'
);
assert.deepEqual(
  releaseMaximizeState({ ...WINDOWED, restore: rectOf(WINDOWED) }),
  { maximized: false, restore: undefined },
  'a stale restore rect is cleared too, so it can never be re-applied'
);

// --- the sidebar "loaded and in memory" dot ----------------------------------
const inMemory = (overrides) => isServiceInMemory(overrides);

// Mirror mode: every open window has a live webview, minimised included.
assert.equal(inMemory({ mirrorMode: true, mirrorWindow: WINDOWED }), true, 'mirror: an open window is loaded');
assert.equal(inMemory({ mirrorMode: true, mirrorWindow: minimized }), true, 'mirror: a minimised window is loaded');
assert.equal(inMemory({ mirrorMode: true, mirrorWindow: closed }), false, 'mirror: a closed window is not loaded');
assert.equal(
  inMemory({ mirrorMode: true, mirrorWindow: closed, active: true, preserveTabMemory: true, preloaded: true }),
  false,
  'mirror: Desktop-mode memory does not keep a closed mirror window loaded'
);

// Desktop mode: the tab on screen, plus preserved tabs when the setting is on.
assert.equal(inMemory({ active: true }), true, 'desktop: the tab on screen is loaded');
assert.equal(
  inMemory({ active: false, preserveTabMemory: true, preloaded: true }),
  true,
  'desktop: a preserved tab stays loaded in the background'
);
assert.equal(
  inMemory({ active: false, preserveTabMemory: false, preloaded: true }),
  false,
  'desktop: with Preserve Tab Memory off only the tab on screen is loaded'
);
assert.equal(
  inMemory({ active: false, preserveTabMemory: true, preloaded: false }),
  false,
  'desktop: a service that was never opened is not loaded'
);
assert.equal(inMemory(), false, 'no arguments means nothing is loaded');

// --- persisted shape ---------------------------------------------------------
// The config is structured-cloned across IPC, so nothing nested may survive as
// a live reference to reactive state.
const live = { ...WINDOWED, maximized: true, restore: { x: 1, y: 2, width: 800, height: 600 } };
const persisted = serializeMirrorWindow(live);
assert.notEqual(persisted.restore, live.restore, 'the restore rect is copied, never shared');
assert.deepEqual(persisted.restore, { x: 1, y: 2, width: 800, height: 600 }, 'the copy keeps the geometry');
assert.equal(persisted.open, true, 'the rest of the window is carried over');
assert.equal(serializeMirrorWindow(undefined), undefined, 'a service with no window persists nothing');
assert.equal(
  serializeMirrorWindow({ ...WINDOWED, minimized: true }).minimized,
  true,
  'minimised persists, so a minimised service comes back minimised and loaded'
);
assert.equal('restore' in serializeMirrorWindow(WINDOWED), false, 'a window with no restore rect stores none');
assert.doesNotThrow(
  () => structuredClone(serializeMirrorWindow(live)),
  'the persisted window survives the structured clone that IPC does'
);

console.log('✅ Mirror window states (minimise, maximise/restore) and the sidebar loaded dot behave.');

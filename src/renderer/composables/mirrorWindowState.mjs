// Window-state rules for Mirror mode's floating service windows, plus the
// sidebar's "loaded and in memory" dot. Pure functions with no Vue or DOM
// dependency so scripts/check-mirror-window-state.mjs can exercise them under
// Node (see docs/features/031-mirror-window-minimise-and-restore.md).
//
// A service window has three states:
//   closed     open !== true         webview unmounted; reopening reloads it
//   minimised  open && minimized     webview stays mounted but hidden, so
//                                    reopening is instant and keeps the session
//   visible    open && !minimized    drawn on the canvas
//
// "Maximised" is a flag on top of that: the window fills the canvas and
// remembers the rect it filled from, so the same button puts it back.

export const isWindowOpen = (mirrorWindow) => mirrorWindow?.open === true;

export const isWindowMinimized = (mirrorWindow) =>
  isWindowOpen(mirrorWindow) && mirrorWindow.minimized === true;

export const isWindowVisible = (mirrorWindow) =>
  isWindowOpen(mirrorWindow) && mirrorWindow.minimized !== true;

export const isWindowMaximized = (mirrorWindow) => mirrorWindow?.maximized === true;

export const rectOf = (mirrorWindow) => ({
  x: mirrorWindow?.x ?? 0,
  y: mirrorWindow?.y ?? 0,
  width: mirrorWindow?.width ?? 0,
  height: mirrorWindow?.height ?? 0,
});

// A maximised window covers the whole canvas. Kept here so the initial fill and
// the re-fill after a canvas resize cannot drift apart.
export const maximizedRect = (bounds) => ({
  x: 0,
  y: 0,
  width: bounds?.width ?? 0,
  height: bounds?.height ?? 0,
});

// One button, two directions: fill the canvas, or go back to the remembered
// rect. `restore` is dropped on the way back so a stale rect can never be
// re-applied later. The caller clamps the result to the live canvas.
export const toggleMaximizeState = (mirrorWindow, bounds) => {
  if (isWindowMaximized(mirrorWindow)) {
    const restore = mirrorWindow.restore ? { ...rectOf(mirrorWindow.restore) } : rectOf(mirrorWindow);
    return { ...restore, maximized: false, restore: undefined };
  }
  return { ...maximizedRect(bounds), maximized: true, restore: rectOf(mirrorWindow) };
};

// Any geometry change the user makes by hand (drag, resize, smart arrange)
// ends the maximised state: the window is no longer the size the button gave
// it, so "restore" would put it somewhere the user never chose.
export const releaseMaximizeState = (mirrorWindow) =>
  isWindowMaximized(mirrorWindow) || mirrorWindow?.restore
    ? { maximized: false, restore: undefined }
    : null;

// The persisted config crosses an IPC boundary, which structured-clones it. A
// nested Vue reactive proxy (`mirrorWindow.restore` read off a reactive tab)
// throws DataCloneError there and silently kills every later save, so the
// nested rect is copied out too, not just spread over.
export const serializeMirrorWindow = (mirrorWindow) => {
  if (!mirrorWindow) {
    return undefined;
  }
  const { restore, ...rest } = mirrorWindow;
  return restore ? { ...rest, restore: rectOf(restore) } : { ...rest };
};

// The sidebar dot means "this service has a live webview". Mirror mode keeps
// one for every open window, minimised included. Desktop mode keeps one for
// the tab on screen, plus every previously visited tab when Preserve Tab
// Memory is on.
export const isServiceInMemory = ({
  mirrorMode = false,
  mirrorWindow = null,
  active = false,
  preserveTabMemory = false,
  preloaded = false,
} = {}) => {
  if (mirrorMode) {
    return isWindowOpen(mirrorWindow);
  }
  if (active) {
    return true;
  }
  return preserveTabMemory === true && preloaded === true;
};

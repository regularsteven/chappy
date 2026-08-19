import { ref } from 'vue';

/**
 * Shared pointer-drag logic for mirror windows and widgets.
 * Geometry stays local while a gesture is in flight and is committed once on
 * pointerup, so config persistence is not hammered on every pointermove.
 */
export function useMirrorDrag({ getRect, getBounds, minWidth, minHeight, onStart, onCommit }) {
  const liveRect = ref(null);
  const dragMode = ref(null); // 'move' | 'resize' | null

  let startPointer = null;
  let startRect = null;
  let bounds = null;

  // Resizing must cap size while keeping the origin fixed; moving must clamp
  // the origin while keeping the size fixed — mixing the two makes a resize
  // against the canvas edge drag the window toward 0,0.
  const clampRect = (rect, mode) => {
    if (!bounds) {
      return { ...rect };
    }
    if (mode === 'resize') {
      const width = Math.min(Math.max(rect.width, minWidth), Math.max(minWidth, bounds.width - rect.x));
      const height = Math.min(Math.max(rect.height, minHeight), Math.max(minHeight, bounds.height - rect.y));
      return { x: rect.x, y: rect.y, width, height };
    }
    const maxX = Math.max(0, bounds.width - rect.width);
    const maxY = Math.max(0, bounds.height - rect.height);
    return {
      x: Math.min(Math.max(rect.x, 0), maxX),
      y: Math.min(Math.max(rect.y, 0), maxY),
      width: rect.width,
      height: rect.height,
    };
  };

  const handleMove = (event) => {
    if (!dragMode.value || !startPointer || !startRect) {
      return;
    }
    const deltaX = event.clientX - startPointer.x;
    const deltaY = event.clientY - startPointer.y;
    liveRect.value = clampRect(
      dragMode.value === 'move'
        ? { ...startRect, x: startRect.x + deltaX, y: startRect.y + deltaY }
        : { ...startRect, width: startRect.width + deltaX, height: startRect.height + deltaY },
      dragMode.value
    );
  };

  const stopListening = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
    dragMode.value = null;
    startPointer = null;
    startRect = null;
    bounds = null;
  };

  const handleUp = () => {
    if (liveRect.value) {
      onCommit({ ...liveRect.value });
    }
    liveRect.value = null;
    stopListening();
  };

  const begin = (mode, event) => {
    if (event.button !== 0 || dragMode.value) {
      return;
    }
    event.preventDefault();
    onStart?.();
    dragMode.value = mode;
    startPointer = { x: event.clientX, y: event.clientY };
    startRect = { ...getRect() };
    bounds = getBounds?.() || null;
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  };

  return {
    liveRect,
    dragMode,
    startMove: (event) => begin('move', event),
    startResize: (event) => begin('resize', event),
  };
}

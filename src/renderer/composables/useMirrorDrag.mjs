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

  const clampRect = (rect) => {
    const maxWidth = bounds ? Math.max(minWidth, bounds.width) : rect.width;
    const maxHeight = bounds ? Math.max(minHeight, bounds.height) : rect.height;
    const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
    const height = Math.min(Math.max(rect.height, minHeight), maxHeight);
    const maxX = bounds ? Math.max(0, bounds.width - width) : rect.x;
    const maxY = bounds ? Math.max(0, bounds.height - height) : rect.y;
    return {
      x: Math.min(Math.max(rect.x, 0), maxX),
      y: Math.min(Math.max(rect.y, 0), maxY),
      width,
      height,
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
        : { ...startRect, width: startRect.width + deltaX, height: startRect.height + deltaY }
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

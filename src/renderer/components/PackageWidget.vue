<template>
  <section
    ref="rootRef"
    class="package-widget group absolute flex flex-col overflow-hidden rounded-xl"
    :class="{ 'package-widget--dragging': dragMode !== null }"
    :style="style"
    @pointerdown="$emit('focus')"
  >
    <header
      class="package-widget-handle flex shrink-0 select-none items-center gap-2 px-2"
      data-ref="package-widget-handle"
      @pointerdown="startMove"
    >
      <span class="truncate text-[10px] font-semibold uppercase tracking-[0.2em]">{{ title }}</span>
      <span class="flex-1"></span>
      <button
        type="button"
        class="mirror-window-control"
        title="Remove widget"
        data-ref="package-widget-remove"
        @pointerdown.stop
        @click="$emit('remove')"
      >
        ✕
      </button>
    </header>
    <div class="package-widget-body relative flex-1 overflow-hidden">
      <webview
        v-if="entrySrc"
        :key="`package-webview-${widget.id}-${reloadKey}`"
        :src="entrySrc"
        :partition="WIDGET_SESSION_PARTITION"
        class="h-full w-full border-0"
        @focus="$emit('focus')"
      ></webview>
      <div
        v-else
        class="package-widget-placeholder flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center"
      >
        <p class="text-xs font-semibold uppercase tracking-widest">{{ widget.widgetId }}</p>
        <p class="text-[11px]">Widget not installed — drop its ZIP on the Widgets tab, or remove it.</p>
      </div>
      <!-- Shield the webview while dragging so pointer events keep reaching the host page. -->
      <div v-if="dragMode !== null" class="absolute inset-0 z-10"></div>
    </div>
    <div
      class="package-widget-resize-handle absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize"
      data-ref="package-widget-resize-handle"
      @pointerdown="startResize"
    ></div>
    <Teleport to="body">
      <div
        v-if="dragMode !== null"
        class="fixed inset-0 z-[9999]"
        :style="{ cursor: dragMode === 'resize' ? 'nwse-resize' : 'move' }"
      ></div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMirrorDrag } from '../composables/useMirrorDrag.mjs';
import {
  WIDGET_SESSION_PARTITION,
  PACKAGE_WIDGET_MIN_WIDTH,
  PACKAGE_WIDGET_MIN_HEIGHT,
} from '../data/widgetCatalog.mjs';

const props = defineProps({
  widget: { type: Object, required: true },
  manifest: { type: Object, default: null },
  reloadKey: { type: Number, default: 0 },
  minWidth: { type: Number, default: PACKAGE_WIDGET_MIN_WIDTH },
  minHeight: { type: Number, default: PACKAGE_WIDGET_MIN_HEIGHT },
});

const emit = defineEmits(['focus', 'remove', 'update:rect']);

const rootRef = ref(null);

// Derived only from immutable instance identity plus the manifest's entry, so
// the webview never re-navigates on unrelated catalog refreshes — the string
// only changes when a reinstall genuinely moves the entry point (and drops to
// the placeholder when the package is uninstalled).
const entrySrc = computed(() =>
  props.manifest
    ? `chappy-widget://${props.manifest.id}/${props.manifest.entry}` +
      `?instance=${encodeURIComponent(props.widget.id)}&theme=mirror`
    : ''
);

const title = computed(() => props.manifest?.name || props.widget.widgetId);

const { liveRect, dragMode, startMove, startResize } = useMirrorDrag({
  getRect: () => ({
    x: props.widget.x,
    y: props.widget.y,
    width: props.widget.width,
    height: props.widget.height,
  }),
  getBounds: () => {
    const canvas = rootRef.value?.offsetParent;
    if (!canvas || !canvas.clientWidth || !canvas.clientHeight) {
      return null;
    }
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  },
  // Getters, not numbers: the manifest (and with it the real minimum size)
  // can resolve after this component mounts.
  minWidth: () => props.minWidth,
  minHeight: () => props.minHeight,
  onStart: () => emit('focus'),
  onCommit: (rect) => emit('update:rect', rect),
});

const displayRect = computed(
  () =>
    liveRect.value || {
      x: props.widget.x,
      y: props.widget.y,
      width: props.widget.width,
      height: props.widget.height,
    }
);

const style = computed(() => ({
  left: `${displayRect.value.x}px`,
  top: `${displayRect.value.y}px`,
  width: `${displayRect.value.width}px`,
  height: `${displayRect.value.height}px`,
  zIndex: props.widget.z || 1,
}));
</script>

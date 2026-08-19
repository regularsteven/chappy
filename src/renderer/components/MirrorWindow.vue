<template>
  <section
    ref="rootRef"
    class="mirror-window absolute flex flex-col overflow-hidden rounded-xl"
    :class="{ 'mirror-window--active': active, 'mirror-window--dragging': dragMode !== null }"
    :style="style"
    @pointerdown="$emit('focus')"
  >
    <header
      class="mirror-window-titlebar flex h-9 shrink-0 select-none items-center gap-2 px-3"
      data-ref="mirror-window-titlebar"
      @pointerdown="startMove"
      @dblclick="fillCanvas"
    >
      <img
        v-if="icon"
        :src="icon"
        alt=""
        aria-hidden="true"
        class="h-4 w-4 shrink-0 object-contain"
      />
      <span class="truncate text-xs font-semibold uppercase tracking-widest">{{ title }}</span>
      <span class="flex-1"></span>
      <button
        type="button"
        class="mirror-window-control"
        title="Fill canvas"
        data-ref="mirror-window-maximize"
        @pointerdown.stop
        @click="fillCanvas"
      >
        ⛶
      </button>
      <button
        type="button"
        class="mirror-window-control"
        title="Close"
        data-ref="mirror-window-close"
        @pointerdown.stop
        @click="$emit('close')"
      >
        ✕
      </button>
    </header>
    <div class="mirror-window-body relative flex-1 overflow-hidden">
      <slot />
      <!-- Shield the webview while dragging so pointer events keep reaching the host page. -->
      <div v-if="dragMode !== null" class="absolute inset-0 z-10"></div>
    </div>
    <div
      class="mirror-window-resize-handle absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize"
      data-ref="mirror-window-resize-handle"
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

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  rect: { type: Object, required: true },
  active: { type: Boolean, default: false },
  minWidth: { type: Number, default: 320 },
  minHeight: { type: Number, default: 240 },
});

const emit = defineEmits(['focus', 'close', 'update:rect']);

const rootRef = ref(null);

const getCanvasBounds = () => {
  const canvas = rootRef.value?.offsetParent;
  if (!canvas || !canvas.clientWidth || !canvas.clientHeight) {
    return null;
  }
  return { width: canvas.clientWidth, height: canvas.clientHeight };
};

const { liveRect, dragMode, startMove, startResize } = useMirrorDrag({
  getRect: () => ({
    x: props.rect.x,
    y: props.rect.y,
    width: props.rect.width,
    height: props.rect.height,
  }),
  getBounds: getCanvasBounds,
  minWidth: props.minWidth,
  minHeight: props.minHeight,
  onStart: () => emit('focus'),
  onCommit: (rect) => emit('update:rect', rect),
});

const displayRect = computed(() => liveRect.value || props.rect);

const style = computed(() => ({
  left: `${displayRect.value.x}px`,
  top: `${displayRect.value.y}px`,
  width: `${displayRect.value.width}px`,
  height: `${displayRect.value.height}px`,
  zIndex: props.rect.z || 1,
}));

const fillCanvas = () => {
  const bounds = getCanvasBounds();
  if (!bounds) {
    return;
  }
  emit('focus');
  emit('update:rect', { x: 0, y: 0, width: bounds.width, height: bounds.height });
};
</script>

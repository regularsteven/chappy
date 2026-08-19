<template>
  <div
    ref="rootRef"
    class="clock-widget group absolute select-none rounded-2xl px-6 py-4"
    :style="style"
    @pointerdown="handlePointerDown"
  >
    <p class="clock-widget-time text-6xl font-extralight tabular-nums leading-none">{{ timeLabel }}</p>
    <p class="clock-widget-caption mt-2 text-xs font-semibold uppercase tracking-[0.25em]">{{ caption }}</p>
    <div
      class="clock-widget-controls absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100"
    >
      <select
        v-model="timeZoneModel"
        class="clock-widget-select rounded-lg px-2 py-1 text-[11px] focus:outline-none"
        title="Time zone"
        data-ref="clock-widget-timezone-select"
        @pointerdown.stop
      >
        <option value="">Local time</option>
        <option v-for="zone in timeZones" :key="zone" :value="zone">{{ zoneLabel(zone) }}</option>
      </select>
      <button
        type="button"
        class="mirror-window-control"
        title="Remove clock"
        data-ref="clock-widget-remove"
        @pointerdown.stop
        @click="$emit('remove')"
      >
        ✕
      </button>
    </div>
    <Teleport to="body">
      <div v-if="dragMode !== null" class="fixed inset-0 z-[9999] cursor-move"></div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMirrorDrag } from '../composables/useMirrorDrag.mjs';

const props = defineProps({
  widget: { type: Object, required: true },
});

const emit = defineEmits(['focus', 'remove', 'update:rect', 'update:timeZone']);

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const timeZones =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : FALLBACK_TIME_ZONES;

const rootRef = ref(null);
const now = ref(new Date());
let tickInterval = null;

const buildFormatter = (options) => {
  const timeZone = props.widget.timeZone || undefined;
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone });
  } catch (error) {
    return new Intl.DateTimeFormat(undefined, options);
  }
};

const timeFormatter = computed(() =>
  buildFormatter({ hour: '2-digit', minute: '2-digit', hour12: false })
);
const dateFormatter = computed(() =>
  buildFormatter({ weekday: 'short', day: 'numeric', month: 'short' })
);

const timeLabel = computed(() => timeFormatter.value.format(now.value));

const zoneLabel = (zone) => zone.split('/').pop().replace(/_/g, ' ');

const caption = computed(() => {
  const place = props.widget.timeZone ? zoneLabel(props.widget.timeZone) : 'Local';
  return `${dateFormatter.value.format(now.value)} · ${place}`;
});

const timeZoneModel = computed({
  get: () => props.widget.timeZone || '',
  set: (value) => emit('update:timeZone', value),
});

const { liveRect, dragMode, startMove } = useMirrorDrag({
  getRect: () => ({
    x: props.widget.x,
    y: props.widget.y,
    width: rootRef.value?.offsetWidth || 280,
    height: rootRef.value?.offsetHeight || 120,
  }),
  getBounds: () => {
    const canvas = rootRef.value?.offsetParent;
    if (!canvas || !canvas.clientWidth || !canvas.clientHeight) {
      return null;
    }
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  },
  minWidth: 0,
  minHeight: 0,
  onStart: () => emit('focus'),
  onCommit: (rect) => emit('update:rect', rect),
});

const displayPosition = computed(() => liveRect.value || { x: props.widget.x, y: props.widget.y });

const style = computed(() => ({
  left: `${displayPosition.value.x}px`,
  top: `${displayPosition.value.y}px`,
  zIndex: props.widget.z || 1,
}));

const handlePointerDown = (event) => {
  if (event.target.closest('select, button, option')) {
    return;
  }
  startMove(event);
};

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
});
</script>

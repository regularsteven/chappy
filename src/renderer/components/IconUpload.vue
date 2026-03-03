<template>
  <div class="space-y-2">
    <div
      class="flex h-full min-h-[140px] cursor-pointer flex-col rounded-xl border border-slate-700 bg-slate-950/50 p-4 transition hover:border-slate-600"
      :class="{ 'border-sky-500/50 bg-sky-500/5': isDragging, 'cursor-default': modelValue }"
      :data-ref="`icon-upload-${type}`"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="!modelValue && triggerFileInput()"
    >
      <!-- Row a: Icon (center aligned) -->
      <div class="flex flex-1 items-center justify-center py-2">
        <div
          v-if="iconUrl"
          class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
        >
          <img
            :src="iconUrl"
            alt=""
            class="h-10 w-10 object-contain"
            @error="handleImageError"
          />
        </div>
        <div
          v-else
          class="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/50 text-slate-500 transition hover:border-sky-500/60 hover:bg-sky-500/5 hover:text-sky-400"
        >
          <span class="text-lg">+</span>
        </div>
      </div>
      <!-- Row b: Copy (center aligned) -->
      <div class="text-center">
        <p class="text-sm font-medium text-white">
          {{ modelValue ? 'Custom icon' : 'Drop icon or click to add' }}
        </p>
        <p class="mt-0.5 text-xs text-slate-400">
          Square SVG or PNG, 64px recommended
        </p>
      </div>
      <!-- Row c: Buttons (balanced left and right) -->
      <div v-if="modelValue" class="flex justify-between gap-2 pt-2">
        <button
          type="button"
          class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          @click.stop="triggerFileInput"
        >
          Replace
        </button>
        <button
          type="button"
          class="rounded-lg border border-rose-600/60 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
          @click.stop="removeIcon"
        >
          Remove
        </button>
      </div>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/svg+xml,image/png"
      class="hidden"
      @change="handleFileSelect"
    />
    <p v-if="errorMessage" class="text-xs text-rose-400">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  tabId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    validator: (v) => ['primary', 'secondary'].includes(v)
  }
});

const emit = defineEmits(['update:modelValue']);

const fileInputRef = ref(null);
const isDragging = ref(false);
const errorMessage = ref('');
const resolvedUrl = ref('');

const chappy = typeof window !== 'undefined' ? window.chappy : null;

const iconUrl = computed(() => {
  if (resolvedUrl.value) {
    return resolvedUrl.value;
  }
  return null;
});

const resolveUrl = async () => {
  if (!props.modelValue || !chappy?.resolveIconUrl) {
    resolvedUrl.value = '';
    return;
  }
  try {
    const url = await chappy.resolveIconUrl({ path: props.modelValue });
    resolvedUrl.value = url || '';
  } catch {
    resolvedUrl.value = '';
  }
};

watch(
  () => props.modelValue,
  () => {
    resolveUrl();
  },
  { immediate: true }
);

const handleImageError = () => {
  resolvedUrl.value = '';
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const ALLOWED_TYPES = new Set(['image/svg+xml', 'image/png']);

const processFile = async (file) => {
  errorMessage.value = '';
  if (!file || !ALLOWED_TYPES.has(file.type)) {
    errorMessage.value = 'Please use a square SVG or PNG image (64px recommended).';
    return;
  }
  if (!chappy?.saveIcon) {
    errorMessage.value = 'Icon upload is not available.';
    return;
  }
  try {
    const buffer = await file.arrayBuffer();
    const result = await chappy.saveIcon({
      tabId: props.tabId,
      type: props.type,
      buffer,
      mimeType: file.type
    });
    if (result?.path) {
      emit('update:modelValue', result.path);
      resolveUrl();
    }
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to save icon.';
  }
};

const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (file) {
    processFile(file);
  }
  event.target.value = '';
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
};

const removeIcon = async () => {
  if (!props.modelValue) {
    return;
  }
  if (chappy?.deleteIcon) {
    try {
      await chappy.deleteIcon({ path: props.modelValue });
    } catch {
      // ignore
    }
  }
  emit('update:modelValue', null);
  resolvedUrl.value = '';
};
</script>

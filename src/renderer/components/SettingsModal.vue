<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm sm:p-6" data-ref="edit-service-modal-backdrop" @click.self="$emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_28px_80px_rgba(2,6,23,0.8)] sm:max-h-[85vh]" data-ref="edit-service-modal">
      <div class="flex shrink-0 flex-col gap-1 border-b border-slate-700 p-6 pb-4 sm:p-7">
        <h2 class="text-3xl font-bold text-white">Edit {{ tab.title }}</h2>
        <p class="text-sm text-slate-400">
          Pick which URL opens when you switch to this tab.
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-6 sm:p-7">
        <div class="space-y-5">
          <div>
            <p class="mb-3 text-sm font-semibold text-white">Icons</p>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
              <div class="flex flex-col">
                <p class="mb-1.5 text-xs font-medium text-slate-400">Primary</p>
                <div v-if="isCustomTab" class="flex-1 space-y-2">
                  <IconUpload
                    :model-value="primaryIconPath"
                    :tab-id="tab.id"
                    type="primary"
                    @update:model-value="primaryIconPath = $event"
                  />
                  <button
                    type="button"
                    class="text-xs text-sky-400 hover:text-sky-300 underline"
                    @click="$emit('fetch-icon')"
                  >
                    Fetch icon from website
                  </button>
                </div>
                <div
                  v-else
                  class="flex min-h-[140px] flex-1 flex-col rounded-xl border border-slate-700 bg-slate-950/50 p-4"
                >
                  <div class="flex flex-1 items-center justify-center py-2">
                    <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                      <img :src="tab.icon" alt="" class="h-10 w-10 object-contain" />
                    </div>
                  </div>
                  <div class="text-center">
                    <p class="text-sm font-medium text-white">Default</p>
                    <p class="mt-0.5 text-xs text-slate-400">Cannot be changed</p>
                  </div>
                </div>
              </div>
              <div class="flex flex-col">
                <p class="mb-1.5 text-xs font-medium text-slate-400">Secondary <span class="font-normal text-slate-500">(optional)</span></p>
                <div class="flex-1">
                  <IconUpload
                    :model-value="secondaryIconPath"
                    :tab-id="tab.id"
                    type="secondary"
                    @update:model-value="secondaryIconPath = $event"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
        <label class="group block cursor-pointer rounded-xl border p-4 transition" :class="launchMode === 'default' ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'">
          <div class="flex items-start gap-3">
            <input v-model="launchMode" type="radio" value="default" class="mt-1 h-4 w-4 border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-white">Default URL</p>
              <p class="mt-1 text-xs text-slate-400">Uses Chappy’s built-in start URL for this service.</p>
              <p class="mt-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 break-all">{{ tab.url }}</p>
            </div>
          </div>
        </label>

        <label class="group block cursor-pointer rounded-xl border p-4 transition" :class="launchMode === 'custom' ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'">
          <div class="flex items-start gap-3">
            <input v-model="launchMode" type="radio" value="custom" class="mt-1 h-4 w-4 border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white">Custom URL</p>
              <p class="mt-1 text-xs text-slate-400">Stores your own launch URL and uses it as the start page.</p>
              <input
                type="text"
                v-model="customLaunchUrl"
                placeholder="https://trello.com/b/..."
                class="mt-2 block w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
              <p class="mt-1 text-[11px] text-slate-500">Saved even when another launch mode is selected.</p>
            </div>
          </div>
        </label>

        <label class="group block cursor-pointer rounded-xl border p-4 transition" :class="launchMode === 'preserve' ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'">
          <div class="flex items-start gap-3">
            <input v-model="launchMode" type="radio" value="preserve" class="mt-1 h-4 w-4 border-slate-500 bg-slate-900 text-sky-500 focus:ring-sky-500">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-white">Preserve URL for launch</p>
              <p class="mt-1 text-xs text-slate-400">Reopens the last visited page for this tab. Falls back to Default if none is saved yet.</p>
              <p v-if="tab.lastUrl" class="mt-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-300 break-all">{{ tab.lastUrl }}</p>
            </div>
          </div>
        </label>
          </div>

          <p v-if="customUrlError" class="text-xs text-rose-400">{{ customUrlError }}</p>
        </div>
      </div>

      <div class="flex shrink-0 justify-end gap-3 border-t border-slate-700 p-6 sm:p-7">
        <button @click="$emit('close')" class="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" data-ref="edit-service-modal-cancel">Cancel</button>
        <button @click="saveSettings" class="service-add-button rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.65)] transition hover:opacity-90" data-ref="edit-service-modal-save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRefs, computed, watch } from 'vue';
import IconUpload from './IconUpload.vue';

const props = defineProps({
  tab: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'save', 'fetch-icon']);

const { tab } = toRefs(props);
const isCustomTab = computed(() => tab.value.iconId === 'custom');
const allowedLaunchModes = ['default', 'custom', 'preserve'];
const launchMode = ref(allowedLaunchModes.includes(tab.value.launchMode) ? tab.value.launchMode : 'default');
const customLaunchUrl = ref(tab.value.customLaunchUrl || '');
const customUrlError = ref('');
const primaryIconPath = ref(tab.value.primaryIconPath || '');
const secondaryIconPath = ref(tab.value.secondaryIconPath || '');

watch(
  () => tab.value.primaryIconPath,
  (val) => { primaryIconPath.value = val || ''; },
  { immediate: false }
);

const isValidHttpsUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const saveSettings = () => {
  customUrlError.value = '';
  const trimmedCustomLaunchUrl = customLaunchUrl.value.trim();
  if (trimmedCustomLaunchUrl && !isValidHttpsUrl(trimmedCustomLaunchUrl)) {
    customUrlError.value = 'Custom launch URL must be a valid https:// URL.';
    return;
  }
  if (launchMode.value === 'custom' && !trimmedCustomLaunchUrl) {
    customUrlError.value = 'Custom URL mode needs a valid https:// custom URL.';
    return;
  }

  emit('save', {
    id: tab.value.id,
    launchMode: launchMode.value,
    customLaunchUrl: trimmedCustomLaunchUrl,
    primaryIconPath: primaryIconPath.value || undefined,
    secondaryIconPath: secondaryIconPath.value || undefined,
  });
};
</script>

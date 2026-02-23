<template>
  <div class="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
    <aside class="w-24 border-r border-slate-800 bg-slate-900 flex flex-col items-center py-6 px-1">
      <div class="flex flex-col items-center gap-3 flex-1 w-full overflow-y-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="group relative h-14 w-14 rounded-2xl border border-slate-800 transition focus-visible:outline-none"
          :class="{
            'bg-slate-700 text-white shadow-[0_0_25px] shadow-sky-500/40': activeTabId === tab.id,
            'bg-slate-900 text-slate-400 hover:bg-slate-800': activeTabId !== tab.id
          }"
          :style="activeTabId === tab.id ? { boxShadow: `0 0 18px ${tab.color}` } : {}"
          :title="tab.title"
          @click="selectTab(tab.id)"
        >
          <span class="sr-only">{{ tab.title }}</span>
          <span class="text-lg font-semibold">{{ tab.title.slice(0, 1) }}</span>
          <span class="absolute -right-1 -top-1 h-3 w-3 rounded-full" :style="{ background: tab.color }"></span>
        </button>
      </div>
      <button
        class="mt-2 flex h-14 w-full items-center justify-center rounded-2xl border border-slate-800 bg-gradient-to-br from-violet-500/80 to-sky-500/60 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_10px_25px] shadow-violet-500/30 transition hover:opacity-90 focus-visible:outline-none"
        :class="{ 'ring-2 ring-sky-400': activeTabId === 'chappy' }"
        @click="selectTab('chappy')"
      >
        Chappy
      </button>
    </aside>

    <main class="flex-1 flex flex-col">
      <header class="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-500">Active space</p>
          <h1 class="text-2xl font-semibold text-white">{{ activeTab.title }}</h1>
          <p v-if="!activeTab.isChappy" class="text-sm text-slate-400">{{ activeTab.url }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs uppercase tracking-widest text-slate-500">Session</span>
          <span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
            {{ activeTab.isChappy ? 'Chappy controls' : 'Browser tab' }}
          </span>
        </div>
      </header>

      <section class="flex-1 flex flex-col relative overflow-hidden">
        <div v-if="activeTab.isChappy" class="flex-1 overflow-y-auto p-6">
          <div class="space-y-6">
            <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_0_20px_rgba(15,23,42,0.65)]">
              <p class="text-sm text-slate-400">
                Chappy keeps the workspace organized: tabs stay on the left rail, stacked vertically so the main
                area stays clutter-free. Every chat clients runs inside its own <span class="font-semibold text-white">webview</span>, letting you switch
                contexts without leaving the app.
              </p>
              <p class="text-sm text-slate-400">
                Use the controls below to add new platforms, re-order the rail, or pin a client as your next
                workspace.
              </p>
            </div>

            <div class="grid gap-5 lg:grid-cols-2">
              <div class="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-900/30 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
                <p class="text-xs uppercase tracking-widest text-slate-500">Tab order</p>
                <h2 class="text-lg font-semibold text-white">Arrange by importance</h2>
                <p class="text-sm text-slate-400">
                  The left rail is intentionally narrow. Use the reorder arrows below to keep your most-used chats
                  within thumb reach.
                </p>
              </div>

              <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
                <p class="text-xs uppercase tracking-widest text-slate-500">Add a new client</p>
                <h2 class="text-lg font-semibold text-white">Bring your own client</h2>
                <p class="text-sm text-slate-400">
                  Provide a name and the https:// URL for your web chat client. Chappy keeps a live list so you can
                  re-order it immediately.
                </p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.65)]">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-white">Tab library</h2>
                <span class="text-xs uppercase tracking-widest text-slate-500">Drag later</span>
              </div>
              <ul class="mt-4 space-y-3">
                <li
                  v-for="(tab, index) in tabs"
                  :key="tab.id"
                  class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div class="space-y-0.5">
                    <p class="text-sm font-semibold text-white">{{ tab.title }}</p>
                    <p class="text-xs text-slate-500">{{ tab.url }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-2 text-emerald-300 hover:bg-emerald-400/10"
                      :disabled="index === 0"
                      @click="moveTab(index, -1)"
                    >
                      ↑
                    </button>
                    <button
                      class="rounded-full border border-slate-700 px-2 text-sky-300 hover:bg-sky-400/10"
                      :disabled="index === tabs.length - 1"
                      @click="moveTab(index, 1)"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              </ul>
            </div>

            <form
              @submit.prevent="addTab"
              class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.7)]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">New tab</p>
                  <h2 class="text-xl font-semibold text-white">Create a workspace</h2>
                </div>
                <span class="text-xs font-semibold text-slate-400">{{ tabs.length }} live tabs</span>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="text-slate-300">Name</span>
                  <input
                    v-model="newTab.title"
                    type="text"
                    placeholder="Discord"
                    class="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                  <p v-if="titleError" class="text-rose-400 text-xs">{{ titleError }}</p>
                </label>
                <label class="space-y-1 text-sm">
                  <span class="text-slate-300">URL</span>
                  <input
                    v-model="newTab.url"
                    type="url"
                    placeholder="https://discord.com/app"
                    class="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                  <p v-if="urlError" class="text-rose-400 text-xs">{{ urlError }}</p>
                </label>
              </div>

              <button
                type="submit"
                class="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow-[0_15px_30px_rgba(15,23,42,0.6)]"
              >
                Add tab
              </button>
            </form>
          </div>
        </div>

        <div v-else class="flex-1 relative overflow-hidden">
          <webview
            v-if="activeTab.url"
            :key="activeTab.id"
            :src="activeTab.url"
            :partition="webviewPartition"
            :useragent="defaultUserAgent"
            allowpopups
            class="h-full w-full border-0"
          ></webview>
          <div v-else class="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
            Select a tab to open a client.
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { accentColors, defaultTabs } from './data/defaultTabs.mjs';

const tabs = ref([...defaultTabs]);
const activeTabId = ref('chappy');

const activeTab = computed(() => {
  if (activeTabId.value === 'chappy') {
    return { id: 'chappy', title: 'Chappy', isChappy: true };
  }
  return (
    tabs.value.find((tab) => tab.id === activeTabId.value) || {
      id: 'chappy',
      title: 'Chappy',
      isChappy: true
    }
  );
});

const webviewPartition = computed(() => `persist:${activeTabId.value}`);
const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

const newTab = reactive({
  title: '',
  url: ''
});

const titleError = ref('');
const urlError = ref('');

const selectTab = (id) => {
  activeTabId.value = id;
};

const isValidUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch (err) {
    return false;
  }
};

const addTab = () => {
  titleError.value = '';
  urlError.value = '';

  const trimmedTitle = newTab.title.trim();
  if (!trimmedTitle) {
    titleError.value = 'Name is required.';
    return;
  }

  if (!isValidUrl(newTab.url)) {
    urlError.value = 'A valid https:// URL pointing to the client is required.';
    return;
  }

  const baseId = trimmedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `tab-${Date.now()}`;
  let candidateId = baseId;
  let suffix = 1;
  while (tabs.value.some((tab) => tab.id === candidateId)) {
    candidateId = `${baseId}-${suffix++}`;
  }

  const color = accentColors[tabs.value.length % accentColors.length];
  tabs.value = [
    ...tabs.value,
    {
      id: candidateId,
      title: trimmedTitle,
      url: newTab.url.trim(),
      color
    }
  ];

  newTab.title = '';
  newTab.url = '';
  activeTabId.value = candidateId;
};

const moveTab = (index, direction) => {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= tabs.value.length) {
    return;
  }
  const updated = [...tabs.value];
  const [moved] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, moved);
  tabs.value = updated;
};
</script>

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
          <span class="flex h-full w-full items-center justify-center">
            <img
              v-if="resolveIcon(tab.icon)"
              :src="resolveIcon(tab.icon)"
              alt=""
              aria-hidden="true"
              class="h-10 w-10"
              loading="lazy"
              @error="handleIconError"
            />
            <span
              v-else
              class="text-lg font-semibold text-slate-200"
            >
              {{ tab.title.slice(0, 1) }}
            </span>
          </span>
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
                area stays clutter-free. Every chat client runs inside its own <span class="font-semibold text-white">webview</span>, letting you switch
                contexts without leaving the app.
              </p>
              <p class="text-sm text-slate-400">
                Your rail starts empty. Use the quick-add grid below to push a service into the rail, then reorder or
                duplicate it as needed for multiple accounts.
              </p>
            </div>

            <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Available services</p>
                  <h2 class="text-lg font-semibold text-white">Tap to add</h2>
                  <p class="text-sm text-slate-400">
                    The grid below shows curated chat and productivity services — add as many variations as you
                    need. Each addition keeps its own session partition.
                  </p>
                </div>
                <span class="text-xs font-semibold text-slate-400">Duplicates welcome</span>
              </div>
              <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article
                  v-for="service in availableServices"
                  :key="service.id"
                  class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-[0_10px_25px_rgba(2,6,23,0.7)] transition hover:border-sky-500/60"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900"
                      :style="{ borderColor: service.color }"
                    >
                      <img
                        :src="resolveIcon(service.icon)"
                        alt=""
                        aria-hidden="true"
                        class="h-8 w-8 object-contain"
                        loading="lazy"
                        @error="handleIconError"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-white">{{ service.title }}</p>
                      <p class="text-xs text-slate-400">{{ service.description }}</p>
                    </div>
                  </div>
                  <div class="mt-3 flex min-h-[36px] items-center justify-between text-xs text-slate-400">
                    <span class="truncate">{{ service.url }}</span>
                    <button
                      type="button"
                      class="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white shadow-[0_10px_25px_rgba(15,23,42,0.65)] transition hover:opacity-90"
                      @click="addService(service)"
                    >
                      Add
                    </button>
                  </div>
                </article>
              </div>
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
              <ul v-if="tabs.length" class="mt-4 space-y-3">
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
                    <button
                      class="rounded-full border border-slate-700 px-2 text-rose-300 hover:bg-rose-400/10"
                      @click="removeTab(tab.id)"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              </ul>
              <div v-else class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
                No chat services are configured yet. Use the quick-add panel above or the form below to install a client.
              </div>
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { accentColors, serviceCatalog } from './data/serviceCatalog.mjs';
import defaultIconUrl from './assets/icons/custom.svg?url';

const CONFIG_VERSION = 1;
const defaultIcon = defaultIconUrl;
const availableServices = serviceCatalog;
const tabs = ref([]);
const activeTabId = ref('chappy');
const hasLoadedConfig = ref(false);
const chappyApi = typeof window !== 'undefined' ? window.chappy : null;

const iconById = availableServices.reduce(
  (accumulator, service) => {
    accumulator[service.id] = service.icon || defaultIcon;
    return accumulator;
  },
  { custom: defaultIcon }
);

const sanitizeToken = (value, fallback = 'tab') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const generateTabId = (hint = 'tab') => `${sanitizeToken(hint, 'tab')}-${suffix()}`;
const generatePartitionKey = (hint = 'tab') => `sandbox-${sanitizeToken(hint, 'tab')}-${suffix()}`;

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

const resolveIconById = (iconId) => iconById[iconId] || defaultIcon;
const resolveIcon = (icon) => icon || defaultIcon;

const ensureUniqueTabId = (seed) => {
  let candidate = sanitizeToken(seed, 'tab');
  if (!tabs.value.some((tab) => tab.id === candidate)) {
    return candidate;
  }
  do {
    candidate = generateTabId(seed);
  } while (tabs.value.some((tab) => tab.id === candidate));
  return candidate;
};

const ensureUniquePartition = (seed) => {
  let candidate = sanitizeToken(seed, 'sandbox-tab');
  if (!tabs.value.some((tab) => tab.partition === candidate)) {
    return candidate;
  }
  do {
    candidate = generatePartitionKey(seed);
  } while (tabs.value.some((tab) => tab.partition === candidate));
  return candidate;
};

const sanitizeColor = (value, fallback) =>
  typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : fallback;

const hydrateTab = (inputTab, index) => {
  if (!inputTab || typeof inputTab !== 'object') {
    return null;
  }

  const title = typeof inputTab.title === 'string' ? inputTab.title.trim() : '';
  const url = typeof inputTab.url === 'string' ? inputTab.url.trim() : '';
  if (!title || !isValidHttpsUrl(url)) {
    return null;
  }

  const idSeed = typeof inputTab.id === 'string' && inputTab.id.trim() ? inputTab.id : `tab-${index + 1}`;
  const id = ensureUniqueTabId(idSeed);
  const partitionSeed =
    typeof inputTab.partition === 'string' && inputTab.partition.trim()
      ? inputTab.partition
      : `sandbox-${id}`;
  const partition = ensureUniquePartition(partitionSeed);
  const iconId = sanitizeToken(inputTab.iconId, 'custom');
  const color = sanitizeColor(inputTab.color, accentColors[index % accentColors.length]);

  return {
    id,
    title,
    url,
    color,
    iconId,
    icon: resolveIconById(iconId),
    partition
  };
};

const serializeTab = (tab) => ({
  id: tab.id,
  title: tab.title,
  url: tab.url,
  color: tab.color,
  iconId: tab.iconId || 'custom',
  partition: tab.partition || `sandbox-${tab.id}`
});

const persistConfig = async () => {
  if (!hasLoadedConfig.value || typeof chappyApi?.saveConfig !== 'function') {
    return;
  }
  try {
    await chappyApi.saveConfig({
      version: CONFIG_VERSION,
      activeTabId: activeTabId.value,
      tabs: tabs.value.map(serializeTab)
    });
  } catch (error) {
    console.error('Failed to save Chappy config.', error);
  }
};

const loadConfig = async () => {
  if (typeof chappyApi?.loadConfig !== 'function') {
    hasLoadedConfig.value = true;
    return;
  }

  try {
    const persisted = await chappyApi.loadConfig();
    const restoredTabs = [];
    const inputTabs = Array.isArray(persisted?.tabs) ? persisted.tabs : [];
    inputTabs.forEach((tab, index) => {
      const normalized = hydrateTab(tab, index);
      if (normalized) {
        restoredTabs.push(normalized);
      }
    });

    tabs.value = restoredTabs;

    const candidateActive = typeof persisted?.activeTabId === 'string' ? persisted.activeTabId : 'chappy';
    if (candidateActive === 'chappy' || restoredTabs.some((tab) => tab.id === candidateActive)) {
      activeTabId.value = candidateActive;
    } else {
      activeTabId.value = 'chappy';
    }
  } catch (error) {
    console.error('Failed to load Chappy config.', error);
  } finally {
    hasLoadedConfig.value = true;
  }
};

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

const webviewPartition = computed(() => {
  if (activeTab.value.isChappy) {
    return 'persist:chappy';
  }
  return `persist:${activeTab.value.partition || activeTab.value.id}`;
});

const defaultUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

const newTab = reactive({
  title: '',
  url: ''
});

const titleError = ref('');
const urlError = ref('');

const handleIconError = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) {
    return;
  }
  if (target.dataset.iconFallbackApplied === '1') {
    return;
  }
  target.dataset.iconFallbackApplied = '1';
  target.src = defaultIcon;
};

const selectTab = (id) => {
  activeTabId.value = id;
};

const addService = (service) => {
  const id = ensureUniqueTabId(generateTabId(service.id));
  const partition = ensureUniquePartition(generatePartitionKey(service.id));
  tabs.value = [
    ...tabs.value,
    {
      id,
      title: service.title,
      url: service.url,
      color: service.color,
      iconId: service.id,
      icon: resolveIconById(service.id),
      partition
    }
  ];
  activeTabId.value = id;
};

const addTab = () => {
  titleError.value = '';
  urlError.value = '';

  const trimmedTitle = newTab.title.trim();
  if (!trimmedTitle) {
    titleError.value = 'Name is required.';
    return;
  }

  const trimmedUrl = newTab.url.trim();
  if (!isValidHttpsUrl(trimmedUrl)) {
    urlError.value = 'A valid https:// URL pointing to the client is required.';
    return;
  }

  const id = ensureUniqueTabId(trimmedTitle || 'custom');
  const partition = ensureUniquePartition(generatePartitionKey(trimmedTitle || 'custom'));
  const color = accentColors[tabs.value.length % accentColors.length];

  tabs.value = [
    ...tabs.value,
    {
      id,
      title: trimmedTitle,
      url: trimmedUrl,
      color,
      iconId: 'custom',
      icon: resolveIconById('custom'),
      partition
    }
  ];

  newTab.title = '';
  newTab.url = '';
  activeTabId.value = id;
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

const removeTab = (id) => {
  tabs.value = tabs.value.filter((tab) => tab.id !== id);
  if (activeTabId.value === id) {
    activeTabId.value = 'chappy';
  }
};

watch([tabs, activeTabId], () => {
  void persistConfig();
}, { deep: true });
onMounted(() => {
  void loadConfig();
});
</script>

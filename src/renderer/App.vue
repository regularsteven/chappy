<template>
  <div
    id="chappy-app-shell"
    class="app-shell flex h-screen overflow-hidden bg-slate-950 text-slate-200"
    :data-theme="effectiveTheme"
  >
    <aside
      id="service-sidebar"
      class="sidebar-panel flex w-28 flex-col items-center border-r border-slate-800 bg-slate-900 px-2 pb-6"
    >
      <div
        id="service-tab-list"
        class="flex w-full flex-1 flex-col items-center gap-3 overflow-y-auto overflow-x-visible pt-4 pb-2"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :id="`service-tab-button-${tab.id}`"
          class="service-tab-button group relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-800 p-2.5 transition focus-visible:outline-none"
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
              class="service-tab-icon h-8 w-8 object-contain"
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
        </button>
      </div>
      <button
        id="chappy-tab-button"
        title="Chappy"
        class="service-tab-button chappy-tab-button mt-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-800 p-2.5 transition focus-visible:outline-none"
        :class="{
          'bg-slate-700 text-white shadow-[0_0_25px] shadow-sky-500/40 ring-2 ring-sky-400': activeTabId === 'chappy',
          'bg-slate-900 text-slate-400 hover:bg-slate-800': activeTabId !== 'chappy'
        }"
        :style="activeTabId === 'chappy' ? { boxShadow: '0 0 18px rgba(56, 189, 248, 0.65)' } : {}"
        @click="selectTab('chappy')"
      >
        <span class="sr-only">Chappy</span>
        <span class="chappy-tab-icon-shell flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white p-1">
          <img
            :src="chappyLogoUrl"
            alt=""
            aria-hidden="true"
            class="service-tab-icon chappy-tab-icon h-full w-full object-contain"
            loading="lazy"
          />
        </span>
      </button>
    </aside>

    <main id="chappy-main" class="main-content flex flex-1 flex-col">
      <header
        v-if="activeTab.isChappy"
        id="chappy-header"
        class="chappy-header flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <img
            :src="chappyLogoUrl"
            alt="Chappy logo"
            class="h-8 w-8 rounded-xl border border-white/30 bg-white p-1 object-contain"
          />
          <div>
            <h1 class="text-2xl font-semibold text-white">Chappy</h1>
          </div>
        </div>
        <fieldset
          id="chappy-theme-toggle"
          class="theme-toggle inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1"
          aria-label="Theme preference"
        >
          <legend class="sr-only">Theme preference</legend>
          <label
            v-for="option in themePreferenceOptions"
            :key="option.value"
            class="theme-toggle-option cursor-pointer"
            :for="`chappy-theme-${option.value}`"
          >
            <input
              :id="`chappy-theme-${option.value}`"
              v-model="themePreference"
              type="radio"
              name="chappy-theme"
              :value="option.value"
              class="peer sr-only"
            />
            <span
              class="block rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
              :class="
                themePreference === option.value
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
            >
              {{ option.label }}
            </span>
          </label>
        </fieldset>
      </header>

      <section id="workspace-content" class="workspace-content relative flex flex-1 flex-col overflow-hidden">
        <div v-if="activeTab.isChappy" id="chappy-tab-view" class="chappy-tab-view flex-1 overflow-y-auto p-6">
          <div id="chappy-subtab-menu" class="mb-6 inline-flex rounded-2xl border border-slate-800 bg-slate-900/70 p-1">
            <button
              id="chappy-subtab-your-chappy"
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="
                chappyWorkspaceTab === 'your-chappy'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
              @click="setChappyWorkspaceTab('your-chappy')"
            >
              Your Chappy
            </button>
            <button
              id="chappy-subtab-configure"
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="
                chappyWorkspaceTab === 'configure'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
              @click="setChappyWorkspaceTab('configure')"
            >
              Configure
            </button>
          </div>

          <div v-if="chappyWorkspaceTab === 'your-chappy'" id="your-chappy-view" class="space-y-6">
            <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Your Chappy</p>
                  <h2 class="text-lg font-semibold text-white">Manage your workspace tabs</h2>
                </div>
                <button
                  id="go-to-configure-link"
                  type="button"
                  class="rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-sky-200 transition hover:bg-sky-500/20"
                  @click="setChappyWorkspaceTab('configure')"
                >
                  Configure
                </button>
              </div>
            </div>

            <div id="tab-library-panel" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.65)]">
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
                    <p class="text-xs text-slate-500">Default: {{ tab.url }}</p>
                    <p v-if="tab.customLaunchUrl" class="text-xs text-sky-400">
                      Custom launch: {{ tab.customLaunchUrl }}
                    </p>
                    <p v-if="tab.lastUrl" class="text-xs text-emerald-400">
                      Last visited: {{ tab.lastUrl }}
                    </p>
                    <p class="text-[11px] uppercase tracking-widest text-slate-500">
                      Launch mode: {{ launchModeLabel(tab.launchMode) }}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-2 text-gray-300 hover:bg-gray-400/10"
                      @click="openSettings(tab)"
                    >
                      ⚙️
                    </button>
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
                No chat services are configured yet. Use Configure to add your first client.
              </div>
            </div>
          </div>

          <div v-else id="configure-view" class="space-y-6">
            <div id="service-catalog-panel" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Available services</p>
                  <h2 class="text-lg font-semibold text-white">Tap to add</h2>
                  <p class="text-sm text-slate-400">
                    The grid below shows curated chat and productivity services — add as many variations as you
                    need. Each addition keeps its own session partition.
                  </p>
                </div>
              </div>
              <div id="available-services-grid" class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article
                  v-for="service in availableServices"
                  :key="service.id"
                  :id="`available-service-${service.id}`"
                  class="service-card flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-[0_10px_25px_rgba(2,6,23,0.7)] transition hover:border-sky-500/60"
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

            <form
              id="custom-tab-form"
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

        <div v-else id="service-webview-panel" class="relative flex-1 overflow-hidden">
          <webview
            id="service-webview"
            ref="webviewRef"
            v-if="activeTabLaunchUrl"
            :key="activeTab.id"
            :src="activeTabLaunchUrl"
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
    <SettingsModal
      v-if="isSettingsModalOpen"
      :tab="editingTab"
      @close="closeSettingsModal"
      @save="handleSaveSettings"
    />
  </div>
</template>

<script setup>
import SettingsModal from './components/SettingsModal.vue';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { accentColors, serviceCatalog } from './data/serviceCatalog.mjs';
import defaultIconUrl from './assets/icons/custom.svg?url';
import chappyLogoUrl from '../../resources/chappy-logo.svg?url';

const isSettingsModalOpen = ref(false);
const editingTab = ref(null);


const webviewRef = ref(null);
const CONFIG_VERSION = 1;
const defaultIcon = defaultIconUrl;
const availableServices = serviceCatalog;
const tabs = ref([]);
const activeTabId = ref('chappy');
const chappyWorkspaceTab = ref('your-chappy');
const hasLoadedConfig = ref(false);
const chappyApi = typeof window !== 'undefined' ? window.chappy : null;
const themePreferenceOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
const themePreferenceValues = new Set(themePreferenceOptions.map((option) => option.value));
const normalizeThemePreference = (value) => (themePreferenceValues.has(value) ? value : 'system');
const themePreference = ref('system');
const systemPrefersDark = ref(true);

const iconById = availableServices.reduce(
  (accumulator, service) => {
    accumulator[service.id] = service.icon || defaultIcon;
    return accumulator;
  },
  { custom: defaultIcon }
);
const serviceDefaultUrlById = availableServices.reduce(
  (accumulator, service) => {
    accumulator[service.id] = service.url;
    return accumulator;
  },
  {}
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

const normalizeHttpsUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return isValidHttpsUrl(trimmed) ? trimmed : '';
};

const launchModeOptions = ['default', 'custom', 'preserve'];
const isLaunchMode = (value) => launchModeOptions.includes(value);

const resolveIconById = (iconId) => iconById[iconId] || defaultIcon;
const resolveIcon = (icon) => icon || defaultIcon;
const effectiveTheme = computed(() =>
  themePreference.value === 'system'
    ? systemPrefersDark.value
      ? 'dark'
      : 'light'
    : themePreference.value
);

const prefersDarkMediaQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

const handleSystemThemeChange = (event) => {
  if (typeof event?.matches === 'boolean') {
    systemPrefersDark.value = event.matches;
    return;
  }
  systemPrefersDark.value = prefersDarkMediaQuery ? prefersDarkMediaQuery.matches : true;
};

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
  const persistedUrl = normalizeHttpsUrl(inputTab.url);
  if (!title || !persistedUrl) {
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
  const serviceDefaultUrl = normalizeHttpsUrl(serviceDefaultUrlById[iconId]);
  const lastUrl = normalizeHttpsUrl(inputTab.lastUrl);

  let url = persistedUrl;
  let customLaunchUrl = normalizeHttpsUrl(inputTab.customLaunchUrl);
  const hasExplicitLaunchMode = isLaunchMode(inputTab.launchMode);
  let launchMode = hasExplicitLaunchMode
    ? inputTab.launchMode
    : inputTab.preserveUrl === true
      ? 'preserve'
      : inputTab.useCustomLaunchUrl === true
        ? 'custom'
        : 'default';

  // Curated services keep application-defined defaults. Legacy `url` overrides migrate to custom launch.
  if (serviceDefaultUrl) {
    url = serviceDefaultUrl;
    if (persistedUrl !== serviceDefaultUrl && !customLaunchUrl) {
      customLaunchUrl = persistedUrl;
      if (!hasExplicitLaunchMode && inputTab.preserveUrl !== true && inputTab.useCustomLaunchUrl !== true) {
        launchMode = 'custom';
      }
    }
  }

  if (!isLaunchMode(launchMode)) {
    launchMode = 'default';
  }
  if (launchMode === 'custom' && !customLaunchUrl) {
    launchMode = 'default';
  }
  if (!isValidHttpsUrl(url)) {
    return null;
  }

  return {
    id,
    title,
    url,
    color,
    iconId,
    icon: resolveIconById(iconId),
    partition,
    customLaunchUrl,
    launchMode,
    lastUrl,
  };
};

const serializeTab = (tab) => ({
  id: tab.id,
  title: tab.title,
  url: tab.url,
  color: tab.color,
  iconId: tab.iconId || 'custom',
  partition: tab.partition || `sandbox-${tab.id}`,
  customLaunchUrl: normalizeHttpsUrl(tab.customLaunchUrl),
  launchMode: isLaunchMode(tab.launchMode) ? tab.launchMode : 'default',
  lastUrl: normalizeHttpsUrl(tab.lastUrl),
});

const persistConfig = async () => {
  if (!hasLoadedConfig.value || typeof chappyApi?.saveConfig !== 'function') {
    return;
  }
  try {
    await chappyApi.saveConfig({
      version: CONFIG_VERSION,
      activeTabId: activeTabId.value,
      themePreference: themePreference.value,
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
    themePreference.value = normalizeThemePreference(persisted?.themePreference);
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
  const tab = tabs.value.find((tab) => tab.id === activeTabId.value);
  if (tab) {
    return tab;
  }
  return {
    id: 'chappy',
    title: 'Chappy',
    isChappy: true,
  };
});

const resolveLaunchUrl = (tab) => {
  if (!tab || tab.isChappy) {
    return '';
  }
  if (tab.launchMode === 'preserve') {
    return tab.lastUrl || tab.url;
  }
  if (tab.launchMode === 'custom') {
    return tab.customLaunchUrl || tab.url;
  }
  return tab.url;
};

const activeTabLaunchUrl = computed(() => resolveLaunchUrl(activeTab.value));
const launchModeLabel = (launchMode) =>
  launchMode === 'custom' ? 'Custom URL' : launchMode === 'preserve' ? 'Preserve Last URL' : 'Default URL';

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

const updateTabById = (id, updater) => {
  const tabIndex = tabs.value.findIndex((tab) => tab.id === id);
  if (tabIndex === -1) {
    return;
  }
  const currentTab = tabs.value[tabIndex];
  const nextTab = updater(currentTab);
  if (!nextTab || nextTab === currentTab) {
    return;
  }
  const updatedTabs = [...tabs.value];
  updatedTabs[tabIndex] = nextTab;
  tabs.value = updatedTabs;
};

const persistLastUrlForTab = (tabId, candidateUrl) => {
  const normalizedUrl = normalizeHttpsUrl(candidateUrl);
  if (!normalizedUrl) {
    return;
  }
  updateTabById(tabId, (tab) => {
    if (tab.lastUrl === normalizedUrl) {
      return tab;
    }
    return {
      ...tab,
      lastUrl: normalizedUrl,
    };
  });
};

const captureActiveWebviewUrl = () => {
  if (activeTabId.value === 'chappy') {
    return;
  }
  const webview = webviewRef.value;
  if (!webview || typeof webview.getURL !== 'function') {
    return;
  }
  persistLastUrlForTab(activeTabId.value, webview.getURL());
};

const selectTab = (id) => {
  if (id === activeTabId.value) {
    return;
  }
  captureActiveWebviewUrl();
  activeTabId.value = id;
};

const setChappyWorkspaceTab = (value) => {
  chappyWorkspaceTab.value = value === 'configure' ? 'configure' : 'your-chappy';
};

const openSettings = (tab) => {
  editingTab.value = tab;
  isSettingsModalOpen.value = true;
};

const closeSettingsModal = () => {
  isSettingsModalOpen.value = false;
  editingTab.value = null;
};

const handleSaveSettings = (updatedTab) => {
  const normalizedCustomLaunchUrl = normalizeHttpsUrl(updatedTab.customLaunchUrl);
  const launchMode = isLaunchMode(updatedTab.launchMode) ? updatedTab.launchMode : 'default';
  updateTabById(updatedTab.id, (tab) => ({
    ...tab,
    customLaunchUrl: normalizedCustomLaunchUrl,
    launchMode: launchMode === 'custom' && !normalizedCustomLaunchUrl ? 'default' : launchMode,
  }));
  closeSettingsModal();
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
      partition,
      customLaunchUrl: '',
      launchMode: 'default',
      lastUrl: '',
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
      partition,
      customLaunchUrl: '',
      launchMode: 'default',
      lastUrl: '',
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

watch([tabs, activeTabId, themePreference], () => {
  void persistConfig();
}, { deep: true });
const handleWebViewNavigation = (event) => {
  if (activeTabId.value === 'chappy') {
    return;
  }
  persistLastUrlForTab(activeTabId.value, event?.url);
};

watch(webviewRef, (newWebview, oldWebview) => {
  if (oldWebview) {
    oldWebview.removeEventListener('did-navigate', handleWebViewNavigation);
    oldWebview.removeEventListener('did-navigate-in-page', handleWebViewNavigation);
  }
  if (newWebview) {
    newWebview.addEventListener('did-navigate', handleWebViewNavigation);
    newWebview.addEventListener('did-navigate-in-page', handleWebViewNavigation);
    captureActiveWebviewUrl();
  }
});

onMounted(() => {
  handleSystemThemeChange();
  if (prefersDarkMediaQuery) {
    if (typeof prefersDarkMediaQuery.addEventListener === 'function') {
      prefersDarkMediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof prefersDarkMediaQuery.addListener === 'function') {
      prefersDarkMediaQuery.addListener(handleSystemThemeChange);
    }
  }
  void loadConfig();
});

onBeforeUnmount(() => {
  if (!prefersDarkMediaQuery) {
    return;
  }
  if (typeof prefersDarkMediaQuery.removeEventListener === 'function') {
    prefersDarkMediaQuery.removeEventListener('change', handleSystemThemeChange);
  } else if (typeof prefersDarkMediaQuery.removeListener === 'function') {
    prefersDarkMediaQuery.removeListener(handleSystemThemeChange);
  }
});

</script>

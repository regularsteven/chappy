<template>
  <div
    id="chappy-app-shell"
    class="app-shell flex h-screen overflow-hidden bg-slate-950 text-slate-200"
    :data-theme="effectiveTheme"
    :data-display="displayMode"
  >
    <aside
      id="service-sidebar"
      class="sidebar-panel flex w-28 flex-col items-center border-r border-slate-800 bg-slate-900 px-2 pb-6"
      :class="{ 'sidebar-panel--hidden': isServicesMenuHidden }"
      :inert="isServicesMenuHidden || undefined"
      :aria-hidden="isServicesMenuHidden ? 'true' : undefined"
      @pointerdown="keepServicesMenuRevealed"
    >
      <div
        id="service-tab-list"
        class="flex w-full flex-1 flex-col items-center gap-3 overflow-y-auto overflow-x-visible pt-4 pb-2"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :id="`service-tab-button-${tab.id}`"
          class="service-tab-button group relative flex shrink-0 items-center justify-center rounded-2xl border border-slate-800 transition focus-visible:outline-none"
          :class="{
            'bg-slate-700 text-white shadow-[0_0_25px] shadow-sky-500/40': activeTabId === tab.id,
            'bg-slate-900 text-slate-400 hover:bg-slate-800': activeTabId !== tab.id
          }"
          :style="activeTabId === tab.id ? { boxShadow: `0 0 18px ${tab.color}` } : {}"
          :title="tab.title"
          @click="selectTab(tab.id)"
        >
          <span class="sr-only">{{ tab.title }}</span>
          <span class="relative flex h-full w-full items-center justify-center" data-ref="service-tab-icon-wrap">
            <img
              v-if="resolveIcon(tab.icon)"
              :src="resolveIcon(tab.icon)"
              alt=""
              aria-hidden="true"
              class="service-tab-icon object-contain"
              data-ref="service-tab-primary-icon"
              loading="lazy"
              @error="handleIconError"
            />
            <img
              v-if="tab.secondaryIconPath"
              :src="`chappy-icon://local/${tab.secondaryIconPath}`"
              alt=""
              aria-hidden="true"
              class="tab-secondary-icon-badge absolute left-[2.25rem] top-[2.25rem] h-5 w-5 rounded object-cover"
              data-ref="service-tab-secondary-icon"
              loading="lazy"
            />
            <span
              v-else-if="!resolveIcon(tab.icon)"
              class="text-lg font-semibold text-slate-200"
            >
              {{ tab.title.slice(0, 1) }}
            </span>
          </span>
          <span
            v-if="tabHasUnread(tab.id)"
            class="notification-badge pointer-events-none absolute -right-1 -top-1 flex items-center justify-center rounded-full border border-slate-950 bg-rose-500 text-[10px] font-semibold leading-none"
            :class="tabUnreadCount(tab.id) === null ? 'h-3 w-3' : 'h-5 min-w-[1.2rem] px-1'"
          >
            <template v-if="tabUnreadCount(tab.id) !== null">
              {{ formatUnreadCount(tabUnreadCount(tab.id)) }}
            </template>
          </span>
        </button>
      </div>
      <button
        id="chappy-tab-button"
        :title="chappyTabButtonLabel"
        :aria-expanded="isMirrorMode ? String(isChappyViewVisible) : undefined"
        class="service-tab-button chappy-tab-button mt-2 flex shrink-0 items-center justify-center rounded-2xl border border-slate-800 transition focus-visible:outline-none"
        :class="{
          'bg-slate-700 text-white shadow-[0_0_25px] shadow-sky-500/40 ring-2 ring-sky-400': isChappyViewVisible,
          'bg-slate-900 text-slate-400 hover:bg-slate-800': !isChappyViewVisible
        }"
        :style="isChappyViewVisible ? { boxShadow: '0 0 18px rgba(56, 189, 248, 0.65)' } : {}"
        @click="toggleChappyPanel"
      >
        <span class="sr-only">{{ chappyTabButtonLabel }}</span>
        <span class="chappy-tab-icon-shell flex items-center justify-center rounded-xl border border-white/30 bg-white">
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
        v-if="isChappyViewVisible"
        id="chappy-header"
        class="chappy-header flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <img
            :src="chappyLogoUrl"
            alt="Chappy logo"
            class="chappy-header-logo h-8 w-8 rounded-xl border border-white/30 bg-white p-1 object-contain"
          />
          <div>
            <h1 class="text-2xl font-semibold text-white">Chappy</h1>
          </div>
        </div>
        <div class="flex items-center gap-3">
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
          <button
            v-if="isMirrorMode"
            id="chappy-hide-button"
            type="button"
            title="Hide Chappy and show the mirror"
            class="hide-chappy-button inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:bg-slate-800 hover:text-white"
            @click="hideChappyPanel"
          >
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.3 3.2" />
              <path d="M6.6 6.7C4.2 8.2 3 10.4 3 12c0 2.5 4 7 9 7a9.7 9.7 0 0 0 4.3-1" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </svg>
            Hide
          </button>
        </div>
      </header>

      <section id="workspace-content" class="workspace-content relative flex flex-1 flex-col overflow-hidden">
        <div v-show="isChappyViewVisible" id="chappy-tab-view" class="chappy-tab-view flex-1 overflow-y-auto p-6">
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
            <button
              id="chappy-subtab-widgets"
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="[
                chappyWorkspaceTab === 'widgets'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                isMirrorMode ? '' : 'opacity-60'
              ]"
              @click="setChappyWorkspaceTab('widgets')"
            >
              Widgets
            </button>
            <button
              id="chappy-subtab-settings"
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="
                chappyWorkspaceTab === 'settings'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              "
              @click="setChappyWorkspaceTab('settings')"
            >
              Settings
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
                <span class="text-xs uppercase tracking-widest text-slate-500">Change Order</span>
              </div>
              <ul v-if="tabs.length" class="mt-4 space-y-3">
                <li
                  v-for="(tab, index) in tabs"
                  :key="tab.id"
                  class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                  :data-ref="`tab-library-item-${tab.id}`"
                >
                  <div class="flex items-start gap-3">
                    <div class="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-visible rounded-xl border border-slate-800 bg-slate-900" data-ref="tab-library-icon-wrap">
                      <img
                        :src="tab.icon"
                        alt=""
                        class="h-8 w-8 object-contain"
                        data-ref="tab-library-primary-icon"
                        loading="lazy"
                        @error="handleIconError"
                      >
                      <img
                        v-if="tab.secondaryIconPath"
                        :src="`chappy-icon://local/${tab.secondaryIconPath}`"
                        alt=""
                        class="tab-secondary-icon-badge absolute -bottom-1 -right-1 h-4 w-4 rounded object-cover"
                        data-ref="tab-library-secondary-icon"
                        loading="lazy"
                      >
                    </div>
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
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="rounded-full border border-slate-700 px-2 text-gray-300 hover:bg-gray-400/10"
                      data-ref="tab-library-edit-button"
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

            <div id="widget-library-panel" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.65)]">
              <div class="flex items-center justify-between gap-4">
                <h2 class="text-lg font-semibold text-white">Widgets</h2>
                <button
                  id="go-to-widgets-link"
                  type="button"
                  class="rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-sky-200 transition hover:bg-sky-500/20"
                  @click="setChappyWorkspaceTab('widgets')"
                >
                  Add widgets
                </button>
              </div>
              <p v-if="!isMirrorMode" class="mt-3 text-sm text-slate-400">
                Enable Mirror display to use widgets.
              </p>
              <ul v-if="mirrorWidgets.length" class="mt-4 space-y-3">
                <li
                  v-for="widget in mirrorWidgets"
                  :key="widget.id"
                  class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                  :data-ref="`widget-library-item-${widget.id}`"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
                      <img
                        :src="widgetInstanceIcon(widget)"
                        alt=""
                        class="h-8 w-8 object-contain"
                        loading="lazy"
                        @error="handleIconError"
                      >
                    </div>
                    <div class="space-y-0.5">
                      <p class="text-sm font-semibold text-white">{{ widgetInstanceLabel(widget) }}</p>
                      <p class="text-xs text-slate-500">{{ widgetInstanceDetail(widget) }}</p>
                    </div>
                  </div>
                  <button
                    class="rounded-full border border-slate-700 px-2 text-rose-300 hover:bg-rose-400/10"
                    data-ref="widget-library-remove-button"
                    @click="removeMirrorWidget(widget.id)"
                  >
                    ✕
                  </button>
                </li>
              </ul>
              <div v-else-if="isMirrorMode" class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
                No widgets on your mirror yet. Add clocks, weather, and more from the Widgets tab.
              </div>
            </div>
          </div>

          <div v-else-if="chappyWorkspaceTab === 'configure'" id="configure-view" class="space-y-6">
            <div id="service-catalog-panel" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Available services</p>
                  <h2 class="text-lg font-semibold text-white">Tap to add</h2>
                  <p class="text-sm text-slate-400">
                    The grid below shows curated chat, social, AI, and productivity services — add as many variations as you
                    need. Each addition keeps its own session partition.
                  </p>
                </div>
                <div id="quick-add-section" class="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Add</span>
                  <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                    <div class="relative">
                      <input
                        id="quick-add-input"
                        v-model="quickAddUrl"
                        type="text"
                        placeholder="Search, or discord.com / https://..."
                        aria-label="Search services or enter a URL"
                        class="w-full min-w-[14rem] rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-3 pr-8 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                        @input="quickAddError = ''"
                        @keydown.enter.prevent="quickAdd"
                        @keydown.esc.prevent="clearQuickAdd"
                      />
                      <button
                        v-if="quickAddUrl"
                        id="quick-add-clear"
                        type="button"
                        aria-label="Clear search"
                        title="Clear"
                        class="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white"
                        @click="clearQuickAdd"
                      >
                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      class="quick-add-button shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition hover:opacity-90"
                      @click="quickAdd"
                    >
                      Add
                    </button>
                  </div>
                  <p v-if="quickAddError" class="text-rose-400 text-xs">{{ quickAddError }}</p>
                </div>
              </div>
              
              <!-- Taxonomy Filter Bar -->
              <div id="taxonomy-filter-bar" class="mt-4 flex flex-wrap items-center gap-3">
                <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Filter:</span>
                
                <!-- Show All toggle -->
                <label
                  class="taxonomy-checkbox inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                  :class="selectedTaxonomies.size === 0 
                    ? 'border-sky-500 bg-sky-500/20 text-sky-400' 
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'"
                >
                  <input
                    type="checkbox"
                    :checked="selectedTaxonomies.size === 0"
                    class="hidden"
                    @change="clearTaxonomyFilters"
                  />
                  <span class="flex h-4 w-4 items-center justify-center rounded">
                    <svg v-if="selectedTaxonomies.size === 0" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </span>
                  Show All
                </label>
                
                <!-- Taxonomy checkboxes -->
                <label
                  v-for="(taxonomy, key) in taxonomies"
                  :key="key"
                  class="taxonomy-checkbox inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                  :class="selectedTaxonomies.has(key) 
                    ? 'border-sky-500 bg-sky-500/20 text-sky-400' 
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'"
                >
                  <input
                    type="checkbox"
                    :checked="selectedTaxonomies.has(key)"
                    class="hidden"
                    @change="toggleTaxonomy(key)"
                  />
                  <span 
                    class="flex h-4 w-4 items-center justify-center rounded border transition"
                    :class="selectedTaxonomies.has(key) ? 'border-sky-500 bg-sky-500' : 'border-slate-600'"
                  >
                    <svg v-if="selectedTaxonomies.has(key)" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </span>
                  <span 
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: taxonomy.color }"
                  ></span>
                  {{ taxonomy.label }}
                </label>
              </div>
              
              <div id="available-services-grid" class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article
                  v-for="service in filteredServices"
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
                      <div v-if="service.taxonomies" class="mt-1.5 flex flex-wrap gap-1">
                        <span 
                          v-for="taxonomyKey in service.taxonomies" 
                          :key="taxonomyKey"
                          class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          :style="{ 
                            borderColor: taxonomies[taxonomyKey]?.color || '#64748b',
                            color: taxonomies[taxonomyKey]?.color || '#94a3b8',
                            backgroundColor: (taxonomies[taxonomyKey]?.color || '#64748b') + '15'
                          }"
                        >
                          <span 
                            class="h-1.5 w-1.5 rounded-full"
                            :style="{ backgroundColor: taxonomies[taxonomyKey]?.color || '#64748b' }"
                          ></span>
                          {{ taxonomies[taxonomyKey]?.label || taxonomyKey }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3 flex min-h-[36px] items-center justify-between text-xs text-slate-400">
                    <span class="truncate">{{ service.url }}</span>
                    <button
                      type="button"
                      class="service-add-button rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest shadow-[0_10px_25px_rgba(15,23,42,0.65)] transition hover:opacity-90"
                      @click="addService(service)"
                    >
                      {{ serviceAddLabel(service.id) }}
                    </button>
                  </div>
                </article>
              </div>
              <p
                v-if="filteredServices.length === 0"
                id="available-services-empty"
                class="mt-5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400"
              >
                <template v-if="quickAddQuery">
                  No services match “{{ quickAddQuery }}”. Press Add to open it as a custom tab, or clear the search.
                </template>
                <template v-else>
                  No services match the selected filters.
                </template>
              </p>
            </div>

            <div id="configure-widgets-panel" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Widgets</p>
                  <h2 class="text-lg font-semibold text-white">Mirror canvas widgets</h2>
                  <p class="text-sm text-slate-400">
                    <template v-if="isMirrorMode">
                      Lightweight cards that float on the Mirror canvas. Install more from the Widgets tab.
                    </template>
                    <template v-else>
                      Enable Mirror display to use widgets.
                    </template>
                  </p>
                </div>
                <button
                  id="configure-open-widgets-link"
                  type="button"
                  class="shrink-0 rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-sky-200 transition hover:bg-sky-500/20"
                  @click="setChappyWorkspaceTab('widgets')"
                >
                  Open Widgets
                </button>
              </div>
              <WidgetCatalog
                class="mt-4"
                :entries="widgetCatalogEntries"
                :show-filters="false"
                :add-enabled="isMirrorMode"
                :counts="widgetCountById"
                @add="addWidgetFromCatalog"
                @uninstall="uninstallWidget"
              />
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
                    placeholder="discord.com or https://..."
                    class="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                  <p v-if="urlError" class="text-rose-400 text-xs">{{ urlError }}</p>
                </label>
              </div>

              <button
                type="submit"
                class="add-tab-button mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 py-2 text-sm font-semibold uppercase tracking-widest shadow-[0_15px_30px_rgba(15,23,42,0.6)]"
              >
                Add tab
              </button>
            </form>
          </div>

          <div v-else-if="chappyWorkspaceTab === 'widgets'" id="widgets-view" class="space-y-6">
            <div
              v-if="!isMirrorMode"
              id="widgets-disabled-panel"
              class="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center shadow-[0_20px_40px_rgba(2,6,23,0.7)]"
            >
              <p class="text-xs uppercase tracking-widest text-slate-500">Widgets</p>
              <h2 class="mt-2 text-lg font-semibold text-white">Enable Mirror display to use widgets</h2>
              <p class="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Widgets float on the Mirror canvas alongside your services. Switch the layout mode to
                Mirror and this tab lights up.
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  id="enable-mirror-from-widgets"
                  type="button"
                  class="rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white transition hover:opacity-90"
                  @click="enableMirrorMode"
                >
                  Enable Mirror display
                </button>
                <button
                  type="button"
                  class="rounded-2xl border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                  @click="setChappyWorkspaceTab('settings')"
                >
                  Open Settings
                </button>
              </div>
            </div>

            <template v-else>
              <div id="widget-catalog-panel" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500">Available widgets</p>
                    <h2 class="text-lg font-semibold text-white">Tap to add</h2>
                    <p class="text-sm text-slate-400">
                      Widgets float on the Mirror canvas — add as many as you need, then drag and
                      resize them in place. Added widgets are listed under Your Chappy.
                    </p>
                  </div>
                  <div
                    id="widget-quick-add"
                    class="widget-quick-add flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-5 py-3 text-center transition"
                    :class="isDraggingWidgetFile ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-950/40'"
                    @dragover.prevent="isDraggingWidgetFile = true"
                    @dragleave="handleWidgetDragLeave"
                    @drop.prevent="handleWidgetDrop"
                  >
                    <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Add</span>
                    <p class="text-xs text-slate-500">
                      Drop a widget ZIP here, or
                      <label class="cursor-pointer font-semibold text-sky-400 underline decoration-sky-400/70 underline-offset-2 hover:text-sky-300">
                        browse
                        <input
                          id="widget-zip-input"
                          type="file"
                          accept=".zip,application/zip"
                          class="hidden"
                          @change="handleWidgetFileInput"
                        />
                      </label>
                    </p>
                    <p v-if="widgetInstallStatus" class="text-xs" :class="widgetInstallStatus === 'Installing…' ? 'text-slate-400' : 'text-rose-400'">
                      {{ widgetInstallStatus }}
                    </p>
                  </div>
                </div>
                <WidgetCatalog
                  class="mt-4"
                  :entries="widgetCatalogEntries"
                  :show-filters="true"
                  :add-enabled="true"
                  :counts="widgetCountById"
                  @add="addWidgetFromCatalog"
                  @uninstall="uninstallWidget"
                />
              </div>
              <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400 shadow-[0_20px_40px_rgba(15,23,42,0.65)]">
                Build your own: a widget is a ZIP with a <code class="text-slate-300">widget.json</code> manifest and an HTML entry
                point — see <code class="text-slate-300">widgets/README.md</code> in the Chappy repository for the package format.
              </div>
            </template>
          </div>

          <div v-else id="settings-view" class="space-y-6">
            <div
              id="display-mode-panel"
              class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]"
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-widest text-slate-500">Display</p>
                  <h2 class="text-lg font-semibold text-white">Layout mode</h2>
                  <p class="text-sm text-slate-400">
                    Desktop fills the workspace with the selected service. Mirror turns it into a black
                    canvas where each service floats in its own movable, resizable window — built for
                    smart mirrors, lighting up as few pixels as possible.
                  </p>
                </div>
                <fieldset
                  id="display-mode-toggle"
                  class="display-mode-toggle inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1"
                  aria-label="Display mode"
                >
                  <legend class="sr-only">Display mode</legend>
                  <label
                    v-for="option in displayModeOptions"
                    :key="option.value"
                    class="cursor-pointer"
                    :for="`display-mode-${option.value}`"
                  >
                    <input
                      :id="`display-mode-${option.value}`"
                      type="radio"
                      name="display-mode"
                      :value="option.value"
                      :checked="displayMode === option.value"
                      class="peer sr-only"
                      @change="setDisplayMode(option.value)"
                    />
                    <span
                      class="block rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
                      :class="
                        displayMode === option.value
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      "
                    >
                      {{ option.label }}
                    </span>
                  </label>
                </fieldset>
              </div>
              <div
                v-if="isMirrorMode"
                id="auto-hide-services-menu-row"
                class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5"
              >
                <div>
                  <h3 class="text-base font-semibold text-white">Auto Hide Services Menu</h3>
                  <p class="text-sm text-slate-400">
                    Slides the services menu off the left edge so the mirror lights only its windows and
                    widgets. A menu button in the top-left corner brings it back for 30 seconds.
                  </p>
                </div>
                <label
                  id="auto-hide-services-menu-toggle-control"
                  class="inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition"
                  :class="
                    effectiveTheme === 'light'
                      ? 'border-slate-300 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
                      : 'border-slate-700 bg-slate-950/70'
                  "
                >
                  <span
                    class="text-xs font-semibold uppercase tracking-widest"
                    :class="effectiveTheme === 'light' ? 'text-slate-600' : 'text-slate-400'"
                  >
                    {{ autoHideServicesMenu ? 'On' : 'Off' }}
                  </span>
                  <input
                    id="auto-hide-services-menu"
                    v-model="autoHideServicesMenu"
                    type="checkbox"
                    class="peer sr-only"
                  >
                  <span
                    class="relative inline-flex h-6 w-11 rounded-full transition"
                    :class="
                      autoHideServicesMenu
                        ? 'bg-sky-500'
                        : effectiveTheme === 'light'
                          ? 'bg-slate-300'
                          : 'bg-slate-700'
                    "
                  >
                    <span
                      class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition"
                      :class="autoHideServicesMenu ? 'left-[1.5rem]' : 'left-0.5'"
                    ></span>
                  </span>
                </label>
              </div>
            </div>

            <div
              id="external-link-behavior-panel"
              class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]"
            >
              <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500">General settings</p>
                    <h2 class="text-lg font-semibold text-white">Use System Browser for links</h2>
                    <p class="text-sm text-slate-400">
                      Opens links requested as new windows in your default browser.
                    </p>
                  </div>
                  <label
                    id="use-system-browser-links-toggle-control"
                    class="inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition"
                    :class="
                      effectiveTheme === 'light'
                        ? 'border-slate-300 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
                        : 'border-slate-700 bg-slate-950/70'
                    "
                  >
                    <span
                      class="text-xs font-semibold uppercase tracking-widest"
                      :class="effectiveTheme === 'light' ? 'text-slate-600' : 'text-slate-400'"
                    >
                      {{ useSystemBrowserLinks ? 'On' : 'Off' }}
                    </span>
                    <input
                      id="use-system-browser-links"
                      v-model="useSystemBrowserLinks"
                      type="checkbox"
                      class="peer sr-only"
                    >
                    <span
                      class="relative inline-flex h-6 w-11 rounded-full transition"
                      :class="
                        useSystemBrowserLinks
                          ? 'bg-sky-500'
                          : effectiveTheme === 'light'
                            ? 'bg-slate-300'
                            : 'bg-slate-700'
                      "
                    >
                      <span
                        class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition"
                        :class="useSystemBrowserLinks ? 'left-[1.5rem]' : 'left-0.5'"
                      ></span>
                    </span>
                  </label>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-semibold text-white">Preserve Session in memory</h2>
                    <p class="text-sm text-slate-400">
                      Keeps visited tabs loaded in memory so switching feels instant without a full page reload.
                      <a
                        v-if="preserveTabMemory"
                        href="#"
                        class="ml-1 font-semibold text-sky-400 underline decoration-sky-400/70 underline-offset-2 hover:text-sky-300"
                        @click.prevent="resetPreservedSessionsNow"
                      >
                        Reset Now
                      </a>
                    </p>
                  </div>
                  <label
                    id="preserve-tab-memory-toggle-control"
                    class="inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition"
                    :class="
                      effectiveTheme === 'light'
                        ? 'border-slate-300 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
                        : 'border-slate-700 bg-slate-950/70'
                    "
                  >
                    <span
                      class="text-xs font-semibold uppercase tracking-widest"
                      :class="effectiveTheme === 'light' ? 'text-slate-600' : 'text-slate-400'"
                    >
                      {{ preserveTabMemory ? 'On' : 'Off' }}
                    </span>
                    <input
                      id="preserve-tab-memory"
                      v-model="preserveTabMemory"
                      type="checkbox"
                      class="peer sr-only"
                    >
                    <span
                      class="relative inline-flex h-6 w-11 rounded-full transition"
                      :class="
                        preserveTabMemory
                          ? 'bg-sky-500'
                          : effectiveTheme === 'light'
                            ? 'bg-slate-300'
                            : 'bg-slate-700'
                      "
                    >
                      <span
                        class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition"
                        :class="preserveTabMemory ? 'left-[1.5rem]' : 'left-0.5'"
                      ></span>
                    </span>
                  </label>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-semibold text-white">Open Services on Launch</h2>
                    <p class="text-sm text-slate-400">
                      When starting Chappy, any services added to your Chappy will be opened on startup. This will
                      result in a slower startup and more memory use.
                    </p>
                  </div>
                  <label
                    id="open-services-on-launch-toggle-control"
                    class="inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition"
                    :class="
                      effectiveTheme === 'light'
                        ? 'border-slate-300 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
                        : 'border-slate-700 bg-slate-950/70'
                    "
                  >
                    <span
                      class="text-xs font-semibold uppercase tracking-widest"
                      :class="effectiveTheme === 'light' ? 'text-slate-600' : 'text-slate-400'"
                    >
                      {{ openServicesOnLaunch ? 'On' : 'Off' }}
                    </span>
                    <input
                      id="open-services-on-launch"
                      v-model="openServicesOnLaunch"
                      type="checkbox"
                      class="peer sr-only"
                    >
                    <span
                      class="relative inline-flex h-6 w-11 rounded-full transition"
                      :class="
                        openServicesOnLaunch
                          ? 'bg-sky-500'
                          : effectiveTheme === 'light'
                            ? 'bg-slate-300'
                            : 'bg-slate-700'
                      "
                    >
                      <span
                        class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition"
                        :class="openServicesOnLaunch ? 'left-[1.5rem]' : 'left-0.5'"
                      ></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div
              v-if="chappyApi?.checkForUpdate"
              id="app-update-panel"
              class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.7)]"
            >
              <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500">Updates</p>
                    <h2 class="text-lg font-semibold text-white">Enable Auto-Update</h2>
                    <p class="text-sm text-slate-400">
                      Check for updates when you open Chappy (or daily).
                    </p>
                  </div>
                  <label
                    id="enable-auto-update-toggle-control"
                    class="inline-flex cursor-pointer items-center gap-3 rounded-full border px-3 py-2 transition"
                    :class="
                      effectiveTheme === 'light'
                        ? 'border-slate-300 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.08)]'
                        : 'border-slate-700 bg-slate-950/70'
                    "
                  >
                    <span
                      class="text-xs font-semibold uppercase tracking-widest"
                      :class="effectiveTheme === 'light' ? 'text-slate-600' : 'text-slate-400'"
                    >
                      {{ enableAutoUpdate ? 'On' : 'Off' }}
                    </span>
                    <input
                      id="enable-auto-update"
                      v-model="enableAutoUpdate"
                      type="checkbox"
                      class="peer sr-only"
                    >
                    <span
                      class="relative inline-flex h-6 w-11 rounded-full transition"
                      :class="
                        enableAutoUpdate
                          ? 'bg-sky-500'
                          : effectiveTheme === 'light'
                            ? 'bg-slate-300'
                            : 'bg-slate-700'
                      "
                    >
                      <span
                        class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(15,23,42,0.35)] transition"
                        :class="enableAutoUpdate ? 'left-[1.5rem]' : 'left-0.5'"
                      ></span>
                    </span>
                  </label>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-semibold text-white">Check for update</h2>
                    <p class="text-sm text-slate-400">
                      New versions download in the background and install when you restart.
                    </p>
                    <p id="app-update-status" class="mt-1 text-xs text-slate-500">
                      <template v-if="appVersion">Chappy v{{ appVersion }} · </template>{{ updateStatusLabel }}
                    </p>
                  </div>
                  <button
                    id="check-for-update-button"
                    type="button"
                    class="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    :disabled="isUpdateBusy || appUpdate.state === 'unsupported'"
                    @click="isUpdateReady ? handleInstallUpdate() : handleCheckForUpdate()"
                  >
                    {{ updateButtonLabel }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div v-if="!isMirrorMode" v-show="!isChappyViewVisible" id="service-webview-panel" class="relative flex-1 overflow-hidden">
          <template v-if="preserveTabMemory">
            <webview
              v-for="tab in renderedPreservedTabs"
              id="service-webview"
              :key="`preserved-webview-${tab.id}-${preserveSessionResetNonce}`"
              v-show="activeTabId === tab.id"
              :ref="(element) => setPreservedWebviewRef(tab.id, element)"
              :src="resolveLaunchUrl(tab)"
              :partition="resolveWebviewPartition(tab)"
              allowpopups
              class="h-full w-full border-0"
              @did-start-navigation="(event) => handleWebviewNavigationTrace(tab.id, 'did-start-navigation', event)"
              @did-redirect-navigation="(event) => handleWebviewNavigationTrace(tab.id, 'did-redirect-navigation', event)"
              @did-navigate="(event) => handleWebViewNavigationForTab(tab.id, event)"
              @did-navigate-in-page="(event) => handleWebViewInPageNavigationForTab(tab.id, event)"
              @did-fail-load="(event) => handleWebviewNavigationFailure(tab.id, event)"
              @dom-ready="() => handleWebviewDomReady(tab.id)"
              @page-title-updated="(event) => handleWebviewTitleUpdatedForTab(tab.id, event)"
            ></webview>
          </template>
          <template v-else>
            <webview
              id="service-webview"
              ref="singleWebviewRef"
              v-if="activeTabLaunchUrl"
              :key="activeTab.id"
              :src="activeTabLaunchUrl"
              :partition="activeTabWebviewPartition"
              allowpopups
              class="h-full w-full border-0"
              @did-start-navigation="(event) => handleWebviewNavigationTrace(activeTab.id, 'did-start-navigation', event)"
              @did-redirect-navigation="(event) => handleWebviewNavigationTrace(activeTab.id, 'did-redirect-navigation', event)"
              @did-navigate="(event) => handleWebViewNavigationForTab(activeTab.id, event)"
              @did-navigate-in-page="(event) => handleWebViewInPageNavigationForTab(activeTab.id, event)"
              @did-fail-load="(event) => handleWebviewNavigationFailure(activeTab.id, event)"
              @dom-ready="() => handleWebviewDomReady(activeTab.id)"
              @page-title-updated="(event) => handleWebviewTitleUpdatedForTab(activeTab.id, event)"
            ></webview>
            <div v-else class="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
              Select a tab to open a client.
            </div>
          </template>
        </div>

        <div
          v-else
          v-show="!isChappyViewVisible"
          id="mirror-canvas"
          ref="mirrorCanvasRef"
          class="mirror-canvas relative flex-1 overflow-hidden"
        >
<!-- The isolate wrapper contains window/widget z-indexes in their own stacking
               context, so persisted z values can never climb above app chrome (toasts,
               the add-clock button, drag shields). -->
          <div class="absolute inset-0 isolate">
            <MirrorWindow
              v-for="tab in mirrorOpenTabs"
              :key="`mirror-window-${tab.id}`"
              :title="tab.title"
              :icon="resolveIcon(tab.icon)"
              :rect="tab.mirrorWindow"
              :active="activeTabId === tab.id"
              :min-width="MIRROR_WINDOW_MIN_WIDTH"
              :min-height="MIRROR_WINDOW_MIN_HEIGHT"
              @focus="focusMirrorTab(tab.id)"
              @close="closeMirrorWindow(tab.id)"
              @update:rect="(rect) => updateMirrorWindowRect(tab.id, rect)"
            >
              <webview
                :id="`mirror-webview-${tab.id}`"
                :ref="(element) => setMirrorWebviewRef(tab.id, element)"
                :src="resolveMirrorWebviewSrc(tab)"
                :partition="resolveWebviewPartition(tab)"
                allowpopups
                class="h-full w-full border-0"
                @focus="() => focusMirrorTab(tab.id)"
                @did-start-navigation="(event) => handleWebviewNavigationTrace(tab.id, 'did-start-navigation', event)"
                @did-redirect-navigation="(event) => handleWebviewNavigationTrace(tab.id, 'did-redirect-navigation', event)"
                @did-navigate="(event) => handleWebViewNavigationForTab(tab.id, event)"
                @did-navigate-in-page="(event) => handleWebViewInPageNavigationForTab(tab.id, event)"
                @did-fail-load="(event) => handleWebviewNavigationFailure(tab.id, event)"
                @dom-ready="() => handleWebviewDomReady(tab.id)"
                @page-title-updated="(event) => handleWebviewTitleUpdatedForTab(tab.id, event)"
              ></webview>
            </MirrorWindow>

            <template v-for="widget in mirrorWidgets" :key="widget.id">
              <ClockWidget
                v-if="widget.type === 'clock'"
                :widget="widget"
                @focus="focusMirrorWidget(widget.id)"
                @remove="removeMirrorWidget(widget.id)"
                @update:rect="(rect) => updateMirrorWidgetRect(widget.id, rect)"
                @update:time-zone="(zone) => setMirrorWidgetTimeZone(widget.id, zone)"
              />
              <PackageWidget
                v-else-if="widget.type === 'package'"
                :widget="widget"
                :manifest="installedWidgetById[widget.widgetId] || null"
                :reload-key="widgetReloadNonces[widget.widgetId] || 0"
                :min-width="packageWidgetMinWidth(widget)"
                :min-height="packageWidgetMinHeight(widget)"
                @focus="focusMirrorWidget(widget.id)"
                @remove="removeMirrorWidget(widget.id)"
                @update:rect="(rect) => updateMirrorWidgetRect(widget.id, rect)"
              />
            </template>
          </div>

          <p
            v-if="!mirrorOpenTabs.length && !mirrorWidgets.length"
            class="mirror-canvas-hint pointer-events-none absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.35em]"
          >
            Select a service or add widgets
          </p>

          <button
            v-if="isServicesMenuHidden"
            id="mirror-show-menu-button"
            type="button"
            title="Show services menu"
            class="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition"
            @click="revealServicesMenu"
          >
            <span class="sr-only">Show services menu</span>
            <svg
              aria-hidden="true"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>

          <button
            v-if="mirrorArrangeGrid"
            id="mirror-arrange-button"
            type="button"
            :title="mirrorArrangeLabel"
            :data-columns="mirrorArrangeGrid.columns"
            :data-rows="mirrorArrangeGrid.rows"
            class="absolute bottom-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border transition"
            @click="arrangeMirrorWindows"
          >
            <span class="sr-only">{{ mirrorArrangeLabel }}</span>
            <svg
              aria-hidden="true"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path
                v-for="fraction in mirrorArrangeGlyph.vertical"
                :key="`v-${fraction}`"
                :d="`M${3 + 18 * fraction} 3v18`"
              />
              <path
                v-for="fraction in mirrorArrangeGlyph.horizontal"
                :key="`h-${fraction}`"
                :d="`M3 ${3 + 18 * fraction}h18`"
              />
            </svg>
          </button>

          <button
            id="mirror-add-widget-button"
            type="button"
            title="Add widgets"
            class="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none transition"
            @click="goToWidgetsTab"
          >
            +
          </button>
        </div>
      </section>
    </main>
    <SettingsModal
      v-if="isSettingsModalOpen"
      :tab="editingTab"
      @close="closeSettingsModal"
      @save="handleSaveSettings"
      @fetch-icon="handleFetchIconFromWebsite"
    />
    <div
      v-if="toastMessage"
      id="check-update-toast"
      class="fixed bottom-6 right-6 z-50 flex items-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 shadow-[0_20px_50px_rgba(2,6,23,0.9)]"
    >
      <span class="text-sm font-semibold text-white">{{ toastMessage }}</span>
    </div>
    <div
      v-else-if="isUpdateReady && !isUpdateToastDismissed"
      id="app-update-toast"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 shadow-[0_20px_50px_rgba(2,6,23,0.9)]"
    >
      <span class="text-sm font-semibold text-white">Chappy v{{ appUpdate.version }} is ready — Restart Now</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
          @click="handleInstallUpdate"
        >
          Restart Now
        </button>
        <button
          type="button"
          class="rounded-xl border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          aria-label="Dismiss"
          @click="isUpdateToastDismissed = true"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import SettingsModal from './components/SettingsModal.vue';
import MirrorWindow from './components/MirrorWindow.vue';
import {
  arrangeGlyphDividers,
  computeArrangedRects,
  describeArrangeGrid,
  resolveArrangeGrid,
} from './composables/mirrorArrange.mjs';
import ClockWidget from './components/ClockWidget.vue';
import PackageWidget from './components/PackageWidget.vue';
import WidgetCatalog from './components/WidgetCatalog.vue';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { accentColors, taxonomies, serviceCatalog, filterServicesByQuery } from './data/serviceCatalog.mjs';
import {
  builtinWidgets,
  WIDGET_ID_PATTERN,
  PACKAGE_WIDGET_MIN_WIDTH,
  PACKAGE_WIDGET_MIN_HEIGHT,
  PACKAGE_WIDGET_DEFAULT_WIDTH,
  PACKAGE_WIDGET_DEFAULT_HEIGHT,
} from './data/widgetCatalog.mjs';
import defaultIconUrl from './assets/icons/custom.svg?url';
import chappyLogoUrl from '../../resources/chappy-logo.svg?url';

const isSettingsModalOpen = ref(false);
const editingTab = ref(null);


const singleWebviewRef = ref(null);
const preservedWebviewRefs = new Map();
const loadedTabIds = ref([]);
const preserveSessionResetNonce = ref(0);
const CONFIG_VERSION = 1;
const defaultIcon = defaultIconUrl;
const availableServices = serviceCatalog;
const selectedTaxonomies = ref(new Set());

// Quick Add doubles as a search box: the same text that Add turns into a URL
// filters the grid on every keypress. Declared here, ahead of the other Quick
// Add state, because filteredServices reads it.
const quickAddUrl = ref('');
const quickAddQuery = computed(() => quickAddUrl.value.trim());

// Computed filtered services: taxonomy checkboxes first, then the Quick Add
// query narrows whatever those leave (title or domain, case-insensitive).
const filteredServices = computed(() => {
  const byTaxonomy = selectedTaxonomies.value.size === 0
    ? availableServices
    : availableServices.filter(service =>
        service.taxonomies?.some(t => selectedTaxonomies.value.has(t))
      );
  return filterServicesByQuery(byTaxonomy, quickAddQuery.value);
});

// Toggle taxonomy filter
const toggleTaxonomy = (taxonomyKey) => {
  const newSet = new Set(selectedTaxonomies.value);
  if (newSet.has(taxonomyKey)) {
    newSet.delete(taxonomyKey);
  } else {
    newSet.add(taxonomyKey);
  }
  selectedTaxonomies.value = newSet;
};

// Clear all taxonomy filters
const clearTaxonomyFilters = () => {
  selectedTaxonomies.value = new Set();
};
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
const chappyWorkspaceTabValues = new Set(['your-chappy', 'configure', 'widgets', 'settings']);
const themePreferenceValues = new Set(themePreferenceOptions.map((option) => option.value));
const normalizeThemePreference = (value) => (themePreferenceValues.has(value) ? value : 'system');
const themePreference = ref('system');
const displayModeOptions = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mirror', label: 'Mirror' },
];
const displayModeValues = new Set(displayModeOptions.map((option) => option.value));
const normalizeDisplayMode = (value) => (displayModeValues.has(value) ? value : 'desktop');
const displayMode = ref('desktop');
const isMirrorMode = computed(() => displayMode.value === 'mirror');
// Mirror mode separates "the Chappy panel is showing" from "which mirror window
// has focus". Desktop mode has only one full-bleed pane so activeTabId can carry
// both; on the mirror the panel is an overlay over a canvas that keeps running,
// and hiding it must reveal that canvas without opening or focusing a service.
const isChappyPanelOpen = ref(true);
// Auto-hide keeps the services menu off-canvas on the mirror so it lights no
// pixels until asked for. A reveal is transient: the menu button slides it in
// and it slides back out after SERVICES_MENU_AUTO_HIDE_MS (persisted: only the
// toggle, never the reveal).
const autoHideServicesMenu = ref(false);
const isServicesMenuRevealed = ref(false);
const SERVICES_MENU_AUTO_HIDE_MS = 30_000;
let servicesMenuHideTimer = null;
const mirrorWidgets = ref([]);
const installedWidgets = ref([]);
const widgetInstallStatus = ref('');
const isDraggingWidgetFile = ref(false);
// Per-widget-id nonces, bumped after a (re)install so that widget's mounted
// webviews remount and pick up the new files without disturbing the others.
const widgetReloadNonces = ref({});

// A file dropped outside the widget Quick Add zone must never navigate the
// renderer away from the app; the zone's own handlers run before these.
const suppressWindowDrop = (event) => {
  event.preventDefault();
};
const mirrorCanvasRef = ref(null);
// Live canvas size for the arrange button glyph, which flips between columns
// and rows as the app window (or the sliding services menu) changes the
// canvas aspect. Kept by a ResizeObserver; see syncMirrorCanvasSize.
const mirrorCanvasSize = ref({ width: 0, height: 0 });
const mirrorWebviewRefs = new Map();
// Launch URLs are snapshotted per webview mount: binding :src reactively would
// re-navigate the guest every time lastUrl updates (double loads, SPA reloads).
const mirrorLaunchUrls = new Map();
const MIRROR_WINDOW_MIN_WIDTH = 320;
const MIRROR_WINDOW_MIN_HEIGHT = 240;
const MIRROR_WINDOW_DEFAULT_WIDTH = 760;
const MIRROR_WINDOW_DEFAULT_HEIGHT = 540;
const SIDEBAR_WIDTH_PX = 112;
const useSystemBrowserLinks = ref(true);
const preserveTabMemory = ref(true);
const openServicesOnLaunch = ref(false);
const enableAutoUpdate = ref(true);
const lastUpdateCheck = ref(null);
const appVersion = ref('');
// Mirror of the main-process updater state (see main/app-update.js). The
// main process owns the lifecycle; the renderer only renders it.
const appUpdate = ref({ state: 'idle', version: null, percent: 0, error: null });
const isUpdateToastDismissed = ref(false);
const toastMessage = ref(null);
let toastTimeout = null;
const systemPrefersDark = ref(true);
const unreadStateByTabId = ref({});

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

/** Ensures URL has https:// if no protocol; returns normalized URL or empty string. */
const ensureHttpsUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch (error) {
    return '';
  }
};

/** Infers a display name from URL by stripping protocol. */
const inferNameFromUrl = (url) => {
  if (typeof url !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '') || parsed.host;
  } catch (error) {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || 'Custom';
  }
};

/** Extracts hostname for domain matching (lowercase, no www). */
const getHostnameForMatch = (url) => {
  if (typeof url !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch (error) {
    return '';
  }
};

/** Returns the available service whose URL hostname matches the given URL, or null. */
const findServiceByUrl = (url) => {
  const normalized = ensureHttpsUrl(url);
  if (!normalized) {
    return null;
  }
  const host = getHostnameForMatch(normalized);
  if (!host) {
    return null;
  }
  return availableServices.find((s) => getHostnameForMatch(s.url) === host) ?? null;
};

const launchModeOptions = ['default', 'custom', 'preserve'];
const isLaunchMode = (value) => launchModeOptions.includes(value);

const resolveIconById = (iconId) => iconById[iconId] || defaultIcon;
const resolveIcon = (icon) => icon || defaultIcon;
const effectiveTheme = computed(() => {
  // Mirror is black-only: forcing dark keeps light-theme rules and template
  // conditionals from lighting up pixels while the mode is active.
  if (isMirrorMode.value) {
    return 'dark';
  }
  return themePreference.value === 'system'
    ? systemPrefersDark.value
      ? 'dark'
      : 'light'
    : themePreference.value;
});

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

const parseUnreadCount = (input) => {
  const value = Number.parseInt(input, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const normalizeUnreadCount = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }
  const count = Math.floor(value);
  return count > 0 ? count : null;
};

const parseUnreadStateFromTitle = (title) => {
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  if (!normalizedTitle) {
    return { hasUnread: false, count: null };
  }

  const leadingCountMatch = normalizedTitle.match(/^[\[(]\s*(\d{1,4})\+?\s*[\])]/);
  if (leadingCountMatch?.[1]) {
    const count = parseUnreadCount(leadingCountMatch[1]);
    return count === null ? { hasUnread: false, count: null } : { hasUnread: true, count };
  }

  const trailingCountMatch = normalizedTitle.match(/[\[(]\s*(\d{1,4})\+?\s*[\])]\s*$/);
  if (trailingCountMatch?.[1]) {
    const count = parseUnreadCount(trailingCountMatch[1]);
    return count === null ? { hasUnread: false, count: null } : { hasUnread: true, count };
  }

  if (/^[•●◉]\s+/u.test(normalizedTitle)) {
    return { hasUnread: true, count: null };
  }

  if (/\b(?:new|unread)\b/i.test(normalizedTitle) && /\b(?:message|messages|chat|chats)\b/i.test(normalizedTitle)) {
    return { hasUnread: true, count: null };
  }

  return { hasUnread: false, count: null };
};

const setUnreadStateForTab = (tabId, nextState) => {
  if (tabId === 'chappy') {
    return;
  }

  const currentState = unreadStateByTabId.value[tabId];
  const hasUnread = nextState?.hasUnread === true;
  if (!hasUnread) {
    if (!currentState) {
      return;
    }
    const nextUnreadStateByTabId = { ...unreadStateByTabId.value };
    delete nextUnreadStateByTabId[tabId];
    unreadStateByTabId.value = nextUnreadStateByTabId;
    return;
  }

  const count = normalizeUnreadCount(nextState?.count);
  if (currentState?.hasUnread && currentState.count === count) {
    return;
  }

  unreadStateByTabId.value = {
    ...unreadStateByTabId.value,
    [tabId]: {
      hasUnread: true,
      count,
    },
  };
};

const tabHasUnread = (tabId) => unreadStateByTabId.value[tabId]?.hasUnread === true;
const tabUnreadCount = (tabId) => normalizeUnreadCount(unreadStateByTabId.value[tabId]?.count);
const totalUnreadBadgeCount = computed(() =>
  Object.values(unreadStateByTabId.value).reduce((total, state) => {
    if (state?.hasUnread !== true) {
      return total;
    }
    const normalizedCount = normalizeUnreadCount(state.count);
    return total + (normalizedCount ?? 1);
  }, 0)
);
const formatUnreadCount = (count) => {
  const normalizedCount = normalizeUnreadCount(count);
  if (normalizedCount === null) {
    return '';
  }
  return normalizedCount > 99 ? '99+' : String(normalizedCount);
};

const isTabLoaded = (tabId) => loadedTabIds.value.includes(tabId);
const markTabLoaded = (tabId) => {
  if (tabId === 'chappy' || isTabLoaded(tabId)) {
    return;
  }
  loadedTabIds.value = [...loadedTabIds.value, tabId];
};
const setPreservedWebviewRef = (tabId, element) => {
  if (element) {
    preservedWebviewRefs.set(tabId, element);
    return;
  }
  preservedWebviewRefs.delete(tabId);
};
const preloadAllServiceTabs = () => {
  tabs.value.forEach((tab) => {
    markTabLoaded(tab.id);
  });
};
const resetPreservedSessionsNow = () => {
  if (!preserveTabMemory.value) {
    return;
  }
  preservedWebviewRefs.clear();
  loadedTabIds.value = activeTabId.value === 'chappy' ? [] : [activeTabId.value];
  preserveSessionResetNonce.value += 1;
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

const sanitizeFiniteNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : fallback;
};

const hydrateMirrorWindow = (input) => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  return {
    x: Math.max(0, sanitizeFiniteNumber(input.x, 40)),
    y: Math.max(0, sanitizeFiniteNumber(input.y, 40)),
    width: Math.max(MIRROR_WINDOW_MIN_WIDTH, sanitizeFiniteNumber(input.width, MIRROR_WINDOW_DEFAULT_WIDTH)),
    height: Math.max(MIRROR_WINDOW_MIN_HEIGHT, sanitizeFiniteNumber(input.height, MIRROR_WINDOW_DEFAULT_HEIGHT)),
    z: Math.max(1, sanitizeFiniteNumber(input.z, 1)),
    open: input.open === true,
  };
};

const hydrateMirrorWidget = (input) => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : `widget-${suffix()}`;
  const base = {
    id,
    x: Math.max(0, sanitizeFiniteNumber(input.x, 48)),
    y: Math.max(0, sanitizeFiniteNumber(input.y, 48)),
    z: Math.max(1, sanitizeFiniteNumber(input.z, 1)),
  };
  if (input.type === 'clock') {
    return {
      ...base,
      type: 'clock',
      timeZone: typeof input.timeZone === 'string' ? input.timeZone.trim() : '',
    };
  }
  if (input.type === 'package') {
    const widgetId =
      typeof input.widgetId === 'string' && WIDGET_ID_PATTERN.test(input.widgetId)
        ? input.widgetId
        : '';
    if (!widgetId) {
      return null;
    }
    return {
      ...base,
      type: 'package',
      widgetId,
      width: Math.max(PACKAGE_WIDGET_MIN_WIDTH, sanitizeFiniteNumber(input.width, PACKAGE_WIDGET_DEFAULT_WIDTH)),
      height: Math.max(PACKAGE_WIDGET_MIN_HEIGHT, sanitizeFiniteNumber(input.height, PACKAGE_WIDGET_DEFAULT_HEIGHT)),
    };
  }
  return null;
};

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

  const primaryIconPath =
    typeof inputTab.primaryIconPath === 'string' && inputTab.primaryIconPath.trim()
      ? inputTab.primaryIconPath.trim()
      : undefined;
  const secondaryIconPath =
    typeof inputTab.secondaryIconPath === 'string' && inputTab.secondaryIconPath.trim()
      ? inputTab.secondaryIconPath.trim()
      : undefined;

  const primaryIconUrl =
    iconId === 'custom' && primaryIconPath
      ? `chappy-icon://local/${primaryIconPath}`
      : resolveIconById(iconId);

  return {
    id,
    title,
    url,
    color,
    iconId,
    icon: primaryIconUrl,
    partition,
    customLaunchUrl,
    launchMode,
    lastUrl,
    primaryIconPath,
    secondaryIconPath,
    mirrorWindow: hydrateMirrorWindow(inputTab.mirrorWindow),
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
  primaryIconPath: tab.primaryIconPath || undefined,
  secondaryIconPath: tab.secondaryIconPath || undefined,
  mirrorWindow: tab.mirrorWindow ? { ...tab.mirrorWindow } : undefined,
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
      displayMode: displayMode.value,
      chappyPanelOpen: isChappyPanelOpen.value,
      autoHideServicesMenu: autoHideServicesMenu.value,
      useSystemBrowserLinks: useSystemBrowserLinks.value,
      preserveTabMemory: preserveTabMemory.value,
      openServicesOnLaunch: openServicesOnLaunch.value,
      enableAutoUpdate: enableAutoUpdate.value,
      tabs: tabs.value.map(serializeTab),
      mirrorWidgets: mirrorWidgets.value.map((widget) => ({ ...widget }))
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
    displayMode.value = normalizeDisplayMode(persisted?.displayMode);
    isChappyPanelOpen.value = persisted?.chappyPanelOpen !== false;
    autoHideServicesMenu.value = persisted?.autoHideServicesMenu === true;
    mirrorWidgets.value = (Array.isArray(persisted?.mirrorWidgets) ? persisted.mirrorWidgets : [])
      .map(hydrateMirrorWidget)
      .filter(Boolean);
    useSystemBrowserLinks.value = persisted?.useSystemBrowserLinks !== false;
    enableAutoUpdate.value = persisted?.enableAutoUpdate !== false;
    lastUpdateCheck.value = typeof persisted?.lastUpdateCheck === 'string' ? persisted.lastUpdateCheck : null;
    const shouldOpenServicesOnLaunch = persisted?.openServicesOnLaunch === true;
    preserveTabMemory.value = shouldOpenServicesOnLaunch || persisted?.preserveTabMemory !== false;
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
    openServicesOnLaunch.value = shouldOpenServicesOnLaunch;
    if (shouldOpenServicesOnLaunch && preserveTabMemory.value) {
      preloadAllServiceTabs();
    }
    normalizeMirrorZOrder();
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

// Single source of truth for "is the Chappy panel on screen". Both workspace
// panes and the sidebar button read this, so they can never disagree.
const isChappyViewVisible = computed(() =>
  isMirrorMode.value ? isChappyPanelOpen.value : activeTab.value.isChappy
);
const chappyTabButtonLabel = computed(() => {
  if (!isMirrorMode.value) {
    return 'Chappy';
  }
  return isChappyViewVisible.value ? 'Hide Chappy' : 'Show Chappy';
});

// The menu only auto-hides over the live canvas. While the Chappy panel is
// open the user is configuring, and the panel already has its own Hide control.
const isServicesMenuHidden = computed(() =>
  isMirrorMode.value
  && autoHideServicesMenu.value
  && !isChappyViewVisible.value
  && !isServicesMenuRevealed.value
);

const clearServicesMenuHideTimer = () => {
  if (servicesMenuHideTimer) {
    clearTimeout(servicesMenuHideTimer);
    servicesMenuHideTimer = null;
  }
};

const endServicesMenuReveal = () => {
  clearServicesMenuHideTimer();
  isServicesMenuRevealed.value = false;
};

const scheduleServicesMenuHide = () => {
  clearServicesMenuHideTimer();
  servicesMenuHideTimer = setTimeout(endServicesMenuReveal, SERVICES_MENU_AUTO_HIDE_MS);
};

const revealServicesMenu = () => {
  isServicesMenuRevealed.value = true;
  scheduleServicesMenuHide();
};

// Touching the revealed menu restarts the countdown so it never slides away
// from under a finger mid-use.
const keepServicesMenuRevealed = () => {
  if (isServicesMenuRevealed.value) {
    scheduleServicesMenuHide();
  }
};

// A reveal is only meaningful while the menu is auto-hiding over the canvas.
// Drop it whenever that stops being true so the next hide is immediate rather
// than "whenever the old timer happens to fire".
watch([autoHideServicesMenu, isMirrorMode, isChappyViewVisible], ([autoHide, mirror, chappyVisible]) => {
  if (!autoHide || !mirror || chappyVisible) {
    endServicesMenuReveal();
  }
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
const renderedPreservedTabs = computed(() =>
  tabs.value.filter((tab) => activeTabId.value === tab.id || isTabLoaded(tab.id))
);
const serviceCountByIconId = computed(() =>
  tabs.value.reduce((accumulator, tab) => {
    const iconId = typeof tab?.iconId === 'string' ? tab.iconId : '';
    if (!iconId) {
      return accumulator;
    }
    accumulator[iconId] = (accumulator[iconId] || 0) + 1;
    return accumulator;
  }, {})
);
const serviceAddLabel = (serviceId) => (serviceCountByIconId.value[serviceId] > 0 ? 'ADD +1' : 'ADD');

const resolveWebviewPartition = (tab) => `persist:${tab?.partition || tab?.id || 'tab'}`;
const activeTabWebviewPartition = computed(() => resolveWebviewPartition(activeTab.value));

// Sorted by id so reordering tabs never reorders the keyed v-for: moving a
// <webview> element in the DOM reloads its guest. Stacking comes from z-index,
// so DOM order is irrelevant visually.
const mirrorOpenTabs = computed(() =>
  tabs.value.filter((tab) => tab.mirrorWindow?.open).sort((a, b) => a.id.localeCompare(b.id))
);

const resolveMirrorWebviewSrc = (tab) => {
  if (!mirrorLaunchUrls.has(tab.id)) {
    mirrorLaunchUrls.set(tab.id, resolveLaunchUrl(tab));
  }
  return mirrorLaunchUrls.get(tab.id);
};

const getMirrorCanvasBounds = () => {
  const el = mirrorCanvasRef.value;
  if (el && el.clientWidth > 0 && el.clientHeight > 0) {
    return { width: el.clientWidth, height: el.clientHeight };
  }
  return {
    width: Math.max(MIRROR_WINDOW_MIN_WIDTH, window.innerWidth - SIDEBAR_WIDTH_PX),
    height: Math.max(MIRROR_WINDOW_MIN_HEIGHT, window.innerHeight),
  };
};

const clampRectToCanvas = (rect, minWidth, minHeight) => {
  const bounds = getMirrorCanvasBounds();
  const width = Math.min(Math.max(rect.width ?? minWidth, minWidth), Math.max(minWidth, bounds.width));
  const height = Math.min(Math.max(rect.height ?? minHeight, minHeight), Math.max(minHeight, bounds.height));
  const x = Math.min(Math.max(rect.x ?? 0, 0), Math.max(0, bounds.width - width));
  const y = Math.min(Math.max(rect.y ?? 0, 0), Math.max(0, bounds.height - height));
  return { x, y, width, height };
};

const highestMirrorZ = () =>
  Math.max(
    0,
    ...tabs.value.map((tab) => tab.mirrorWindow?.z || 0),
    ...mirrorWidgets.value.map((widget) => widget.z || 0)
  );

const createMirrorWindowRect = () => {
  const offset = 48 + (mirrorOpenTabs.value.length % 6) * 36;
  return clampRectToCanvas(
    { x: offset, y: offset, width: MIRROR_WINDOW_DEFAULT_WIDTH, height: MIRROR_WINDOW_DEFAULT_HEIGHT },
    MIRROR_WINDOW_MIN_WIDTH,
    MIRROR_WINDOW_MIN_HEIGHT
  );
};

const openMirrorWindowForTab = (tabId) => {
  updateTabById(tabId, (tab) => {
    const top = highestMirrorZ();
    const existing = tab.mirrorWindow;
    const rect = existing
      ? clampRectToCanvas(existing, MIRROR_WINDOW_MIN_WIDTH, MIRROR_WINDOW_MIN_HEIGHT)
      : createMirrorWindowRect();
    // Already open and on top: only re-clamp, so repeated sidebar clicks do not
    // inflate the persisted z counter.
    if (existing?.open && existing.z === top) {
      if (
        rect.x === existing.x &&
        rect.y === existing.y &&
        rect.width === existing.width &&
        rect.height === existing.height
      ) {
        return tab;
      }
      return { ...tab, mirrorWindow: { ...existing, ...rect } };
    }
    return { ...tab, mirrorWindow: { ...rect, z: top + 1, open: true } };
  });
};

const focusMirrorTab = (tabId) => {
  if (activeTabId.value !== tabId) {
    activeTabId.value = tabId;
  }
  const top = highestMirrorZ();
  updateTabById(tabId, (tab) => {
    if (!tab.mirrorWindow || tab.mirrorWindow.z === top) {
      return tab;
    }
    return { ...tab, mirrorWindow: { ...tab.mirrorWindow, z: top + 1 } };
  });
};

const closeMirrorWindow = (tabId) => {
  updateTabById(tabId, (tab) =>
    tab.mirrorWindow ? { ...tab, mirrorWindow: { ...tab.mirrorWindow, open: false } } : tab
  );
};

const updateMirrorWindowRect = (tabId, rect) => {
  const clamped = clampRectToCanvas(rect, MIRROR_WINDOW_MIN_WIDTH, MIRROR_WINDOW_MIN_HEIGHT);
  updateTabById(tabId, (tab) => {
    const existing = tab.mirrorWindow;
    if (!existing) {
      return tab;
    }
    if (
      existing.x === clamped.x &&
      existing.y === clamped.y &&
      existing.width === clamped.width &&
      existing.height === clamped.height
    ) {
      return tab;
    }
    return { ...tab, mirrorWindow: { ...existing, ...clamped } };
  });
};

// Smart arrange: tile every open window into equal strips or a 2 x 2 grid
// chosen from the window count and the canvas aspect (mirrorArrange.mjs).
// Windows are numbered in sidebar order, not the id-sorted render order, so
// window 1 is the top service in the menu and the layout reads top to bottom.
const mirrorArrangeTabs = computed(() => tabs.value.filter((tab) => tab.mirrorWindow?.open));

const mirrorArrangeGrid = computed(() => {
  const size = mirrorCanvasSize.value;
  const bounds = size.width > 0 && size.height > 0 ? size : getMirrorCanvasBounds();
  return resolveArrangeGrid(mirrorArrangeTabs.value.length, bounds);
});

const mirrorArrangeLabel = computed(() =>
  mirrorArrangeGrid.value ? describeArrangeGrid(mirrorArrangeGrid.value, mirrorArrangeTabs.value.length) : ''
);

const mirrorArrangeGlyph = computed(() =>
  mirrorArrangeGrid.value ? arrangeGlyphDividers(mirrorArrangeGrid.value) : { vertical: [], horizontal: [] }
);

// Geometry goes through updateMirrorWindowRect so the same min-size clamp
// applies as for a manual resize: on a canvas too narrow for N strips the
// windows keep their minimum size and overlap rather than collapsing.
// Only rects change; z-order, open state, and webviews are untouched.
const arrangeMirrorWindows = () => {
  const openTabs = mirrorArrangeTabs.value;
  const rects = computeArrangedRects(openTabs.length, getMirrorCanvasBounds());
  if (!rects) {
    return;
  }
  openTabs.forEach((tab, index) => {
    updateMirrorWindowRect(tab.id, rects[index]);
  });
};

const setMirrorWebviewRef = (tabId, element) => {
  if (element) {
    mirrorWebviewRefs.set(tabId, element);
    return;
  }
  mirrorWebviewRefs.delete(tabId);
  // The webview unmounted (window closed, mode switched, or tab removed):
  // drop the src snapshot so a future mount resolves a fresh launch URL.
  mirrorLaunchUrls.delete(tabId);
};

const CLOCK_WIDGET_APPROX_WIDTH = 280;
const CLOCK_WIDGET_APPROX_HEIGHT = 120;

const addClockWidget = () => {
  const bounds = getMirrorCanvasBounds();
  const stagger = (mirrorWidgets.value.length % 4) * 40;
  const position = clampRectToCanvas(
    {
      x: bounds.width - CLOCK_WIDGET_APPROX_WIDTH - 48 - stagger,
      y: 48 + stagger,
      width: CLOCK_WIDGET_APPROX_WIDTH,
      height: CLOCK_WIDGET_APPROX_HEIGHT,
    },
    0,
    0
  );
  mirrorWidgets.value = [
    ...mirrorWidgets.value,
    {
      id: `widget-${suffix()}`,
      type: 'clock',
      timeZone: '',
      x: position.x,
      y: position.y,
      z: highestMirrorZ() + 1,
    },
  ];
};

const installedWidgetById = computed(() =>
  installedWidgets.value.reduce((accumulator, manifest) => {
    accumulator[manifest.id] = manifest;
    return accumulator;
  }, {})
);

const widgetCatalogEntries = computed(() => [
  ...builtinWidgets.map((widget) => ({ ...widget, source: 'Built-in' })),
  ...installedWidgets.value.map((manifest) => ({
    id: manifest.id,
    kind: 'package',
    title: manifest.name,
    description: manifest.description || 'Installed widget package.',
    taxonomies: manifest.tags?.length ? manifest.tags : ['custom'],
    icon: manifest.icon ? `chappy-widget://${manifest.id}/${manifest.icon}` : '',
    source: manifest.version ? `Installed · v${manifest.version}` : 'Installed',
  })),
]);

// Keyed by catalog entry as `${kind}:${id}` so a package can never collide
// with a built-in widget that shares its id.
const widgetCountById = computed(() =>
  mirrorWidgets.value.reduce((accumulator, widget) => {
    const key = widget.type === 'clock' ? 'native:clock' : `package:${widget.widgetId}`;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {})
);

const packageWidgetMinWidth = (widget) =>
  Math.max(PACKAGE_WIDGET_MIN_WIDTH, installedWidgetById.value[widget.widgetId]?.minSize?.width || 0);
const packageWidgetMinHeight = (widget) =>
  Math.max(PACKAGE_WIDGET_MIN_HEIGHT, installedWidgetById.value[widget.widgetId]?.minSize?.height || 0);

const widgetInstanceLabel = (widget) =>
  widget.type === 'clock' ? 'Clock' : installedWidgetById.value[widget.widgetId]?.name || widget.widgetId;

const widgetInstanceDetail = (widget) => {
  if (widget.type === 'clock') {
    return widget.timeZone || 'Local time';
  }
  const manifest = installedWidgetById.value[widget.widgetId];
  if (!manifest) {
    return 'Package not installed';
  }
  return manifest.version ? `Widget package · v${manifest.version}` : 'Widget package';
};

const widgetInstanceIcon = (widget) => {
  if (widget.type === 'clock') {
    return builtinWidgets.find((entry) => entry.id === 'clock')?.icon || defaultIcon;
  }
  const manifest = installedWidgetById.value[widget.widgetId];
  return manifest?.icon ? `chappy-widget://${manifest.id}/${manifest.icon}` : defaultIcon;
};

const loadInstalledWidgets = async () => {
  if (typeof chappyApi?.listWidgets !== 'function') {
    return;
  }
  try {
    const manifests = await chappyApi.listWidgets();
    installedWidgets.value = Array.isArray(manifests) ? manifests : [];
  } catch (error) {
    console.error('Failed to list installed widgets.', error);
  }
};

const addPackageWidget = (widgetId) => {
  const manifest = installedWidgetById.value[widgetId];
  const width = manifest?.defaultSize?.width || PACKAGE_WIDGET_DEFAULT_WIDTH;
  const height = manifest?.defaultSize?.height || PACKAGE_WIDGET_DEFAULT_HEIGHT;
  const stagger = (mirrorWidgets.value.length % 4) * 40;
  const rect = clampRectToCanvas(
    { x: 48 + stagger, y: 48 + stagger, width, height },
    Math.max(PACKAGE_WIDGET_MIN_WIDTH, manifest?.minSize?.width || 0),
    Math.max(PACKAGE_WIDGET_MIN_HEIGHT, manifest?.minSize?.height || 0)
  );
  mirrorWidgets.value = [
    ...mirrorWidgets.value,
    {
      id: `widget-${suffix()}`,
      type: 'package',
      widgetId,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      z: highestMirrorZ() + 1,
    },
  ];
};

const addWidgetFromCatalog = (entry) => {
  if (!isMirrorMode.value) {
    showToast('Enable Mirror display to use widgets');
    return;
  }
  if (entry.kind === 'package') {
    const manifest = installedWidgetById.value[entry.id];
    if (manifest?.multiInstance === false && (widgetCountById.value[`package:${entry.id}`] || 0) > 0) {
      showToast(`${entry.title} allows only one instance`);
      return;
    }
    addPackageWidget(entry.id);
  } else if (entry.id === 'clock') {
    addClockWidget();
  } else {
    return;
  }
  showToast(`${entry.title} added to your mirror canvas`);
};

const uninstallWidget = async (entry) => {
  if (entry.kind !== 'package' || typeof chappyApi?.removeWidget !== 'function') {
    return;
  }
  try {
    const result = await chappyApi.removeWidget({ widgetId: entry.id });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    await loadInstalledWidgets();
    showToast(`${entry.title} uninstalled`);
  } catch (error) {
    showToast('Could not uninstall widget');
  }
};

const installWidgetFile = async (file) => {
  if (!file) {
    return;
  }
  if (typeof chappyApi?.installWidget !== 'function') {
    widgetInstallStatus.value = 'Widget install is unavailable in this build.';
    return;
  }
  widgetInstallStatus.value = 'Installing…';
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = await chappyApi.installWidget({ name: file.name, buffer });
    if (result?.error) {
      widgetInstallStatus.value = result.error;
      return;
    }
    await loadInstalledWidgets();
    const installedId = result?.manifest?.id;
    if (installedId) {
      widgetReloadNonces.value = {
        ...widgetReloadNonces.value,
        [installedId]: (widgetReloadNonces.value[installedId] || 0) + 1,
      };
    }
    widgetInstallStatus.value = '';
    showToast(`${result?.manifest?.name || 'Widget'} ${result?.replaced ? 'updated' : 'installed'}`);
  } catch (error) {
    widgetInstallStatus.value = 'Could not install that file.';
  }
};

const handleWidgetDrop = (event) => {
  isDraggingWidgetFile.value = false;
  void installWidgetFile(event.dataTransfer?.files?.[0]);
};

const handleWidgetDragLeave = (event) => {
  // dragleave also fires when crossing onto the zone's own children; only a
  // move that actually exits the zone should clear the highlight.
  if (event.currentTarget?.contains?.(event.relatedTarget)) {
    return;
  }
  isDraggingWidgetFile.value = false;
};

const handleWidgetFileInput = (event) => {
  const input = event.target;
  void installWidgetFile(input?.files?.[0]);
  if (input) {
    input.value = '';
  }
};

// Every display-mode change comes through here: the switch that triggers it
// lives inside the Chappy panel, so the panel must survive the switch. The two
// modes express "the panel is showing" differently — Mirror uses the panel flag,
// Desktop uses activeTabId — so both are reset, or the user is dumped into
// whichever service happened to be focused on the mirror.
const setDisplayMode = (value) => {
  const next = normalizeDisplayMode(value);
  if (displayMode.value === next) {
    return;
  }
  displayMode.value = next;
  isChappyPanelOpen.value = true;
  activeTabId.value = 'chappy';
};

const enableMirrorMode = () => {
  setDisplayMode('mirror');
};

const goToWidgetsTab = () => {
  selectTab('chappy');
  setChappyWorkspaceTab('widgets');
};

const removeMirrorWidget = (widgetId) => {
  mirrorWidgets.value = mirrorWidgets.value.filter((widget) => widget.id !== widgetId);
};

const focusMirrorWidget = (widgetId) => {
  const top = highestMirrorZ();
  mirrorWidgets.value = mirrorWidgets.value.map((widget) => {
    if (widget.id !== widgetId || widget.z === top) {
      return widget;
    }
    return { ...widget, z: top + 1 };
  });
};

const updateMirrorWidgetRect = (widgetId, rect) => {
  const widget = mirrorWidgets.value.find((candidate) => candidate.id === widgetId);
  if (!widget) {
    return;
  }
  // Package widgets persist their size; clocks size to content, so only their
  // position is stored.
  const isPackage = widget.type === 'package';
  const clamped = clampRectToCanvas(
    rect,
    isPackage ? packageWidgetMinWidth(widget) : 0,
    isPackage ? packageWidgetMinHeight(widget) : 0
  );
  const next = isPackage
    ? { ...widget, ...clamped }
    : { ...widget, x: clamped.x, y: clamped.y };
  if (Object.keys(next).every((key) => next[key] === widget[key])) {
    return;
  }
  mirrorWidgets.value = mirrorWidgets.value.map((candidate) =>
    candidate.id === widgetId ? next : candidate
  );
};

const setMirrorWidgetTimeZone = (widgetId, timeZone) => {
  mirrorWidgets.value = mirrorWidgets.value.map((widget) =>
    widget.id === widgetId ? { ...widget, timeZone: typeof timeZone === 'string' ? timeZone : '' } : widget
  );
};

// Persisted geometry can reference a canvas that no longer exists (smaller
// display, resized window). Re-clamp everything whenever the canvas appears or
// the app window resizes, so no window or widget is stranded off-canvas.
const clampAllMirrorItems = () => {
  if (!mirrorCanvasRef.value) {
    return;
  }
  tabs.value.forEach((tab) => {
    if (tab.mirrorWindow) {
      updateMirrorWindowRect(tab.id, tab.mirrorWindow);
    }
  });
  mirrorWidgets.value.forEach((widget) => {
    updateMirrorWidgetRect(widget.id, {
      x: widget.x,
      y: widget.y,
      width: widget.type === 'package' ? widget.width : CLOCK_WIDGET_APPROX_WIDTH,
      height: widget.type === 'package' ? widget.height : CLOCK_WIDGET_APPROX_HEIGHT,
    });
  });
};

watch(
  mirrorCanvasRef,
  (canvas) => {
    if (canvas) {
      clampAllMirrorItems();
    }
  },
  { flush: 'post' }
);

// A hidden canvas (Chappy panel open) measures 0 x 0; ignore it so the last
// real size survives a hide/show cycle and the glyph does not flicker.
const syncMirrorCanvasSize = () => {
  const el = mirrorCanvasRef.value;
  if (!el || el.clientWidth <= 0 || el.clientHeight <= 0) {
    return;
  }
  if (el.clientWidth === mirrorCanvasSize.value.width && el.clientHeight === mirrorCanvasSize.value.height) {
    return;
  }
  mirrorCanvasSize.value = { width: el.clientWidth, height: el.clientHeight };
};

let mirrorCanvasObserver = null;
const disconnectMirrorCanvasObserver = () => {
  if (mirrorCanvasObserver) {
    mirrorCanvasObserver.disconnect();
    mirrorCanvasObserver = null;
  }
};

watch(
  mirrorCanvasRef,
  (canvas) => {
    disconnectMirrorCanvasObserver();
    if (!canvas) {
      return;
    }
    syncMirrorCanvasSize();
    if (typeof ResizeObserver === 'function') {
      mirrorCanvasObserver = new ResizeObserver(syncMirrorCanvasSize);
      mirrorCanvasObserver.observe(canvas);
    }
  },
  { flush: 'post' }
);

let mirrorResizeTimeout = null;
const handleWindowResize = () => {
  if (!isMirrorMode.value) {
    return;
  }
  syncMirrorCanvasSize();
  if (mirrorResizeTimeout) {
    clearTimeout(mirrorResizeTimeout);
  }
  mirrorResizeTimeout = setTimeout(clampAllMirrorItems, 200);
};

// Persisted z values grow with every open/focus; compacting them to 1..N at
// load keeps them well below fixed chrome layers for the life of the config.
const normalizeMirrorZOrder = () => {
  const items = [];
  tabs.value.forEach((tab) => {
    if (tab.mirrorWindow) {
      items.push({ key: `tab:${tab.id}`, z: tab.mirrorWindow.z || 0 });
    }
  });
  mirrorWidgets.value.forEach((widget) => {
    items.push({ key: `widget:${widget.id}`, z: widget.z || 0 });
  });
  if (!items.length) {
    return;
  }
  items.sort((a, b) => a.z - b.z);
  const zByKey = new Map(items.map((item, index) => [item.key, index + 1]));
  tabs.value = tabs.value.map((tab) =>
    tab.mirrorWindow
      ? { ...tab, mirrorWindow: { ...tab.mirrorWindow, z: zByKey.get(`tab:${tab.id}`) } }
      : tab
  );
  mirrorWidgets.value = mirrorWidgets.value.map((widget) => ({
    ...widget,
    z: zByKey.get(`widget:${widget.id}`),
  }));
};

const newTab = reactive({
  title: '',
  url: ''
});

const quickAddError = ref('');
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

const resolveWebviewForTabId = (tabId) => {
  if (tabId === 'chappy') {
    return null;
  }
  if (isMirrorMode.value) {
    return mirrorWebviewRefs.get(tabId) || null;
  }
  if (preserveTabMemory.value) {
    return preservedWebviewRefs.get(tabId) || null;
  }
  return singleWebviewRef.value;
};

const syncUnreadStateFromTitle = (tabId, title) => {
  if (tabId === 'chappy') {
    return;
  }
  setUnreadStateForTab(tabId, parseUnreadStateFromTitle(title));
};

const syncAppBadgeCount = () => {
  if (typeof chappyApi?.setBadgeCount !== 'function') {
    return;
  }
  void chappyApi.setBadgeCount(totalUnreadBadgeCount.value).catch(() => {});
};

const EXTRACT_ICON_SCRIPT = `(function(){
  var links = document.querySelectorAll('link[rel*="apple-touch-icon"], link[rel*="shortcut"][rel*="icon"], link[rel="icon"]');
  var appleTouch = [], shortcut = [], generic = [];
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var rel = (link.getAttribute('rel') || '').toLowerCase();
    var href = link.href;
    if (!href) continue;
    var sizes = link.getAttribute('sizes') || '';
    var m = sizes.match(/(\\d+)\\s*x\\s*(\\d+)/i);
    var px = m ? Math.min(parseInt(m[1],10), parseInt(m[2],10)) : 0;
    if (rel.indexOf('apple-touch-icon') !== -1) {
      appleTouch.push({ url: href, px: px });
    } else if (rel.indexOf('shortcut') !== -1 && rel.indexOf('icon') !== -1) {
      shortcut.push({ url: href });
    } else if (rel === 'icon') {
      generic.push({ url: href });
    }
  }
  if (appleTouch.length) {
    appleTouch.sort(function(a,b){ return b.px - a.px; });
    var r = appleTouch.find(function(c){ return c.px >= 96 && c.px <= 180; }) || appleTouch[0];
    return r.url;
  }
  if (shortcut.length) return shortcut[0].url;
  if (generic.length) return generic[0].url;
  try { return new URL('/favicon.ico', window.location.href).toString(); } catch(e){ return null; }
})()`;

const syncUnreadStateFromWebviewTitle = (tabId) => {
  if (tabId === 'chappy') {
    return;
  }
  const webview = resolveWebviewForTabId(tabId);
  if (!webview || typeof webview.getTitle !== 'function') {
    return;
  }
  try {
    syncUnreadStateFromTitle(tabId, webview.getTitle());
  } catch (error) {
    // webview might not be ready for title inspection yet
  }
};

const handleWebviewDomReady = (tabId) => {
  syncUnreadStateFromWebviewTitle(tabId);
  const tab = tabs.value.find((t) => t.id === tabId);
  if (!tab || tab.iconId !== 'custom' || tab.primaryIconPath || !chappyApi?.fetchAndSaveIcon) {
    return;
  }
  const webview = resolveWebviewForTabId(tabId);
  if (!webview || typeof webview.executeJavaScript !== 'function') {
    return;
  }
  void webview.executeJavaScript(EXTRACT_ICON_SCRIPT).then((iconUrl) => {
    if (!iconUrl || typeof iconUrl !== 'string') return;
    chappyApi.fetchAndSaveIcon({ iconUrl, tabId }).then((result) => {
      if (result?.path) {
        updateTabById(tabId, (t) => ({
          ...t,
          primaryIconPath: result.path,
          icon: `chappy-icon://local/${result.path}`,
        }));
      }
    }).catch(() => {});
  }).catch(() => {});
};

const handleWebviewTitleUpdatedForTab = (tabId, event) => {
  syncUnreadStateFromTitle(tabId, event?.title);
};

const logWebviewEvent = (tabId, label, payload = {}) => {
  const tab = tabs.value.find((candidate) => candidate.id === tabId);
  const tabLabel = tab?.title || tabId;
  console.info(`[Chappy][Webview][${tabLabel}] ${label}`, payload);
};

const handleWebviewNavigationTrace = (tabId, label, event) => {
  if (tabId === 'chappy') {
    return;
  }
  logWebviewEvent(tabId, label, {
    url: event?.url || '',
    isMainFrame: event?.isMainFrame,
    isInPlace: event?.isInPlace,
  });
};

const handleWebviewNavigationFailure = (tabId, event) => {
  if (tabId === 'chappy') {
    return;
  }
  logWebviewEvent(tabId, 'did-fail-load', {
    url: event?.validatedURL || event?.url || '',
    errorCode: event?.errorCode,
    errorDescription: event?.errorDescription || '',
    isMainFrame: event?.isMainFrame,
  });
};

const captureActiveWebviewUrl = () => {
  if (activeTabId.value === 'chappy') {
    return;
  }
  const webview = resolveWebviewForTabId(activeTabId.value);
  if (!webview || typeof webview.getURL !== 'function') {
    return;
  }
  try {
    persistLastUrlForTab(activeTabId.value, webview.getURL());
  } catch (error) {
    // webview might not be ready for URL inspection yet
  }
};

const forceTabToLaunchUrl = (tabId) => {
  if (tabId === 'chappy') {
    return false;
  }
  const tab = tabs.value.find((candidate) => candidate.id === tabId);
  if (!tab) {
    return false;
  }
  const targetUrl = resolveLaunchUrl(tab);
  if (!targetUrl) {
    return false;
  }
  const webview = resolveWebviewForTabId(tabId);
  if (!webview || typeof webview.loadURL !== 'function') {
    return false;
  }
  logWebviewEvent(tabId, 'force-launch-url', {
    launchMode: tab.launchMode,
    targetUrl,
  });
  try {
    void webview.loadURL(targetUrl);
    return true;
  } catch (error) {
    logWebviewEvent(tabId, 'force-launch-url-failed', {
      launchMode: tab.launchMode,
      targetUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

const selectTab = (id) => {
  if (isMirrorMode.value) {
    if (id === 'chappy') {
      isChappyPanelOpen.value = true;
      return;
    }
    // Mirror mode: services live in floating windows, so a sidebar click opens
    // (or re-focuses) the window instead of swapping a full-bleed view, and
    // reveals the canvas the window lives on.
    captureActiveWebviewUrl();
    isChappyPanelOpen.value = false;
    openMirrorWindowForTab(id);
    activeTabId.value = id;
    syncUnreadStateFromWebviewTitle(id);
    return;
  }
  if (id === activeTabId.value) {
    forceTabToLaunchUrl(id);
    return;
  }
  captureActiveWebviewUrl();
  if (preserveTabMemory.value) {
    markTabLoaded(id);
  }
  activeTabId.value = id;
  if (id !== 'chappy') {
    syncUnreadStateFromWebviewTitle(id);
  }
};

// Mirror only: the panel floats over a live canvas, so it can be dismissed
// without picking a service. Desktop has nothing to fall back to, so the Chappy
// button there keeps its plain select-the-tab behaviour.
const hideChappyPanel = () => {
  if (!isMirrorMode.value) {
    return;
  }
  isChappyPanelOpen.value = false;
};

const toggleChappyPanel = () => {
  if (!isMirrorMode.value) {
    selectTab('chappy');
    return;
  }
  if (isChappyPanelOpen.value) {
    hideChappyPanel();
    return;
  }
  isChappyPanelOpen.value = true;
};

const setChappyWorkspaceTab = (value) => {
  chappyWorkspaceTab.value = chappyWorkspaceTabValues.has(value) ? value : 'your-chappy';
};

const openSettings = (tab) => {
  editingTab.value = tab;
  isSettingsModalOpen.value = true;
};

const closeSettingsModal = () => {
  isSettingsModalOpen.value = false;
  editingTab.value = null;
};

const handleFetchIconFromWebsite = async () => {
  const tab = editingTab.value;
  if (!tab || !tab.url || !chappyApi?.fetchIconFromUrl) {
    showToast(tab?.url ? 'Icon fetch unavailable' : 'No URL to fetch from');
    return;
  }
  try {
    const result = await chappyApi.fetchIconFromUrl({ pageUrl: tab.url, tabId: tab.id });
    if (result?.path) {
      const updated = {
        primaryIconPath: result.path,
        icon: `chappy-icon://local/${result.path}`,
      };
      updateTabById(tab.id, (t) => ({ ...t, ...updated }));
      editingTab.value = { ...editingTab.value, ...updated };
      showToast('Icon added from website');
    } else {
      showToast('No icon found on website');
    }
  } catch {
    showToast('Could not fetch icon from website');
  }
};

const handleSaveSettings = (updatedTab) => {
  const normalizedCustomLaunchUrl = normalizeHttpsUrl(updatedTab.customLaunchUrl);
  const launchMode = isLaunchMode(updatedTab.launchMode) ? updatedTab.launchMode : 'default';
  updateTabById(updatedTab.id, (tab) => {
    const base = {
      ...tab,
      customLaunchUrl: normalizedCustomLaunchUrl,
      launchMode: launchMode === 'custom' && !normalizedCustomLaunchUrl ? 'default' : launchMode,
      secondaryIconPath: updatedTab.secondaryIconPath,
    };
    if (tab.iconId === 'custom') {
      base.primaryIconPath = updatedTab.primaryIconPath;
      base.icon =
        updatedTab.primaryIconPath
          ? `chappy-icon://local/${updatedTab.primaryIconPath}`
          : resolveIconById('custom');
    }
    return base;
  });
  closeSettingsModal();
};

const quickAdd = () => {
  quickAddError.value = '';
  const trimmed = quickAddUrl.value.trim();
  if (!trimmed) {
    quickAddError.value = 'Enter a URL.';
    return;
  }
  const normalizedUrl = ensureHttpsUrl(trimmed);
  if (!normalizedUrl) {
    quickAddError.value = 'Enter a valid URL (e.g. discord.com or https://example.com).';
    return;
  }
  const matchedService = findServiceByUrl(normalizedUrl);
  if (matchedService) {
    addService(matchedService);
  } else {
    addTabFromUrl(normalizedUrl, inferNameFromUrl(normalizedUrl));
  }
  quickAddUrl.value = '';
};

const clearQuickAdd = () => {
  quickAddUrl.value = '';
  quickAddError.value = '';
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
  if (preserveTabMemory.value) {
    markTabLoaded(id);
  }
  activeTabId.value = id;
  if (isMirrorMode.value) {
    openMirrorWindowForTab(id);
  }
};

const addTabFromUrl = (url, title) => {
  const id = ensureUniqueTabId(title || 'custom');
  const partition = ensureUniquePartition(generatePartitionKey(title || 'custom'));
  const color = accentColors[tabs.value.length % accentColors.length];

  tabs.value = [
    ...tabs.value,
    {
      id,
      title: title || inferNameFromUrl(url),
      url,
      color,
      iconId: 'custom',
      icon: resolveIconById('custom'),
      partition,
      customLaunchUrl: '',
      launchMode: 'default',
      lastUrl: '',
    }
  ];

  if (preserveTabMemory.value) {
    markTabLoaded(id);
  }
  activeTabId.value = id;
  if (isMirrorMode.value) {
    openMirrorWindowForTab(id);
  }

  void (async () => {
    const hasApi = !!chappyApi?.fetchIconFromUrl;
    if (!hasApi) {
      return;
    }
    try {
      const result = await chappyApi.fetchIconFromUrl({ pageUrl: url, tabId: id });
      if (result?.path) {
        const updated = {
          primaryIconPath: result.path,
          icon: `chappy-icon://local/${result.path}`,
        };
        updateTabById(id, (tab) => ({ ...tab, ...updated }));
        if (editingTab.value?.id === id) {
          editingTab.value = { ...editingTab.value, ...updated };
        }
        showToast('Icon added from website');
      }
    } catch (err) {
      showToast('Could not fetch icon from website');
    }
  })();
};

const addTab = () => {
  titleError.value = '';
  urlError.value = '';

  const trimmedTitle = newTab.title.trim();
  if (!trimmedTitle) {
    titleError.value = 'Name is required.';
    return;
  }

  const rawUrl = newTab.url.trim();
  const trimmedUrl = ensureHttpsUrl(rawUrl);
  if (!trimmedUrl) {
    urlError.value = 'A valid URL is required (e.g. discord.com or https://example.com).';
    return;
  }

  const matchedService = findServiceByUrl(trimmedUrl);
  if (matchedService) {
    newTab.title = '';
    newTab.url = '';
    addService(matchedService);
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
  if (preserveTabMemory.value) {
    markTabLoaded(id);
  }
  activeTabId.value = id;
  if (isMirrorMode.value) {
    openMirrorWindowForTab(id);
  }

  void (async () => {
    const hasApi = !!chappyApi?.fetchIconFromUrl;
    if (!hasApi) {
      showToast('Icon fetch unavailable');
      return;
    }
    try {
      const result = await chappyApi.fetchIconFromUrl({ pageUrl: trimmedUrl, tabId: id });
      if (result?.path) {
        const updated = {
          primaryIconPath: result.path,
          icon: `chappy-icon://local/${result.path}`,
        };
        updateTabById(id, (tab) => ({ ...tab, ...updated }));
        if (editingTab.value?.id === id) {
          editingTab.value = { ...editingTab.value, ...updated };
        }
        showToast('Icon added from website');
      }
    } catch (err) {
      showToast('Could not fetch icon from website');
    }
  })();
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

watch(
  () => tabs.value.map((tab) => tab.id),
  (tabIds) => {
    const validIds = new Set(tabIds);
    loadedTabIds.value = loadedTabIds.value.filter((id) => validIds.has(id));
    const nextUnreadStateByTabId = Object.fromEntries(
      Object.entries(unreadStateByTabId.value).filter(([tabId]) => validIds.has(tabId))
    );
    if (Object.keys(nextUnreadStateByTabId).length !== Object.keys(unreadStateByTabId.value).length) {
      unreadStateByTabId.value = nextUnreadStateByTabId;
    }
  },
  { immediate: true }
);

watch(totalUnreadBadgeCount, () => {
  syncAppBadgeCount();
}, { immediate: true });

watch([activeTabId, preserveTabMemory], ([tabId, shouldPreserve]) => {
  if (shouldPreserve) {
    markTabLoaded(tabId);
  }
});

watch(openServicesOnLaunch, (shouldOpenOnLaunch) => {
  if (shouldOpenOnLaunch) {
    if (!preserveTabMemory.value) {
      preserveTabMemory.value = true;
    }
    preloadAllServiceTabs();
    return;
  }
});

watch(preserveTabMemory, (shouldPreserve) => {
  if (!shouldPreserve && openServicesOnLaunch.value) {
    openServicesOnLaunch.value = false;
  }
});

const lastUpdateCheckLabel = computed(() => {
  const ts = lastUpdateCheck.value;
  if (!ts) return 'never';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return 'never';
  }
});

const isUpdateReady = computed(() => appUpdate.value.state === 'ready');
const isUpdateBusy = computed(() => appUpdate.value.state === 'checking' || appUpdate.value.state === 'downloading');

const updateStatusLabel = computed(() => {
  const update = appUpdate.value;
  switch (update.state) {
    case 'checking':
      return 'Checking for updates…';
    case 'downloading':
      return update.version ? `Downloading v${update.version} (${update.percent}%)` : 'Downloading update…';
    case 'ready':
      return `v${update.version} is downloaded and ready to install`;
    case 'up-to-date':
      return "You're up to date";
    case 'error':
      return update.error ? `Update failed: ${update.error}` : 'Update check failed';
    case 'unsupported':
      return 'Updates apply to installed builds only';
    default:
      return `Last checked: ${lastUpdateCheckLabel.value}`;
  }
});

const updateButtonLabel = computed(() => {
  switch (appUpdate.value.state) {
    case 'checking':
      return 'Checking…';
    case 'downloading':
      return 'Downloading…';
    case 'ready':
      return 'Restart to update';
    case 'error':
      return 'Check again';
    default:
      return 'Check for update';
  }
});

watch([tabs, activeTabId, themePreference, displayMode, isChappyPanelOpen, autoHideServicesMenu, mirrorWidgets, useSystemBrowserLinks, preserveTabMemory, openServicesOnLaunch, enableAutoUpdate], () => {
  void persistConfig();
}, { deep: true });

const handleWebViewNavigationForTab = (tabId, event) => {
  if (tabId === 'chappy') {
    return;
  }
  logWebviewEvent(tabId, 'did-navigate', {
    url: event?.url || '',
    isMainFrame: event?.isMainFrame,
    isInPlace: event?.isInPlace,
  });
  persistLastUrlForTab(tabId, event?.url);
};

const handleWebViewInPageNavigationForTab = (tabId, event) => {
  if (tabId === 'chappy') {
    return;
  }
  logWebviewEvent(tabId, 'did-navigate-in-page', {
    url: event?.url || '',
    isMainFrame: event?.isMainFrame,
    isInPlace: event?.isInPlace,
  });
  persistLastUrlForTab(tabId, event?.url);
};

const showToast = (message) => {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.value = message;
  toastTimeout = setTimeout(() => {
    toastMessage.value = null;
    toastTimeout = null;
  }, 3000);
};

const applyUpdateStatus = (status) => {
  if (!status || typeof status !== 'object') return;
  const previousState = appUpdate.value.state;
  appUpdate.value = {
    state: typeof status.state === 'string' ? status.state : 'idle',
    version: typeof status.version === 'string' ? status.version : null,
    percent: Number.isFinite(status.percent) ? status.percent : 0,
    error: typeof status.error === 'string' ? status.error : null
  };
  // A newly staged update re-arms the toast even if an earlier one was closed.
  if (appUpdate.value.state === 'ready' && previousState !== 'ready') {
    isUpdateToastDismissed.value = false;
  }
};

const handleCheckForUpdate = async () => {
  if (!chappyApi?.checkForUpdate) return;
  appUpdate.value = { ...appUpdate.value, state: 'checking', error: null };
  try {
    const result = await chappyApi.checkForUpdate();
    applyUpdateStatus(result);
    lastUpdateCheck.value = new Date().toISOString();
    if (result?.state === 'up-to-date') {
      showToast("You're up to date");
    } else if (result?.state === 'error') {
      showToast('Could not check for updates. Try again.');
    }
  } catch {
    appUpdate.value = { ...appUpdate.value, state: 'error', error: 'Update check failed' };
    showToast('Could not check for updates. Try again.');
  }
};

const handleInstallUpdate = () => {
  if (chappyApi?.installUpdate) {
    void chappyApi.installUpdate();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('dragover', suppressWindowDrop);
  window.addEventListener('drop', suppressWindowDrop);
  handleSystemThemeChange();
  if (prefersDarkMediaQuery) {
    if (typeof prefersDarkMediaQuery.addEventListener === 'function') {
      prefersDarkMediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof prefersDarkMediaQuery.addListener === 'function') {
      prefersDarkMediaQuery.addListener(handleSystemThemeChange);
    }
  }
  if (chappyApi?.onUpdateStatus) {
    chappyApi.onUpdateStatus(applyUpdateStatus);
  }
  void chappyApi?.getAppVersion?.().then((version) => {
    if (typeof version === 'string') {
      appVersion.value = version;
    }
  }).catch(() => {});
  void loadInstalledWidgets();
  void loadConfig().then(async () => {
    // A background check may already have staged an update before the
    // renderer mounted; pick up its state rather than waiting for the next event.
    const status = await chappyApi?.getUpdateStatus?.().catch(() => null);
    applyUpdateStatus(status);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('dragover', suppressWindowDrop);
  window.removeEventListener('drop', suppressWindowDrop);
  if (mirrorResizeTimeout) {
    clearTimeout(mirrorResizeTimeout);
    mirrorResizeTimeout = null;
  }
  disconnectMirrorCanvasObserver();
  clearServicesMenuHideTimer();
  if (typeof chappyApi?.setBadgeCount === 'function') {
    void chappyApi.setBadgeCount(0).catch(() => {});
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
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

<template>
  <div class="widget-catalog">
    <div v-if="showFilters" class="widget-filter-bar flex flex-wrap items-center gap-3">
      <span class="text-xs font-semibold uppercase tracking-widest text-slate-400">Filter:</span>
      <label
        class="taxonomy-checkbox inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
        :class="selectedTaxonomies.size === 0
          ? 'border-sky-500 bg-sky-500/20 text-sky-400'
          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'"
      >
        <input type="checkbox" :checked="selectedTaxonomies.size === 0" class="hidden" @change="clearFilters" />
        <span class="flex h-4 w-4 items-center justify-center rounded">
          <svg v-if="selectedTaxonomies.size === 0" class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </span>
        Show All
      </label>
      <label
        v-for="taxonomy in availableTaxonomies"
        :key="taxonomy.key"
        class="taxonomy-checkbox inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
        :class="selectedTaxonomies.has(taxonomy.key)
          ? 'border-sky-500 bg-sky-500/20 text-sky-400'
          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'"
      >
        <input type="checkbox" :checked="selectedTaxonomies.has(taxonomy.key)" class="hidden" @change="toggleTaxonomy(taxonomy.key)" />
        <span
          class="flex h-4 w-4 items-center justify-center rounded border transition"
          :class="selectedTaxonomies.has(taxonomy.key) ? 'border-sky-500 bg-sky-500' : 'border-slate-600'"
        >
          <svg v-if="selectedTaxonomies.has(taxonomy.key)" class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </span>
        <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: taxonomy.color }"></span>
        {{ taxonomy.label }}
      </label>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" :class="showFilters ? 'mt-5' : ''">
      <article
        v-for="entry in filteredEntries"
        :key="`${entry.kind}-${entry.id}`"
        :id="`widget-catalog-${entry.kind}-${entry.id}`"
        class="service-card widget-card flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-[0_10px_25px_rgba(2,6,23,0.7)] transition hover:border-sky-500/60"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <img
              :src="entry.icon || defaultIconUrl"
              alt=""
              aria-hidden="true"
              class="h-8 w-8 object-contain"
              loading="lazy"
              @error="handleIconError"
            />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white">{{ entry.title }}</p>
            <p class="text-xs text-slate-400">{{ entry.description }}</p>
            <div v-if="entry.taxonomies?.length" class="mt-1.5 flex flex-wrap gap-1">
              <span
                v-for="taxonomyKey in entry.taxonomies"
                :key="taxonomyKey"
                class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                :style="{
                  borderColor: taxonomyColor(taxonomyKey),
                  color: taxonomyColor(taxonomyKey),
                  backgroundColor: taxonomyColor(taxonomyKey) + '15'
                }"
              >
                <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: taxonomyColor(taxonomyKey) }"></span>
                {{ taxonomyLabel(taxonomyKey) }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-3 flex min-h-[36px] items-center justify-between gap-2 text-xs text-slate-400">
          <span class="truncate">{{ entry.source }}</span>
          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="entry.kind === 'package'"
              type="button"
              class="widget-uninstall-button rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300"
              data-ref="widget-uninstall-button"
              @click="$emit('uninstall', entry)"
            >
              Uninstall
            </button>
            <button
              type="button"
              class="service-add-button rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest shadow-[0_10px_25px_rgba(15,23,42,0.65)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              data-ref="widget-add-button"
              :disabled="!addEnabled"
              :title="addEnabled ? '' : 'Enable Mirror display to use widgets'"
              @click="$emit('add', entry)"
            >
              {{ (counts[`${entry.kind}:${entry.id}`] || 0) > 0 ? 'ADD +1' : 'ADD' }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <p v-if="!filteredEntries.length" class="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
      No widgets match the selected filters.
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { widgetTaxonomies, FALLBACK_TAXONOMY_COLOR } from '../data/widgetCatalog.mjs';
import defaultIconUrl from '../assets/icons/custom.svg?url';

const props = defineProps({
  entries: { type: Array, required: true },
  showFilters: { type: Boolean, default: false },
  addEnabled: { type: Boolean, default: true },
  counts: { type: Object, default: () => ({}) },
});

defineEmits(['add', 'uninstall']);

const selectedTaxonomies = ref(new Set());

const taxonomyColor = (key) => widgetTaxonomies[key]?.color || FALLBACK_TAXONOMY_COLOR;
const taxonomyLabel = (key) => widgetTaxonomies[key]?.label || key;

// Known taxonomies first (in definition order), then any unknown package tags.
const availableTaxonomies = computed(() => {
  const present = new Set();
  props.entries.forEach((entry) => (entry.taxonomies || []).forEach((key) => present.add(key)));
  const known = Object.keys(widgetTaxonomies).filter((key) => present.has(key));
  const unknown = [...present].filter((key) => !widgetTaxonomies[key]).sort();
  return [...known, ...unknown].map((key) => ({ key, label: taxonomyLabel(key), color: taxonomyColor(key) }));
});

const filteredEntries = computed(() => {
  if (selectedTaxonomies.value.size === 0) {
    return props.entries;
  }
  return props.entries.filter((entry) =>
    entry.taxonomies?.some((key) => selectedTaxonomies.value.has(key))
  );
});

const toggleTaxonomy = (key) => {
  const next = new Set(selectedTaxonomies.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  selectedTaxonomies.value = next;
};

const clearFilters = () => {
  selectedTaxonomies.value = new Set();
};

const handleIconError = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || target.dataset.iconFallbackApplied === '1') {
    return;
  }
  target.dataset.iconFallbackApplied = '1';
  target.src = defaultIconUrl;
};
</script>

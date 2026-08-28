// Widget taxonomy definitions for the Widgets tab filter bar. Installed
// packages may declare tags outside this map — those get a neutral chip.
export const widgetTaxonomies = {
  time: { label: 'Time', color: '#38bdf8' },
  weather: { label: 'Weather', color: '#f97316' },
  info: { label: 'Info', color: '#10b981' },
  custom: { label: 'Custom', color: '#a855f7' }
};

export const FALLBACK_TAXONOMY_COLOR = '#64748b';

// Shared session for all packaged-widget webviews; must match main.js. The
// chappy-widget protocol is registered on exactly this partition.
export const WIDGET_SESSION_PARTITION = 'persist:chappy-widgets';

// Widget id / tag slug rule and package geometry limits. main.js keeps CJS
// copies of these (it cannot import this ESM module) — keep them in sync.
export const WIDGET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const PACKAGE_WIDGET_MIN_WIDTH = 120;
export const PACKAGE_WIDGET_MIN_HEIGHT = 80;
export const PACKAGE_WIDGET_DEFAULT_WIDTH = 360;
export const PACKAGE_WIDGET_DEFAULT_HEIGHT = 280;

// Widgets implemented as Vue components inside the app itself. Packaged
// (HTML) widgets are discovered at runtime from ~/.chappy/widgets and are
// deliberately not listed here.
export const builtinWidgets = [
  {
    id: 'clock',
    kind: 'native',
    title: 'Clock',
    description: 'Minimal time and date, with an optional fixed time zone.',
    taxonomies: ['time']
  }
];

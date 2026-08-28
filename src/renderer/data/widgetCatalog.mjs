import {
  builtinWidgets as builtinWidgetsBase,
  widgetTaxonomies,
  FALLBACK_TAXONOMY_COLOR,
  WIDGET_SESSION_PARTITION,
  WIDGET_ID_PATTERN,
  PACKAGE_WIDGET_MIN_WIDTH,
  PACKAGE_WIDGET_MIN_HEIGHT,
  PACKAGE_WIDGET_DEFAULT_WIDTH,
  PACKAGE_WIDGET_DEFAULT_HEIGHT
} from './widgetCatalog.core.mjs';
import clockIconUrl from '../assets/icons/widget-clock.svg?url';

const iconByWidgetId = {
  clock: clockIconUrl
};

export {
  widgetTaxonomies,
  FALLBACK_TAXONOMY_COLOR,
  WIDGET_SESSION_PARTITION,
  WIDGET_ID_PATTERN,
  PACKAGE_WIDGET_MIN_WIDTH,
  PACKAGE_WIDGET_MIN_HEIGHT,
  PACKAGE_WIDGET_DEFAULT_WIDTH,
  PACKAGE_WIDGET_DEFAULT_HEIGHT
};

export const builtinWidgets = builtinWidgetsBase.map((widget) => ({
  ...widget,
  icon: iconByWidgetId[widget.id] || ''
}));

# Weather widget v0.2: configurable forecast, color, and scaling

- **ID:** 018
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/weather-widget-v2
- **Merged:** 2026-08-28

## Summary

Reworks the reference Weather widget (`widgets/weather/`, now v0.2.0): settings
gain a 0/3/5-day forecast choice and lose the country dropdown, today shows both
high and low, the layout scales with the widget frame, and conditions render as
bright color icons with a full WMO code map.

## Details

- **Settings**: city search only (country dropdown and the ISO region list are
  removed — the geocoding results already disambiguate). New "Forecast days"
  segmented control: Today only / 3 days / 5 days, persisted per instance and
  applied immediately when a location is already saved. Saved v0.1 locations
  default to 3 days.
- **Today**: shows both high and low next to the current temperature; the
  current temperature tints icy blue at ≤5°C and amber at ≥25°C.
- **Color**: the widget sits behind mirror glass, which eats light, so the
  palette moves from muted monochrome to bright/saturated — amber highs, sky
  lows, cyan place label, and full-color emoji condition icons.
- **Icons**: the WMO weather-code map now distinguishes clear / mainly clear /
  partly cloudy / overcast / fog / drizzle-showers / rain / snow / thunder
  instead of collapsing most precipitation codes into one umbrella glyph.
- **Scaling**: the root font size is driven by the widget's own viewport
  (`clamp(9px, 4vmin, 26px)`) and every dimension is in rem, so resizing the
  widget frame scales all of the content proportionally, live during the drag.
- The Electron smoke test derives the packed ZIP name from the widget manifest
  version instead of hardcoding `0.1.0`.

Installing the new ZIP over v0.1 exercises the update path shipped in
`017-widget-architecture.md` (same-id replace, live instance remount).

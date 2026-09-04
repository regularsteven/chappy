# Quick Add filters the services grid as you type

- **ID:** 027
- **Type:** feature
- **Severity:** trivial
- **Version bump:** patch
- **Branches:** feature/quick-add-filters-services
- **Merged:** TBD

## Summary

The Quick Add box on Chappy Screen > Configure now doubles as a search. Every keypress filters
the Available services grid by provider name or domain, and an X appears in the field to clear
it and restore the full grid.

## Details

**The problem.** The catalog has nearly thirty services across six taxonomies. Finding one
meant scrolling the grid or toggling category checkboxes, even though the user often already
knows the name or address of what they want. The Quick Add field was right there but only
did anything on Add.

**Filtering.** `filterServicesByQuery` in `serviceCatalog.core.mjs` does a plain
case-insensitive substring match against the service title and its address with the scheme
removed. `bsky.app`, `Blue`, and `Sky` all narrow the grid to BlueSky; a pasted
`https://bsky.app/` does too, because the scheme and trailing slash are stripped from the query
before comparing. Stripping the scheme on both sides means a half-typed `https://` never
lights up every card at once. The helper is pure and lives in the core module so
`scripts/check-tabs.mjs` can exercise it under Node without Vite.

**Composition with the category filter.** The taxonomy checkboxes still apply first; the
query narrows whatever they leave. A query that matches nothing shows a dashed placeholder in
place of the grid, reminding the user that Add will still open the text as a custom tab.

**Clearing.** While the field has any text a small X sits inside its right edge. Pressing it,
or Escape in the field, empties the query and any Quick Add validation error, returning the
grid to its starting state. Typing also clears a stale error so the message never lingers over
a search.

**Add is unchanged.** Enter and the Add button still turn the text into a URL, match it against
the catalog, and otherwise open a custom tab. The only new state is the computed query; nothing
here touches tabs, partitions, or webviews.

**Versioning.** Classified as a trivial feature at the user's request for the smallest possible
bump, so this ships as a patch release. Its purpose beyond the filter itself is to exercise the
in-app Settings > Check for update path against a real tagged release.

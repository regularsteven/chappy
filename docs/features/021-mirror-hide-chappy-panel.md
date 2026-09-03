# Hide the Chappy panel to get back to the Mirror

- **ID:** 021
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/mirror-hide-chappy-panel
- **Merged:** 2026-08-31

## Summary

In Mirror mode the Chappy panel (Your Chappy / Configure / Widgets / Settings) can now be
dismissed on its own — with a Hide button in the header or by pressing the Chappy icon
again — instead of only by clicking a service, which used to be the sole way back to the
mirror.

## Details

**The problem.** Mirror mode showed the Chappy panel whenever `activeTabId === 'chappy'`,
so panel visibility and mirror-window focus were the same piece of state. The only way to
dismiss the panel was to click a service in the sidebar, which also opened or re-focused
that service's floating window. There was no way to say "put the mirror back" without
picking a service, and nothing in the UI suggested that clicking a service was the way out.

**Hide button.** In Mirror mode the Chappy header gains a `Hide` button to the right of the
Light / Dark / System theme selector. It dismisses the panel and hands the workspace back
to the mirror canvas exactly as it was — same windows, same positions, same z-order. The
button is Mirror-only: Desktop mode has no canvas to fall back to.

**Chappy icon toggles.** Pressing the Chappy icon in the sidebar now toggles the panel in
Mirror mode: hide if showing, show if hidden. Its title and accessible name follow the
action (`Hide Chappy` / `Show Chappy`), and it reports `aria-expanded`. In Desktop mode the
icon keeps its existing select-the-tab behaviour.

**State model.** Panel visibility is now its own state (`isChappyPanelOpen`), separate from
`activeTabId`, and a single `isChappyViewVisible` computed drives the header, the panel, the
Desktop service pane, and the sidebar highlight so they cannot disagree. In Desktop mode it
still resolves to `activeTab.isChappy`, so that layout is unchanged.

**Sessions are preserved.** Hiding and showing only toggles `v-show`. No webview is
unmounted or re-keyed, so WhatsApp, Messenger, and every other configured service keep
their live guest pages and logins across any number of hide/show cycles.

**Persistence.** The panel state is saved as `chappyPanelOpen` (added to the main-process
config allowlist, defaulting to `true` for existing configs). A mirror left showing the
mirror comes back up as a mirror rather than as the config panel.

**Layout-mode switching.** The Desktop/Mirror switch lives inside the panel, so it now goes
through a single `setDisplayMode` that re-opens the panel and resets `activeTabId` to
`chappy`. Without that, switching from Mirror to Desktop would drop the user straight into
whichever service happened to be focused on the canvas, and the settings page they were
looking at would vanish.

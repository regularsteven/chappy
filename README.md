# Chappy

Chappy is a chat-focused browser shell built with Electron, Vue, and Tailwind. Each left-hand tab maps to an independent chat/web client, and the right-hand pane keeps the selected client full-bleed. The Chappy tab is always available so you can reorder tabs, add new ones, and keep the rail lean.

## Getting started

```bash
cd chappy
npm install
npm run dev
```

- `npm run dev` spins up Vite and Electron together. The Chappy tab is the default landing screen and the rail starts empty. Use the quick-add grid to install WhatsApp, Messenger, Discord, Telegram, Signal, Gmail, Trello, or Google Calendar; each addition keeps its own session, and duplicates are supported.
- `npm run build` produces a static renderer bundle in `dist/` and can be wired into any packaging process later.
- `npm install` runs a lightweight postinstall script that patches Electron’s Info.plist so the running binary shows “Chappy” in the macOS menu bar / Command-Tab switcher during development.

## UX notes

- The left rail is intentionally narrow. Every chat tab shows up there as a square button, and the `Chappy` button sits at the bottom so the settings are always last.
- The Chappy tab lists all registered clients, exposes reorder controls, lets you remove any entry, and keeps a form for adding new HTTPS links (Discord, Telegram, Signal, etc.).
- New tabs automatically become active so you can immediately verify they render correctly.

## Testing

- `npm test` verifies the accent palette exists and every curated service entry (WhatsApp, Messenger, Discord, etc.) ships with a valid HTTPS URL before the renderer runs.
- `npm run build` compiles the renderer bundle via Vite and confirms Tailwind/PostCSS can process the styles without runtime errors.

## Next steps

- Persist tab metadata to disk so order survives quits.
- Add per-tab session isolation helpers if you want to link to each service's local storage.
- Package the app for macOS/Windows once the workflow is stable.

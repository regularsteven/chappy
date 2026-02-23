# Chappy

Chappy is a chat-focused browser shell built with Electron, Vue, and Tailwind. Each left-hand tab maps to an independent chat/web client, and the right-hand pane keeps the selected client full-bleed. The footer always pins the `Chappy` settings tab so you can reorder tabs, add new ones, and keep the rail lean.

## Getting started

```bash
cd chappy
npm install
npm run dev
```

- `npm run dev` spins up Vite and Electron together. The Chappy tab is the default landing screen. Additional chat clients open in lightweight iframes.
- `npm run build` produces a static renderer bundle in `dist/` and can be wired into any packaging process later.

## UX notes

- The left rail is intentionally narrow. Every chat tab shows up there as a square button, and the `Chappy` button sits at the bottom so the settings are always last.
- The Chappy tab lists all registered clients, exposes reorder controls, and lets you register custom HTTPS links (Discord, Telegram, Signal, etc.).
- New tabs automatically become active so you can immediately verify they render correctly.

## Next steps

- Persist tab metadata to disk so order survives quits.
- Add per-tab session isolation helpers if you want to link to each service's local storage.
- Package the app for macOS/Windows once the workflow is stable.

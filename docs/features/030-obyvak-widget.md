# Obývák (Living Room) KNX Control Widget

- **ID:** 030
- **Type:** feature
- **Severity:** minor
- **Version bump:** minor
- **Branches:** feature/obyvak-widget
- **Merged:** 2026-09-05

## Summary

New packaged widget that controls the Blanická living room (Obývací pokoj) via the KNX/Mosaic smart home system.

## Details

Adds `widgets/obyvak/` — a self-contained HTML widget that connects to the Schneider Electric Mosaic controller at `192.168.88.4` and exposes the five KNX widget groups configured for the living room:

- **Lights** (Osvětlení) — three dimmable channels: Chandelier (Lustr), Exterior (Vnější), Interior (Vnitřní). Each rendered as a draggable brightness bar that sends both the dimmer value (datatype 5001) and switch state (datatype 1001).
- **Curtain** (Závěs) — horizontal position control with Open / Stop / Close buttons.
- **Blinds** (Žaluzie) — Left and Right venetian blinds, independent position sliders and Up / Stop / Down buttons.
- **Central Off** — sends a boolean true to GA 32/1/25 (id 65817) to cut all room loads; confirm-guarded.

Transport: WebSocket to `ws://192.168.88.4/apps/localbus.lp` for real-time state push and commands (`{"action":"write","address":<id>,"datatype":<dt>,"value":<v>}`). Falls back to HTTP POST polling when the socket is unavailable. Connection status shown as a dot in the widget header.

Widget metadata: id `obyvak`, `multiInstance: false`, default size 320×480, `tags: ["home","control"]`.

Install by dragging `widgets/dist/obyvak-0.1.0.zip` onto Chappy → Widgets → Quick Add.

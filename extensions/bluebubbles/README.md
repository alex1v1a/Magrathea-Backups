# OpenClaw BlueBubbles Extension

BlueBubbles external channel plugin for OpenClaw. This extension allows Marvin to send and receive iMessages via a BlueBubbles server.

## Features (current status)

- Outbound:
  - Health probe via `/api/v1/ping`
  - Text message send via `/api/v1/message/text`
  - Basic chat GUID resolution via `/api/v1/chat/new`
  - Typing indicator and mark-read helpers
  - Reactions (tapbacks) via `/api/v1/message/reaction` (config-gated)
- Inbound:
  - HTTP webhook handler for `new-message` events
  - Normalizes sender/chat/message IDs and forwards to OpenClaw runtime
  - Downloads attachments on-demand and exposes them as remote media URLs

This is intentionally a minimal but near-complete scaffold; it should be straightforward to harden once connected to a real BlueBubbles server.

## Configuration

Core config keys (under `channels.bluebubbles`):

- `serverUrl` (string, required): Base URL of your BlueBubbles server, e.g. `https://some-url.ngrok.io`.
- `password` (string, required): BlueBubbles server password (guid/token).
- `webhookPath` (string, optional, default `/bluebubbles/webhook`): Path the gateway should expose for BlueBubbles webhooks.
- `actions.reactions` (boolean, optional, default `true`): Enable tapback / reaction sends.
- `timeoutMs` (number, optional, default `15000`): Default HTTP timeout.

### Example secrets template

Create a file such as `.secrets/bluebubbles.example.json`:

```jsonc
{
  // Base URL to your BlueBubbles server (must be HTTPS with a valid certificate)
  "serverUrl": "https://your-tunnel-or-ddns-url.example.com",
  // BlueBubbles server password (GUID / token)
  "password": "CHANGE_ME",
  // Optional: override webhook path; this must match the webhook URL configured in BlueBubbles
  "webhookPath": "/bluebubbles/webhook",
  "actions": {
    "reactions": true
  },
  "timeoutMs": 15000
}
```

Wire this into your main OpenClaw config under `channels.bluebubbles` (do **not** commit real credentials).

## Wiring into OpenClaw core

In the OpenClaw core repo (not this workspace), add a catalog entry in `src/channels/plugins/catalog.ts`:

```ts
import bluebubbles from "openclaw-extension-bluebubbles";

export const CHANNEL_PLUGIN_CATALOG = [
  // ...existing entries...
  {
    id: "bluebubbles",
    label: "BlueBubbles (iMessage)",
    packageName: "openclaw-extension-bluebubbles",
    init: bluebubbles,
  },
];
```

This repo only contains the extension implementation; the catalog wiring needs to be applied in the main OpenClaw codebase.

## Local testing (no real messages)

Assuming you have a local BlueBubbles server (or mock) and OpenClaw dev environment:

1. Install dependencies and build:

```bash
cd extensions/bluebubbles
pnpm install # or npm/yarn, matching OpenClaw tooling
pnpm build
```

2. Configure `channels.bluebubbles` in your OpenClaw config to point at a **test** BlueBubbles server. Use fake or sandbox chat targets where possible.

3. Start the OpenClaw gateway/dev server so it loads this extension.

4. Use the internal message tools or dev console to:
   - Run a `probe` on the `bluebubbles` channel and verify it reports the server status.
   - Send a test text message to yourself.

5. In BlueBubbles server settings, add a webhook pointing at:

```text
https://YOUR-GATEWAY-URL/bluebubbles/webhook
```

And subscribe at least to **New Messages** events. Send yourself a test iMessage and confirm it appears in OpenClaw logs / UI.

## Notes / Future Work

- Harden webhook payload handling for different BlueBubbles versions and event types (typing, read receipts, group changes).
- Consider persisting downloaded attachments to local disk instead of exposing raw URLs.
- Map reactions to canonical tapback names/emoji according to BlueBubbles expectations.
- Add unit tests once the OpenClaw test harness for channel plugins is available.

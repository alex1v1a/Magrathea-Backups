# Integrations Worklog — 2026-02-20 (BlueBubbles & others)

## BlueBubbles iMessage integration

**Goal:** Build a BlueBubbles external channel plugin so Marvin can send/receive iMessages via a BlueBubbles server, following `skills/bluebubbles/SKILL.md`.

### Files added

- `extensions/bluebubbles/package.json`
- `extensions/bluebubbles/tsconfig.json`
- `extensions/bluebubbles/index.ts`
- `extensions/bluebubbles/README.md`
- `extensions/bluebubbles/src/types.ts`
- `extensions/bluebubbles/src/probe.ts`
- `extensions/bluebubbles/src/send.ts`
- `extensions/bluebubbles/src/reactions.ts`
- `extensions/bluebubbles/src/chat.ts`
- `extensions/bluebubbles/src/attachments.ts`
- `extensions/bluebubbles/src/runtime.ts`
- `extensions/bluebubbles/src/monitor.ts`
- `self-improvement/integrations-notes-2026-02-20.md` (this file)

### Implementation overview

- **Extension entry (`index.ts`)**
  - Registers a `bluebubbles` channel plugin and webhook handler via the OpenClaw plugin SDK.
  - Reads config from `channels.bluebubbles` with sane defaults:
    - `serverUrl`: BlueBubbles base URL (required at runtime).
    - `password`: BlueBubbles server password / guid (required at runtime).
    - `webhookPath`: defaults to `/bluebubbles/webhook`.
    - `actions.reactions`: default `true`.
    - `timeoutMs`: default `15000`.

- **REST helpers**
  - `src/types.ts`
    - `BlueBubblesConfig`, `BlueBubblesApiResponse`, `BlueBubblesMessagePayload`.
    - `buildBlueBubblesApiUrl(config, path)`: builds URLs and appends `guid=<password>` query param as per BlueBubbles REST docs.
    - `blueBubblesFetchWithTimeout(url, init, timeoutMs)`: minimal fetch wrapper with abort-based timeout returning typed API response.
  - `src/probe.ts`
    - `probeBlueBubbles(config)`: calls `/api/v1/ping` and returns `{ ok, status, message, raw }`.
  - `src/send.ts`
    - `resolveChatGuidForTarget(config, target)`: very simple chat resolver. If `target` already looks like a chat GUID, return it; else POST to `/api/v1/chat/new` with `{ handle: target }` and read `data.chatGuid`.
    - `sendMessageBlueBubbles(config, params)`: POSTs to `/api/v1/message/text` with `chatGuid`, `text`, optional `subject/effectId/attachments`. Returns a normalized result.
  - `src/reactions.ts`
    - `sendBlueBubblesReaction(config, params)`: POST `/api/v1/message/reaction` if reactions are enabled; otherwise returns a 403-like result.
  - `src/chat.ts`
    - `sendBlueBubblesTyping(config, chatGuid, isTyping)`: POST `/api/v1/chat/typing`.
    - `markBlueBubblesChatRead(config, chatGuid)`: POST `/api/v1/chat/mark-read`.
  - `src/attachments.ts`
    - `downloadBlueBubblesAttachment(config, attachmentGuid)`: currently returns a signed-ish URL to `/api/v1/attachment?guid=...&attachmentGuid=...`. Future work: optional local persistence.

- **Runtime bridge (`src/runtime.ts`)**
  - Defines `createBlueBubblesRuntime(runtime, { channelId })` which wraps `runtime.inboundMessage` from `openclaw-plugin-sdk` and standardizes the payload shape ({ senderId, chatId, messageId, text, attachments, raw }).
  - Used by the webhook monitor to route inbound events into core.

- **Webhook handler (`src/monitor.ts`)**
  - `registerBlueBubblesWebhook(api, config)`:
    - Registers `POST {webhookPath}` (default `/bluebubbles/webhook`).
    - Accepts a single event or an array of `{ event, data }` envelopes.
    - Currently handles `event === "new-message"`:
      - Extracts `msg = ev.data.message ?? ev.data`.
      - Skips messages flagged as from self (`isFromMe` / `is_from_me`).
      - Normalizes IDs:
        - `chatId`: `msg.chatGuid || msg.chat.guid || msg.chat_id || msg.chat_id_remote`.
        - `senderId`: `msg.handleId || msg.sender || msg.senderHandle || msg.handle?.id`.
        - `messageId`: `msg.guid || msg.id`.
      - Collects attachments from `msg.attachments` or `msg.attachment_list`:
        - For each, derive an `attachmentGuid` and call `downloadBlueBubblesAttachment` to get a URL.
        - Push into `attachments[]` as `{ type, url }`.
      - If there is no text but at least one attachment, synthesize a text body like `<media:image/jpeg>` placeholders.
      - Calls `runtime.inboundMessage({ senderId, chatId, messageId, text, attachments, raw: ev })`.
    - Responds with a JSON `{ status: 200, message: "ok" }` on success or `{ status: 500, message }` on error.

- **Channel implementation (`src/channel.ts`)**
  - `createBlueBubblesChannel(config)` returns a `ChannelPlugin` implementing:
    - `id: "bluebubbles"`, `label: "BlueBubbles (iMessage)"`.
    - `probe(ctx)`: delegates to `probeBlueBubbles`.
    - `send(ctx)`: uses `sendMessageBlueBubbles` with `ctx.target`, `ctx.text`, and any `attachments[].url|path`.
    - `react(ctx)`: requires `ctx.messageId` and `ctx.chatId` or `ctx.target`. Delegates to `sendBlueBubblesReaction`.
    - `typing(ctx)`: requires `ctx.chatId` or `ctx.target`; calls `sendBlueBubblesTyping`.
    - `markRead(ctx)`: similar to typing; calls `markBlueBubblesChatRead`.

- **Metadata / build**
  - `package.json` with `name: openclaw-extension-bluebubbles`, TS build scripts, and peer deps on `openclaw` & `openclaw-plugin-sdk`.
  - `tsconfig.json` targeting `ES2020` with strict type checking and `dist/` output.
  - `README.md` explaining features, config keys, secrets template, catalog wiring, and local testing steps.

### How to configure (once wired into core)

1. **Secrets template**

   - Use something like `.secrets/bluebubbles.example.json` (see README) and _do not_ commit real credentials.
   - Map its contents into your OpenClaw config under `channels.bluebubbles`.

2. **Core catalog wiring (not done here)**

   - In the main OpenClaw repo, update `src/channels/plugins/catalog.ts` to include:

   ```ts
   import bluebubbles from "openclaw-extension-bluebubbles";

   CHANNEL_PLUGIN_CATALOG.push({
     id: "bluebubbles",
     label: "BlueBubbles (iMessage)",
     packageName: "openclaw-extension-bluebubbles",
     init: bluebubbles,
   });
   ```

3. **BlueBubbles webhook setup**

   - In the BlueBubbles server settings, configure a webhook pointing at:

   ```text
   https://YOUR-GATEWAY-URL/bluebubbles/webhook
   ```

   - Subscribe to at least the **New Messages** event; more can be added later.

4. **Local testing workflow**

   - Build the extension:

   ```bash
   cd extensions/bluebubbles
   pnpm install
   pnpm build
   ```

   - Start OpenClaw with this extension installed/resolved.
   - Use the internal message tooling or dev console to:
     - Probe the `bluebubbles` channel.
     - Send a test message to a safe iMessage destination (e.g., your own number).
   - Verify inbound webhooks by sending yourself an iMessage and watching for an inbound event in the gateway logs.

### Open items / TODOs

- Verify exact REST payload shapes and field names against a live BlueBubbles server or official Postman collection.
- Expand webhook support beyond `new-message` (typing, read receipts, group changes, etc.).
- Consider mapping reactions from arbitrary emoji into BlueBubbles tapback types, if the API expects canonical names rather than raw emoji.
- Optional: implement attachment download to local disk + reference via OpenClaw's media utilities instead of remote URLs.
- Add unit/integration tests once the channel plugin test harness in OpenClaw is available.

## Secondary integration ideas (not yet implemented)

- **Improved email wrapper** using IMAP IDLE + SMTP as a unified "email" channel plugin, with config templates under `.secrets/email.imap-smtp.example.json`.
- **Generic SMS gateway skill** targeting providers like Twilio or Vonage, implemented as a pluggable SMS channel with a shared interface and per-provider adapters.

These are left as future work for a later session.

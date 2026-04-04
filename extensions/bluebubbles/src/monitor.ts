import type { ExtensionApi } from "openclaw-plugin-sdk";
import { downloadBlueBubblesAttachment } from "./attachments";
import type { BlueBubblesConfig } from "./types";
import { createBlueBubblesRuntime } from "./runtime";

interface BlueBubblesWebhookEnvelope {
  event: string;
  data: any;
}

// BlueBubbles webhook payloads vary by server version; we handle only the basics here
// and defer the rest to future refinement once this is wired to a real server.
export function registerBlueBubblesWebhook(api: ExtensionApi, config: BlueBubblesConfig) {
  const runtime = createBlueBubblesRuntime(api.runtime, { channelId: "bluebubbles" });

  const path = config.webhookPath || "/bluebubbles/webhook";

  api.registerHttpHandler({
    path,
    method: "POST",
    handler: async (req, res) => {
      try {
        const body = (req as any).body as BlueBubblesWebhookEnvelope | BlueBubblesWebhookEnvelope[];
        const events = Array.isArray(body) ? body : [body];

        for (const ev of events) {
          if (!ev || !ev.event) continue;

          if (ev.event === "new-message") {
            const msg = ev.data?.message ?? ev.data;
            if (!msg) continue;

            // Skip messages from self
            if (msg.isFromMe || msg.is_from_me) continue;

            const chatId = msg.chatGuid || msg.chat.guid || msg.chat_id || msg.chat_id_remote;
            const senderId = msg.handleId || msg.sender || msg.senderHandle || msg.handle?.id;
            const messageId = msg.guid || msg.id;

            if (!chatId || !senderId || !messageId) continue;

            let text: string | undefined = msg.text ?? msg.message ?? msg.summary;

            const attachments: { type: string; url: string }[] = [];
            const rawAttachments = msg.attachments || msg.attachment_list || [];

            for (const att of rawAttachments) {
              const guid = att.guid || att.attachmentGuid || att.id;
              if (!guid) continue;

              const downloaded = await downloadBlueBubblesAttachment(config, guid);
              attachments.push({
                type: att.mimeType || att.type || "attachment",
                url: downloaded.url,
              });
            }

            if (!text && attachments.length) {
              text = attachments.map((a) => `<media:${a.type}>`).join(" ");
            }

            await runtime.inboundMessage({
              senderId,
              chatId,
              messageId,
              text,
              attachments,
              raw: ev,
            });
          }
          // Other events (typing, read receipts, etc.) can be added later
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: 200, message: "ok" }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: 500, message: err?.message || "internal error" }));
      }
    },
  });
}

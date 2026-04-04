import type { PluginRuntime } from "openclaw-plugin-sdk";

// Thin runtime bridge so the webhook monitor can hand events off to core.
// The actual shape of PluginRuntime comes from openclaw-plugin-sdk;
// we keep this minimal so it is easy to adapt if the SDK evolves.

export interface BlueBubblesRuntimeContext {
  channelId: string;
}

export function createBlueBubblesRuntime(
  runtime: PluginRuntime,
  ctx: BlueBubblesRuntimeContext,
) {
  const { channelId } = ctx;

  return {
    inboundMessage: async (payload: {
      senderId: string;
      chatId: string;
      messageId: string;
      text?: string;
      attachments?: { type: string; url: string }[];
      raw: any;
    }) => {
      // Normalize into the generic inbound event for channels
      await runtime.inboundMessage({
        channelId,
        from: payload.senderId,
        chatId: payload.chatId,
        messageId: payload.messageId,
        text: payload.text,
        attachments: payload.attachments,
        raw: payload.raw,
      });
    },
  };
}

import type { ChannelPlugin, ChannelSendContext, ChannelProbeContext, ChannelReactContext, ChannelTypingContext, ChannelReadContext } from "openclaw-plugin-sdk";
import type { BlueBubblesConfig } from "./types";
import { probeBlueBubbles } from "./probe";
import { sendMessageBlueBubbles } from "./send";
import { sendBlueBubblesReaction } from "./reactions";
import { sendBlueBubblesTyping, markBlueBubblesChatRead } from "./chat";

export function createBlueBubblesChannel(config: BlueBubblesConfig): ChannelPlugin {
  return {
    id: "bluebubbles",
    label: "BlueBubbles (iMessage)",

    async probe(ctx: ChannelProbeContext) {
      const result = await probeBlueBubbles(config);
      return {
        ok: result.ok,
        status: result.status,
        message: result.message,
        meta: { raw: result.raw },
      };
    },

    async send(ctx: ChannelSendContext) {
      const { target, text, attachments } = ctx;

      const attachmentPaths = attachments?.map((a) => a.url || a.path).filter(Boolean as any) as string[] | undefined;

      const result = await sendMessageBlueBubbles(config, {
        target,
        text,
        attachments: attachmentPaths,
      });

      return {
        ok: result.ok,
        status: result.status,
        message: result.message,
        meta: { data: result.data },
      };
    },

    async react(ctx: ChannelReactContext) {
      const chatGuid = ctx.chatId || ctx.target; // we require one of these
      if (!chatGuid) {
        return { ok: false, status: 400, message: "chatId or target is required for reactions" };
      }

      if (!ctx.messageId) {
        return { ok: false, status: 400, message: "messageId is required for reactions" };
      }

      const res = await sendBlueBubblesReaction(config, {
        chatGuid,
        messageGuid: ctx.messageId,
        reaction: ctx.emoji,
      });

      return {
        ok: res.ok,
        status: res.status,
        message: res.message,
      };
    },

    async typing(ctx: ChannelTypingContext) {
      if (!ctx.chatId && !ctx.target) {
        return { ok: false, status: 400, message: "chatId or target is required for typing" };
      }

      const chatGuid = ctx.chatId || ctx.target!;
      const res = await sendBlueBubblesTyping(config, chatGuid, ctx.typing === true);

      return {
        ok: res.ok,
        status: res.status,
        message: res.message,
      };
    },

    async markRead(ctx: ChannelReadContext) {
      if (!ctx.chatId && !ctx.target) {
        return { ok: false, status: 400, message: "chatId or target is required for markRead" };
      }

      const chatGuid = ctx.chatId || ctx.target!;
      const res = await markBlueBubblesChatRead(config, chatGuid);

      return {
        ok: res.ok,
        status: res.status,
        message: res.message,
      };
    },
  };
}

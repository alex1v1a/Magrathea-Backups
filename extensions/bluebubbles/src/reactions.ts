import { buildBlueBubblesApiUrl, blueBubblesFetchWithTimeout, type BlueBubblesConfig } from "./types";

export interface BlueBubblesReactionParams {
  chatGuid: string;
  messageGuid: string;
  reaction: string; // e.g., "love", "like", "dislike", "laugh", "emphasize", "question"
}

export async function sendBlueBubblesReaction(
  config: BlueBubblesConfig,
  params: BlueBubblesReactionParams,
) {
  if (config.actions && config.actions.reactions === false) {
    return { ok: false, status: 403, message: "Reactions disabled by configuration" };
  }

  const url = buildBlueBubblesApiUrl(config, "/api/v1/message/reaction");
  const res = await blueBubblesFetchWithTimeout<any>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatGuid: params.chatGuid,
        messageGuid: params.messageGuid,
        reaction: params.reaction,
      }),
    },
    config.timeoutMs ?? 10000,
  );

  return {
    ok: res.status === 200,
    status: res.status,
    message: res.message,
    data: res.data,
  };
}

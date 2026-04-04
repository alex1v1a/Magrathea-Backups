import { buildBlueBubblesApiUrl, blueBubblesFetchWithTimeout, type BlueBubblesConfig, type BlueBubblesMessagePayload } from "./types";

export interface SendMessageParams {
  target: string; // phone number, email, or chat GUID
  text?: string;
  subject?: string | null;
  effectId?: string | null;
  attachments?: string[];
}

export interface SendMessageResult {
  ok: boolean;
  status: number;
  message: string;
  data?: any;
}

/**
 * Resolve a BlueBubbles chat GUID from a target identifier.
 *
 * - If the target already looks like a chat GUID (starts with "chat"), it is returned as-is.
 * - Otherwise we query /api/v1/chat/get or /api/v1/chat/new as a simple wrapper.
 */
export async function resolveChatGuidForTarget(config: BlueBubblesConfig, target: string): Promise<string> {
  if (target.startsWith("chat")) return target;

  // Very lightweight implementation for now: ask server to create or fetch a chat for this handle
  const url = buildBlueBubblesApiUrl(config, "/api/v1/chat/new");
  const res = await blueBubblesFetchWithTimeout<{ chatGuid: string }>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatGuid: null,
        handle: target,
      }),
    },
    config.timeoutMs ?? 8000,
  );

  if (res.status !== 200 || !res.data?.chatGuid) {
    throw new Error(`Failed to resolve chat GUID for target ${target}: ${res.message}`);
  }

  return res.data.chatGuid;
}

export async function sendMessageBlueBubbles(
  config: BlueBubblesConfig,
  params: SendMessageParams,
): Promise<SendMessageResult> {
  const chatGuid = await resolveChatGuidForTarget(config, params.target);

  const payload: BlueBubblesMessagePayload = {
    chatGuid,
    text: params.text,
    subject: params.subject ?? null,
    effectId: params.effectId ?? null,
    attachments: params.attachments,
  };

  const url = buildBlueBubblesApiUrl(config, "/api/v1/message/text");
  const res = await blueBubblesFetchWithTimeout<any>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    config.timeoutMs ?? 15000,
  );

  return {
    ok: res.status === 200,
    status: res.status,
    message: res.message,
    data: res.data,
  };
}

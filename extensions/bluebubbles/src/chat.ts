import { buildBlueBubblesApiUrl, blueBubblesFetchWithTimeout, type BlueBubblesConfig } from "./types";

export async function sendBlueBubblesTyping(
  config: BlueBubblesConfig,
  chatGuid: string,
  isTyping: boolean,
) {
  const url = buildBlueBubblesApiUrl(config, "/api/v1/chat/typing");
  const res = await blueBubblesFetchWithTimeout<any>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatGuid, typing: isTyping }),
    },
    config.timeoutMs ?? 5000,
  );

  return {
    ok: res.status === 200,
    status: res.status,
    message: res.message,
    data: res.data,
  };
}

export async function markBlueBubblesChatRead(
  config: BlueBubblesConfig,
  chatGuid: string,
) {
  const url = buildBlueBubblesApiUrl(config, "/api/v1/chat/mark-read");
  const res = await blueBubblesFetchWithTimeout<any>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatGuid }),
    },
    config.timeoutMs ?? 5000,
  );

  return {
    ok: res.status === 200,
    status: res.status,
    message: res.message,
    data: res.data,
  };
}

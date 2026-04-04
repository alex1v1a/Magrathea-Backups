import { buildBlueBubblesApiUrl, blueBubblesFetchWithTimeout, type BlueBubblesConfig } from "./types";

export async function probeBlueBubbles(config: BlueBubblesConfig) {
  const url = buildBlueBubblesApiUrl(config, "/api/v1/ping");
  const res = await blueBubblesFetchWithTimeout<{ pong: boolean }>(
    url,
    { method: "GET" },
    config.timeoutMs ?? 5000,
  );

  return {
    ok: res.status === 200,
    status: res.status,
    message: res.message,
    raw: res,
  };
}

import type { RequestInit } from "node-fetch";

export interface BlueBubblesConfig {
  serverUrl: string; // e.g. https://some-url.ngrok.io
  password: string; // BlueBubbles server password / guid
  webhookPath?: string; // e.g. /bluebubbles/webhook
  actions?: {
    reactions?: boolean;
  };
  timeoutMs?: number;
}

export interface BlueBubblesApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
  error?: {
    type: string;
    error: string;
  };
}

export interface BlueBubblesMessagePayload {
  chatGuid?: string;
  text?: string;
  subject?: string | null;
  method?: "private-api" | "apple-script";
  effectId?: string | null;
  tempGuid?: string;
  attachments?: string[]; // file paths or URLs, depending on server config
}

export function buildBlueBubblesApiUrl(config: BlueBubblesConfig, path: string): string {
  const base = config.serverUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(base + suffix);
  // BlueBubbles accepts guid/password/token as auth query param; we use guid
  url.searchParams.set("guid", config.password);
  return url.toString();
}

export async function blueBubblesFetchWithTimeout<T = any>(
  url: string,
  init: RequestInit,
  timeoutMs = 10000,
): Promise<BlueBubblesApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal } as any);
    const json = (await res.json()) as BlueBubblesApiResponse<T>;
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

import { buildBlueBubblesApiUrl, type BlueBubblesConfig } from "./types";

// For now, keep this very small: just return a URL that OpenClaw can treat as a remote media URL.
// If we later want to persist to local disk, we can extend this helper.
export async function downloadBlueBubblesAttachment(
  config: BlueBubblesConfig,
  attachmentGuid: string,
): Promise<{ url: string }> {
  const base = config.serverUrl.replace(/\/$/, "");
  const url = new URL(base + "/api/v1/attachment");
  url.searchParams.set("guid", config.password);
  url.searchParams.set("attachmentGuid", attachmentGuid);

  return { url: url.toString() };
}

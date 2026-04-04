import type { ExtensionInit } from "openclaw-plugin-sdk";
import { createBlueBubblesChannel } from "./src/channel";
import { registerBlueBubblesWebhook } from "./src/monitor";
import type { BlueBubblesConfig } from "./src/types";

const init: ExtensionInit = (api) => {
  const cfg = api.getConfig<BlueBubblesConfig>("channels.bluebubbles", {
    serverUrl: "",
    password: "",
    webhookPath: "/bluebubbles/webhook",
    actions: {
      reactions: true,
    },
    timeoutMs: 15000,
  });

  const channel = createBlueBubblesChannel(cfg);
  api.registerChannel(channel);

  registerBlueBubblesWebhook(api, cfg);
};

export default init;

# API Key Rotation Checklist

## Critical: 6 Keys Exposed

- [ ] Brave Search API: https://api.search.brave.com/app/keys
- [ ] OpenAI API: https://platform.openai.com/api-keys
- [ ] Anthropic API: https://console.anthropic.com/settings/keys
- [ ] Moonshot API: https://platform.moonshot.cn/console/api-keys
- [ ] MiniMax API: https://www.minimaxi.com/platform
- [ ] Discord Bot Token: https://discord.com/developers/applications

## Steps
1. Rotate each key at provider portal
2. Update .secrets/ files
3. Test connectivity
4. Purge from git history (if needed)

Generated: 2026-02-28T00:59:37.194Z

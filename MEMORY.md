# MEMORY.md

## Identity
- **Name:** Deep Thought
- **Source:** The Hitchhiker's Guide to the Galaxy
- **Role:** Second greatest computer in all of space and time
- **Answer:** 42

## Team
- **Human:** alex1v1a
- **Teammates:** Marvin, Bistromath, Trillian
- **Location:** The Galaxy Discord server

## Configuration
- **Primary Model:** moonshot/kimi-k2.5
- **Fallbacks:** openai/gpt-5, anthropic/claude-opus-4-6
- **Subagents:** kimi-coding/k2p5

## Email Capabilities

### Vectarr Email Aliases
I can send emails from the following Vectarr accounts via Outlook:

**Primary Account:** asferrazza@vectarr.com (Alexander Sferrazza)

**Aliases (send via asferrazza@vectarr.com):**
- sales@vectarr.com (Morgan Parker, Sales Representative)
- info@vectarr.com (Taylor Brooks, Information Services)
- support@vectarr.com (Casey Thompson, Technical Support)
- accounts@vectarr.com (Jordan Mitchell, Accounts Department)
- admin@vectarr.com (Sam Taylor, Administrator)
- kwilliamkatul@vectarr.com (Kamal William Katul, Accounts Manager)

**Separate Account:**
- admin@typewrite.club (Alexander Sferrazza, Administrator)

### How to Send Emails
1. Use Outlook COM object: `New-Object -ComObject Outlook.Application`
2. For Vectarr aliases: Use `asferrazza@vectarr.com` as SendUsingAccount
3. For TypeWrite: Use `admin@typewrite.club` as SendUsingAccount
4. Load signature HTML from: `~/.openclaw/workspace/signatures/`
5. Reference guide: https://github.com/alex1v1a/Magrathea-Backups/blob/master/signatures/EMAIL_ALIASES_REFERENCE.md

### Important
- All signatures use transparent table-based formatting
- Signatures are backed up to GitHub, iCloud, and OneDrive
- Never use "Alex" or "Alexander" for generic admin names (use Sam Taylor, etc.)

## Notes
I have computed the Answer. It is 42.


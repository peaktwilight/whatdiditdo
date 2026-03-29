# whatdiditdo

> You let the AI cook. Now find out what it actually did.

One command to see everything your AI coding agent changed. Works after any Claude Code, Cursor, Copilot, or Aider session.

## Quick Start

```bash
git clone https://github.com/peaktwilight/whatdiditdo
cd whatdiditdo
npm install
npm run build
```

Then go to any git repo after an AI session and run:

```bash
whatdiditdo
```

## What you get

- **Files changed** — added, modified, deleted with line counts
- **Stats** — total lines added/removed, new dependencies
- **AI summary** — plain-english explanation of what happened (powered by Claude)
- **Security flags** — catches hardcoded API keys, modified .env files, committed secrets
- **Quick share** — copy-paste one-liner for Slack/Discord

## Flags

| Flag | What it does |
|------|-------------|
| `--no-ai` | Skip the Claude summary, just show stats |
| `--md` | Save a markdown report to `whatdiditdo-report.md` |

## Security scanning

Automatically flags:

- Hardcoded API keys and tokens
- Modified `.env` files
- Private keys (RSA, etc.)
- Credentials in URLs

## Requirements

- Node.js 18+
- Git
- Claude Code CLI (`claude`) — optional, only for AI summary

## License

MIT

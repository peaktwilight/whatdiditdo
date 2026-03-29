# whatdiditdo

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)

> You let the AI cook. Now find out what it actually did.

[whatdiditdo.doruk.ch](https://whatdiditdo.doruk.ch)

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
- **Emoji summary** — compact one-line recap printed after every run

## Flags

| Flag | What it does |
|------|-------------|
| `--no-ai` | Skip Claude summary, just stats |
| `--md` | Save markdown report |
| `--last N` | Review the last N commits |
| `--json` | Machine-readable JSON output |

## Review past commits

```bash
# See what happened in the last 3 commits
whatdiditdo --last 3
```

## Quick share

Every run prints a one-line emoji summary you can paste into Slack or Discord:

```
📊 4 files · +120 -30 · 2 new deps
```

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

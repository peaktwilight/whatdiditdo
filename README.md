# whatdiditdo

[![npm](https://img.shields.io/npm/v/whatdiditdo)](https://www.npmjs.com/package/whatdiditdo)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)

> You let the AI cook. Now find out what it actually did.

[whatdiditdo.doruk.ch](https://whatdiditdo.doruk.ch) · [npm](https://www.npmjs.com/package/whatdiditdo)

One command to see everything your AI coding agent changed. Works after any AI coding session — Cursor, Copilot, Aider, Windsurf, and more.

## Quick Start

Run in any git repo after an AI session:

```bash
npx whatdiditdo
```

That's it. No install needed.

## What you get

- **Files changed** — added, modified, deleted with line counts
- **Stats** — total lines added/removed, new dependencies
- **AI summary** — plain-english explanation of what happened (AI-powered)
- **Security flags** — catches hardcoded API keys, modified .env files, committed secrets
- **Quick share** — copy-paste one-liner for Slack/Discord
- **Emoji summary** — compact one-line recap printed after every run

## Auto-generate PR descriptions

The killer feature. After an AI session:

```bash
npx whatdiditdo --pr
```

Generates a ready-to-paste PR title and body with:
- Summary of changes
- File change table
- New dependencies listed
- Security warnings
- Test plan checklist

Pipe it: `npx whatdiditdo --pr --no-ai | pbcopy`

## Flags

| Flag | What it does |
|------|-------------|
| `npx whatdiditdo --no-ai` | Skip AI summary, just stats |
| `npx whatdiditdo --pr` | Generate a PR title and description |
| `npx whatdiditdo --md` | Save markdown report |
| `npx whatdiditdo --last N` | Review the last N commits |
| `npx whatdiditdo --json` | Machine-readable JSON output |
| `npx whatdiditdo --hook` | Install as post-commit git hook |
| `npx whatdiditdo --unhook` | Remove the post-commit git hook |
| `npx whatdiditdo --blame-agent` | Detect which AI tool made the changes |
| `npx whatdiditdo --undo` | List changed files for selective rollback |
| `npx whatdiditdo --undo <N>` | Revert a specific file by number |
| `npx whatdiditdo --undo all` | Revert all changes |
| `npx whatdiditdo --notify <url>` | Send summary to Slack/Discord webhook |
| `npx whatdiditdo --web` | Open an HTML report in the browser |

## Review past commits

```bash
# See what happened in the last 3 commits
npx whatdiditdo --last 3
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

## Auto-run after every commit

Install a git hook so whatdiditdo runs automatically after every commit:

```bash
npx whatdiditdo --hook
```

To remove it:

```bash
npx whatdiditdo --unhook
```

## Undo AI changes

Review what changed and selectively revert:

```bash
npx whatdiditdo --undo
```

Lists all changed files with a preview, then lets you revert individual files or the entire last commit.

## HTML report

Open a styled HTML report in your browser:

```bash
npx whatdiditdo --web
```

Includes diffs, file lists, security flags, and AI summary in a dark-themed dashboard.

## Blame agent

Detect which AI tool made the changes:

```bash
npx whatdiditdo --blame-agent
```

Checks commit messages, tool-specific config files, and git settings to identify the agent (Cursor, Copilot, Aider, Windsurf, etc.).

## Webhook notifications

Send results to Slack, Discord, or any webhook:

```bash
npx whatdiditdo --notify https://hooks.slack.com/services/...
npx whatdiditdo --notify https://discord.com/api/webhooks/...
```

Auto-detects the platform and formats the payload accordingly. For unknown URLs, sends a plain JSON summary.

## Requirements

- Node.js 18+
- Git
- AI CLI — optional, only needed for AI summary

## Development

```bash
git clone https://github.com/peaktwilight/whatdiditdo
cd whatdiditdo
npm install
npm run build
```

## Full disclosure

This tool was vibe-coded by an AI agent. We used whatdiditdo to audit its own creation. It's turtles all the way down.

---

*Built by [Peak Twilight](https://doruk.ch) -- also building [pwnkit](https://pwnkit.com), [FoxGuard](https://foxguard.dev), [vibecheck](https://vibechecked.doruk.ch), [unfuck](https://unfcked.doruk.ch)*

## License

MIT

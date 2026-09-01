---
status: active
project: meta
type: guide
---
# Vault backup

The vault and the agent config are backed up to **private GitHub repos**. Chosen
2026-09-02 over OneDrive (Obsidian sync-conflict risk) and a local D: mirror (no
off-machine protection).

## The two repos

| repo | local path | contents |
|------|-----------|----------|
| `the-beasts-brain` | `C:\Users\badbo\The Beasts Brain` | the whole vault — every note, plus the stable `.obsidian/` config |
| `the-beast-agent` | `C:\Users\badbo\my-agent` | `CLAUDE.md`, `.claude/settings.json`, and `tool-configs/` (copies of the three tool `.json` files) |

The agent repo does **not** track the tool folders (`backtalk`, `ai-visualizer`,
`barehands`, `ai-memory-vault`, `ai-marketing-skills`, `fullstack-agent`). They are
upstream clones from github.com/jaredrhod and restore with `git clone` or the
"Update The Beast" shortcut. Each carries its own `.git`, which is exactly why git
cannot track files inside them from the outer repo — hence the `tool-configs/`
copies, refreshed at each backup.

## Status

Local repos initialised and committed — `the-beasts-brain` at `81f8937`,
`the-beast-agent` at `94e880e`. **Not yet pushed.** The push needs a one-time
`gh auth login` from Nathan (interactive browser flow; the AI cannot run it and
must not handle the credentials). After auth:

```
"C:\Program Files\GitHub CLI\gh.exe" repo create the-beasts-brain --private --source="C:\Users\badbo\The Beasts Brain" --remote=origin --push
"C:\Program Files\GitHub CLI\gh.exe" repo create the-beast-agent  --private --source="C:\Users\badbo\my-agent"          --remote=origin --push
```

## Committing changes (once pushed)

From either repo folder:

```
git add -A && git commit -m "<what changed>" && git push
```

If a live tool config changed, refresh its copy first: `cp backtalk/backtalk.json
tool-configs/backtalk.json` (same for `ai-visualizer` / `barehands`). A plain
`git add -A` will not see the live files — the tool folders are gitignored.

Commit cadence is not yet decided: The Beast commits at each vault checkpoint, or
a scheduled task runs a daily auto-commit.

## Not yet covered

The backtalk voice line's local source edits (`backtalk/backtalk/mouth.py`,
`config.py`, `ears.py`) are not version-controlled — a fresh clone loses them.
They are written up in [[backtalk voice - operating notes]]. Turning them into a
tracked patch file or a fork is a separate open task.

## Tools

- `gh` (GitHub CLI) 2.98.0 — installed 2026-09-02 via `winget install GitHub.cli`,
  at `C:\Program Files\GitHub CLI\gh.exe` (a freshly opened terminal has it on PATH).
- Global git identity: `Nathan` / `badboyfarrxxx@gmail.com`.

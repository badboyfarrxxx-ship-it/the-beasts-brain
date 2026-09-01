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
| [`the-beasts-brain`](https://github.com/badboyfarrxxx-ship-it/the-beasts-brain) (private) | `C:\Users\badbo\The Beasts Brain` | the whole vault — every note, plus the stable `.obsidian/` config |
| [`the-beast-agent`](https://github.com/badboyfarrxxx-ship-it/the-beast-agent) (private) | `C:\Users\badbo\my-agent` | `CLAUDE.md`, `.claude/settings.json`, and `tool-configs/` (copies of the three tool `.json` files) |

GitHub account: `badboyfarrxxx-ship-it`.

The agent repo does **not** track the tool folders (`backtalk`, `ai-visualizer`,
`barehands`, `ai-memory-vault`, `ai-marketing-skills`, `fullstack-agent`). They are
upstream clones from github.com/jaredrhod and restore with `git clone` or the
"Update The Beast" shortcut. Each carries its own `.git`, which is exactly why git
cannot track files inside them from the outer repo — hence the `tool-configs/`
copies, refreshed at each backup.

## Status

**Live as of 2026-09-02.** Both repos created private on GitHub and pushed
(`the-beasts-brain` initial `81f8937`, `the-beast-agent` `94e880e`). Nathan
authenticated `gh` with a web login; the AI ran `gh repo create ... --source ...
--push` for each. Local `main` tracks `origin/main` in both.

## Committing changes

From either repo folder:

```
git add -A && git commit -m "<what changed>" && git push
```

If a live tool config changed, refresh its copy first: `cp backtalk/backtalk.json
tool-configs/backtalk.json` (same for `ai-visualizer` / `barehands`). A plain
`git add -A` will not see the live files — the tool folders are gitignored.

## Cadence (decided 2026-09-02)

**Automatic.** The Beast commits and pushes **both** repos at every vault
checkpoint — no asking each time. Nathan chose this over a nightly scheduled task
or manual pushes: a backup that isn't automatic goes stale. This is standing push
authorization for these two private repos only; it does not extend to any other
push, publish, or deploy.

## Not yet covered

The backtalk voice line's local source edits (`backtalk/backtalk/mouth.py`,
`config.py`, `ears.py`) are not version-controlled — a fresh clone loses them.
They are written up in [[backtalk voice - operating notes]]. Turning them into a
tracked patch file or a fork is a separate open task.

## Tools

- `gh` (GitHub CLI) 2.98.0 — installed 2026-09-02 via `winget install GitHub.cli`,
  at `C:\Program Files\GitHub CLI\gh.exe` (a freshly opened terminal has it on PATH).
- Global git identity: `Nathan` / `badboyfarrxxx@gmail.com`.

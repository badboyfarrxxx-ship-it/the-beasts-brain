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
| [`the-beasts-brain`](https://github.com/badboyfarrxxx-ship-it/the-beasts-brain) (private) | `C:\Users\Fredy 2\The Beasts Brain` | the whole vault: every note, plus the stable `.obsidian/` config |
| [`the-beast-agent`](https://github.com/badboyfarrxxx-ship-it/the-beast-agent) (private) | `C:\Users\Fredy 2\my-agent` | `CLAUDE.md`, `.claude/settings.json`, and `tool-configs/` (copies of the three tool `.json` files) |

GitHub account: `badboyfarrxxx-ship-it`.

The agent repo does **not** track the tool folders (`backtalk`, `ai-visualizer`,
`barehands`, `ai-memory-vault`, `ai-marketing-skills`, `fullstack-agent`). They are
upstream clones from github.com/jaredrhod and restore with `git clone` or the
"Update The Beast" shortcut. Each carries its own `.git`, which is exactly why git
cannot track files inside them from the outer repo, so the three live configs are
kept as copies in `tool-configs/`, refreshed at each backup.

## Status

**Live as of 2026-09-02.** Both repos created private on GitHub and pushed
(`the-beasts-brain` initial `81f8937`, `the-beast-agent` `94e880e`). Nathan
authenticated `gh` with a web login, then the AI ran `gh repo create ... --source
... --push` for each. Local `main` tracks `origin/main` in both.

**Cut off 2026-09-12, re-established 2026-09-16.** The GitHub logins were revoked in
the [[Security incident 2026-09-12]], so pushes stopped at `2572cc9`. After the Surface
rebuild (the account is now `Fredy 2`, not `badbo`), Nathan signed in again and pushed
both repos himself: `the-beasts-brain` to `b7e4f45` (the 12 commits held back since
09-12, plus a rebuild checkpoint), `the-beast-agent` to `fd8e579`.

## Committing changes

From either repo folder:

```
git add -A && git commit -m "<what changed>" && git push
```

If a live tool config changed, refresh its copy first: `cp backtalk/backtalk.json
tool-configs/backtalk.json` (same for `ai-visualizer` and `barehands`). A plain
`git add -A` will not see the live files, because the tool folders are gitignored.

## Cadence (decided 2026-09-02)

**Automatic.** The Beast commits and pushes **both** repos at every vault
checkpoint, with no asking each time. Nathan chose this over a nightly scheduled
task or manual pushes, on the reasoning that a backup that isn't automatic goes
stale. This is standing push authorization for these two private repos only. It
does not extend to any other push, publish, or deploy.

On the rebuilt Surface this only works when the Claude session has a working shell.
As of 2026-09-16 the Claude desktop shell is failing on every command, so checkpoint
pushes fall to Nathan until that's fixed.

## Not yet covered

The backtalk voice line's local source edits (`backtalk/backtalk/mouth.py`,
`config.py`, `ears.py`) are not version-controlled, and a fresh clone loses them.
They are written up in [[backtalk voice - operating notes]]. Turning them into a
tracked patch file or a fork is a separate open task.

## Tools

- Git for Windows, installed 2026-09-16 on the rebuilt Surface via
  `winget install --id Git.Git`. Its bundled Git Credential Manager holds the GitHub
  sign-in.
- `gh` (GitHub CLI) 2.101.0, installed 2026-09-22 via winget and signed in by Nathan the
  same day (account `badboyfarrxxx-ship-it`, token in the Windows keyring, scopes `repo`,
  `workflow`, `gist`, `read:org`). Nothing in the routine backup needs it; git pushes go
  through Git Credential Manager. See [[Dev machine setup]].
- Global git identity: `Nathan` / `badboyfarrxxx@gmail.com`, set again 2026-09-16
  after the rebuild.

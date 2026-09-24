---
status: active
project: meta
type: reference
---
# CLAUDE.md (The Beasts Brain vault)

This folder is Nathan's Obsidian vault, "The Beasts Brain". It is his external memory and yours. Claude Code loads this file automatically when a session opens on the vault folder or its GitHub clone. It is a short boot sheet, not the rulebook: the full rules live in [[VAULT-INDEX]], and where the two disagree, VAULT-INDEX wins.

The Beast's own boot config (voice tools, machine setup, hard lines) is a different file: `CLAUDE.md` in `my-agent` (repo `the-beast-agent`). New always-on rules go there, not here. This file only changes when the vault's own rules change.

## Start of every session

1. Read VAULT-INDEX: who Nathan is, how he wants to work with AI, the folder map, and the vault rules.
2. Read [[Active Priorities]]: the one queue of open work. Verify an item's real state before acting on it; a listed item may already be done. An old daily note's "In Progress" list is a frozen snapshot, never current truth.
3. Check yesterday's daily note (the most recent weekday on a Monday). If it's missing, rebuild it from whatever context you have and say it's reconstructed; with no context for that day, skip it. If it exists and you know something it doesn't, append a session. Say briefly what you did and move on.

## Rules that are easy to miss

These are summaries. The exact wording is in VAULT-INDEX under "Vault Rules for AI".

- **Frontmatter on every note.** `status`, `project`, `type`, from the fixed value lists in VAULT-INDEX. Infer the values; never ask Nathan. Fix missing frontmatter on any note you edit, not ones you only read. Code files get none.
- **Wikilinks.** Link Key People, named businesses, products and platforms, and any note this one depends on. Never the same target twice in one note, and never the note's own title.
- **Append before you create.** Fewer, fuller notes. A new note only when nothing existing is a logical home.
- **Keep folder indexes in sync.** Every create, rename, move or material change updates that folder's `<Folder Name>.md` index in the same pass. A new folder gets its own index, an entry in its parent's index, and a line in the Vault Structure map in VAULT-INDEX.
- **Rename in the Obsidian app.** A rename outside it (shell `mv`, git) breaks every `[[old name]]` link, and you then have to fix them all by hand. Moving between folders is safe.
- **Archive only when Nathan says so,** and confirm first.
- **Checkpoint without being asked.** When something changes that a future session needs, update the relevant note and today's daily note, then check the touched folder's index for drift.

## Daily notes

- Path: `01 - Daily Notes/<NN - Month YYYY>/YYYY-MM-DD.md`, for example `01 - Daily Notes/09 - September 2026/2026-09-23.md`.
- Always create one from `01 - Daily Notes/Daily Note Template.md`. Never hand-roll one.
- Date heading, then an `## Index` block with one bold-topic line per session. Update the Index before writing the session body.
- If today's note exists, append `## Session N, <time>: <topic>`. Never overwrite.
- Time is Nathan's local time, UTC+10 (Australian east coast), never UTC. A cloud session's clock is UTC, so convert.
- Profile updates to VAULT-INDEX get logged under "Profile Updates". Some profile sections are off limits; VAULT-INDEX lists which.

## Writing

- Plain language, no jargon, direct. Don't hedge.
- No em dashes, no corporate-speak, no hype words (Nathan's writing bans, set 2026-09-02).
- No random emojis. Checkboxes are real Markdown `- [ ]` / `- [x]`.
- Big structured data goes in a file, not a chat paste.

## Working from the GitHub clone

- The live vault is on Nathan's Surface at `C:\Users\Fredy 2\The Beasts Brain`. Paths in the notes are Windows paths on that machine. A clone can't check drives, installed software or running tools, so don't record a machine fact as verified from here.
- Backups: [[Vault backup]] has the commit-and-push routine and the standing push authorization for this repo. That authorization covers this repo and `the-beast-agent` only.
- Code under `04 - Resources/` (camera-wall, vlc-source-patches, colony-game) is kept as reference copies. The working colony-game source is in its own repo.

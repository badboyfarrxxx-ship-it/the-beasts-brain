---
status: active
project: meta
type: guide
---
# colony-game

A colony-evolution role-playing game, built 2026-09-19 in a [[Claude]] chat and
based on RinoZ's *Chrysalis* audiobook series, which Nathan owns on [[Audible]]. There is
one engine and two builds of it. One is a private fan version that uses the books' world.
The other, *Undermoot: Rise of the Swarm*, is original and safe to sell. The 3D is
[[three.js]], and the project is built with [[Vite]].

The full chat is at https://claude.ai/code/session_01JHZVSxTXXk35F211kTuuWP (it is also
in Claude's chat history on this machine). The section at the bottom of this note records
what was asked and what came of each request.

## Files in this folder

- `undermoot-rise-of-the-swarm.html`: the original game, safe to sell. Double-click it to
  play. It is one self-contained file and runs offline.
- `chrysalis-fan-game-personal-use.html`: the fan version, which uses the books' names and
  plot (Books 1–5). **For private use only.** See the section on the line between the two
  builds.
- `colony-game-source.zip`: the source project (npm + Vite). See "Working on it".
- [[Chrysalis book notes]]: the research on all nine books that the personal build is
  based on. It has spoilers throughout.
- [[Selling Undermoot]]: where and how to sell the sale build (research and a recommended
  plan, 2026-09-22).

## What the game is

- **Colony screen (2D).** You hunt, dig to grow the colony, fuse cores and evolve through
  seven tiers. You make a one-time egg-design choice (more workers, or smarter and
  stronger ones), recruit companions, and play through the story beats.
- **Battles.** Turn-based, with a portrait for each side, HP bars and mana. The moves are
  Attack, a Skill that costs mana, Brace, Burn a Core to heal, and Retreat.
- **3D world.** Press "Walk the zone in 3D". It is third person. Walk into a creature to
  fight it. The large creature straight ahead is the zone boss. Beat the boss and touch it
  again to move to the next zone, and the world rebuilds with new terrain and creatures.
  Your companions follow you, and your character grows with each tier.
- **Controls.** On a keyboard, W/S or Up/Down walks and A/D or Left/Right turns. On a touch
  screen, drag anywhere to get a thumbstick. The thumbstick is on by default on phones and
  can be toggled in the world's HUD.
- **Content, per build.** Each zone has two or three creature types plus a boss. Both
  builds share the 14 creature shapes.

  | Build | Zones | Creature types | Bosses | Companions | Story beats |
  |-------|-------|----------------|--------|------------|-------------|
  | Undermoot | 12 | 34 | 12 | 6 | 13 |
  | Chrysalis fan build | 10 | 28 | 10 | 5 | 10 |

- **Ending.** Undermoot has a finished ending: the last two zones follow the Sleeper cult
  down to the world's core, and beating the final boss, Oruun, plays a closing scene.
  The fan build stops at the end of Book 5.
- **Length.** About 290 fights to finish Undermoot, 10–50 per zone, reaching the top
  evolution tier. The fan build takes about 210.
- **Saves.** The game saves to the browser automatically. The Export and Import buttons
  move a save between browsers or back it up as a text code.

## The two builds, and the line between them

- The **Undermoot** build keeps the game systems (tiers, cores, egg design, waves,
  companions) and replaces everything the books own: names, characters, world and story.
  Game mechanics aren't protected the way characters, names and settings are. Before every
  delivery, the finished file was scanned for book names, and it had zero matches each
  time.
- The **Chrysalis** build is derived from a copyrighted series. Keeping it in this vault is
  fine, because the vault's [[GitHub]] repo is private (see [[Vault backup]]). Don't sell
  it, share it or move it anywhere public.

## Working on it

**The working copy is `C:\Users\Fredy 2\Documents\colony-game`**, a local git repo (set up
2026-09-22, baseline commit `103e242`; no remote yet), with `npm install` done. Work there,
never inside the vault: `node_modules` holds 27 markdown files that Obsidian would pick up
as notes. After a change, rebuild, then copy both `dist/*.html` files here and refresh the
zip with `git archive --format=zip --prefix=colony-game/ -o <vault>/colony-game-source.zip HEAD`.

```
npm install              # three.js, Vite and the single-file plugin
npm run dev              # dev server with hot reload (sale build)
npm run build            # both builds (on Windows use Git Bash; see the README's Test section)
npm test                 # playthrough check, then 24 browser checks per build
npm run test:unit        # unit tests, no browser needed
npm run scan             # after a build: no fan-build names in the sale file
npm run preview          # reference page with all 14 creature shapes
npm run models           # export every creature to a .glb file
```

On this machine, `npm run build` fails (the scripts set `GAME_PACK` the Unix way) and the
browser smoke test can't run (it loads Playwright from the cloud session's Linux path). The
README gives the Git Bash build commands. The progression test, unit tests and scan all run.

All names, story text, numbers and colours are in `src/content.personal.json` and
`src/content.sale.json`. The code contains none of them. A third version of the game is
another content file. `README.md` inside the zip is the full manual.

## Real 3D models

The creatures are procedural: they are built from three.js shapes with textures generated
by code, and there are no art files. To use real modelled characters, put a `.glb` file in
`src/models/`, add an import line in `src/models.js`, and rebuild. The game falls back to
the built-in shape for anything that is missing. This was tested with two exported models.

`npm run models` exports the current creatures as scaled starting points for [[Blender]].
The nine `.glb` files already in the zip are an older export. They were made before the
visual pass and before five of the shapes existed, so run the command again to get a
current set of all 14.

## Performance

The world uses physically based materials, reflections, shadows and noise-generated
textures. Weak graphics chips struggle with the per-pixel work, so the world measures its
own frame rate after it loads. If the game is slow, it steps down in this order: render
resolution, then shadows and the heavier material effects, then reflections. It only
steps down, never back up, so it can't flip-flop. On the headless software renderer used
for testing, this took the scene from 1.9 to 17 fps.

### Real-hardware test (2026-09-22, the Surface Pro 7+)

**Result: it runs at a locked 60 fps at full quality in Firefox** on the Surface's **Intel
Iris Xe** (WebGL 2, 59 Hz screen). Fresh game, zone 1, measured with the game's own
`WORLD3D.debug()` / `setQuality()` hooks by a script injected into a scratch copy (the game's
source was not touched).

| What | Result |
|---|---|
| Page load | 136 ms |
| 3D world ready after clicking "Walk the zone in 3D" | 2.2 s |
| Quality the auto-tuner picked | 0 (everything on) |
| Frame rate, every quality level 0 to 3 (Firefox 156) | 60 fps |
| Worst single frame (Firefox) | 17 ms, so no dropped frames |
| Work per frame, full quality | 301 draw calls, about 43,000 triangles, no texture uploads or shader compiles |
| Work per frame, lightest quality | 97 draw calls, about 20,000 triangles |
| Game JavaScript per frame | 2 to 3 ms |

**Trap for future tests: the Claude app's built-in browser pane caps any WebGL page at
30 fps.** The first run was done there and showed 20 to 30 fps, which looked like a
performance problem in the game. It wasn't: a bare WebGL canvas that only clears itself each
frame also ran at 30.4 fps in the pane, while a page without WebGL ran at 60. Measure frame
rate in a normal browser (Firefox here), with its window in front, never in the pane.

**The HP, 2026-09-22 (Chrome 153): 3 to 11 fps, but not a valid test of the game.** The
test reported the GPU as `Microsoft Basic Render Driver`, which is Windows' software
fallback: the HP's NVIDIA GeForce 710A has no driver installed (predicted in
[[Building tiny11 images]]), so the 3D world was drawn on the 2013 Pentium processor.
Quality 0: 3.2 fps, 1: 7.4, 2: 11.6, 3: 11.3; worst frames 109 to 922 ms. Two things it does
tell us about the game:

- **Some buyers will have no working graphics driver**, and on software rendering the 3D
  world is unplayable at any quality. **Done 2026-09-22:** both builds now detect this (the
  renderer name contains "Basic Render Driver", "SwiftShader" or "llvmpipe"), start the 3D
  world at the lightest quality straight away, and show a dismissible notice that the
  graphics driver is missing. Machines with a real GPU see no change. Unit-tested
  (`test/gpu.test.mjs`) and checked in a browser both ways (real GPU: no notice; the HP's
  renderer name simulated: notice shown, quality 3). The book-name scan is clean.
  Still to see on the real HP, before its driver goes in.
- **The auto-tuner still said quality 0 at 2.8 fps**, 9 seconds after entering the world.
  It should have stepped down by then. Possibly the world took a long time to build on the
  processor, so the tuner had barely started; not yet confirmed.

Re-test the HP once its NVIDIA driver is installed. Not yet tested: Chrome on a machine with a
working GPU, and a phone.

**Test file for other machines:** `C:\Users\Fredy 2\Documents\undermoot-bench.html` (630 KB,
built 2026-09-22). It is the sale build with the benchmark script built in. Double-click it
(or open it in any browser), leave the window in front for about 40 seconds: it enters the 3D
world on its own, measures every quality level, and shows the results in a green box. Opened
as a local file it only shows them; served from the test server it also reports back. It is
a test copy, not for sale or sharing. Checked end to end on 2026-09-22.

## Known limits

- The art is procedural. The creatures read clearly as real animals on real ground, but
  they are not sculpted or hand painted. That would need `.glb` assets.
- Only the blurbs were found for Books 6–9, with no chapter recaps, so the personal build
  stops at the end of Book 5. That is where it stays. On 2026-09-22 Nathan supplied a PDF
  of the full Book 1 text; Claude declined to build from it (it covers the book the notes
  already cover, and mining a full novel's text for a game is a different act from
  reading public recaps). Nathan chose to put the effort into Undermoot instead. If the
  fan build is ever extended, it will be from Nathan's own summary of Books 6–9.
- Neither build is published anywhere. Where and how to sell Undermoot was researched on
  2026-09-22: see [[Selling Undermoot]]. Nothing is decided yet.

## How it was built (the chat, 2026-09-19)

Times are Brisbane time.

| Time | Nathan asked | What came of it |
|------|--------------|-----------------|
| 4:50 PM | Could a game be made from an Audible book? | Yes, from text sources rather than the audio, which is DRM-protected and can't be read. A version for sale must not use the book's characters or world. |
| 4:58 PM | It's the *Chrysalis* box set. | Identified as RinoZ's series, Books 1–3. A colony builder with an evolution tree was recommended. |
| 5:42 PM | Could Claude have access to Audible? | Advised against it, because the account only holds the audio. Public recaps would do the job without touching the account. |
| 5:43 PM | Yes, do that. | Research notes on Books 1–3, now part of the book notes in this folder. |
| 5:48 PM | Look up the rest of the series. | Nine books found. Books 4–5 had good coverage, but only blurbs could be found for 6–9. |
| 5:58 PM | One version for me and one for selling. | Nathan picked an original insect theme for the sale build and Books 1–5 for the personal build. Both were built as idle colony games. |
| 6:21 PM | Make it a role-playing game with avatars. | Nathan picked both builds and a full turn-based battle system. Portraits and battles were added. |
| 6:32 PM | 3D characters I can control and walk through the game. | Nathan picked "explore, then battle". A three.js world was added, where walking into a creature starts a fight. |
| 6:43 PM | (the three.js installation docs link) | The project was rebuilt as a proper npm + Vite project with ES modules. It still produces a single file per game, and the files got smaller. Automated tests were added. |
| 6:51 PM | OK, do that (real 3D models). | The model loader was wired in with a fallback, and the export script and creature reference page were added. The creatures got jointed legs with a walk cycle, plus shadows. |
| 7:00 PM | Add touch screen controls. | A drag-anywhere thumbstick, on by default on phones. The camera was fixed for portrait screens. |
| 7:05 PM | More realistic content. | Nathan picked both a visual pass and more content. Realistic materials, textures and terrain were added, along with adaptive quality, 10 zones, 5 companions and story beats. A bug in the Hunt button was found and fixed. |
| 10:08 PM | Continue. | The tests were made stable, the docs updated, and the final builds delivered. |

On 2026-09-21 Nathan asked for these files to be sent to his computer. That save never
reached the vault; on 2026-09-22 they were written into `04 - Resources/colony-game/`.

### 2026-09-22: Undermoot finale and progression fix

- Added two final zones (Hollowfire Descent, The Sleeper's Root), a sixth companion
  (Nyx, at the top tier), three story beats, and a real ending in place of the old
  "still waiting" message.
- **Found and fixed a bug that made both builds uncompletable.** Hero power grew in a
  straight line with level while the XP needed per level grew by 35% each level, so
  from about zone 6 the game needed tens of thousands of fights, then effectively
  never ended. Power and XP now both grow geometrically, set per build under
  `progression` in the content file. Zone 9's creatures were also out of line (you
  arrived winning only 39% of hunts) and were scaled down 20% in both builds.
- Added `test/progression.cjs`, which simulates a full playthrough of each build and
  fails if any zone stops being finishable. The earlier tests missed the bug because
  they load a mid-game save instead of playing through.
- The finale was played through in a real browser, with no errors. The sale build was
  scanned again for names from the books, with zero matches. All tests pass.

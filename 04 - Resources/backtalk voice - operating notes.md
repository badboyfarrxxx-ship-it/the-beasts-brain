---
status: active
project: meta
type: guide
created: 2026-08-29
wikilinks:
  - backtalk
---

# backtalk (voice) — operating notes

Operational reference for [[backtalk]], the voice loop for The Beast. Setup lives in
`C:\Users\Fredy 2\my-agent\backtalk\` (`README.md`, `backtalk.md`, `TROUBLESHOOTING.md`).
This note covers day-to-day operation, not install. (Paths were `C:\Users\badbo\...` before
the 2026-09-15 rebuild; older daily notes still show those.)

## Config

`C:\Users\Fredy 2\my-agent\backtalk\backtalk.json` (untracked, so updates never touch it; a
copy is kept in my-agent's `tool-configs\`). Values as checked 2026-09-22:

- `agent_dir` → `C:\Users\Fredy 2\my-agent` (the folder whose CLAUDE.md is The Beast)
- `name` → "The Beast"; `ptt_key` → `caps_lock`; `mic_mode` → `open` (always listening)
- `wake_phrase` → "hey beast" (the transcription-based gate from the local patch); `wake_word`
  empty (openWakeWord off); `wake_phrase_fuzz` → `0.76`; `wake_debug` → `false` (both set
  2026-09-22, see "Wake phrase tuning" below)
- `voice` → `bm_fable` (Kokoro built-in, British male). Nathan picked it from a full audition on 2026-08-29 (the earlier default was `bm_lewis`). Engine is the free offline one, not ElevenLabs.
- `tts_device` → `8` (output device index, from the local patch; see "Audio output device" below)
- `stt_model` → `base.en` (already the smaller model; the 8 GB RAM fallback in CLAUDE.md is in effect)
- `permission_mode` → `ask`
- `greeting` → "Hello Nathan, what are we working on today?"
- `extra_dirs` → the vault; `barehands_state_dir` → barehands `state/`

Never hand-edit `permission_mode` while the voice line is running — change it by asking in a
voice session ("stop asking for permission" / "start asking again") or edit and relaunch.

## Speaking text from a typed session (no voice line needed)

To make The Beast say something aloud from an ordinary typed Claude Code session — e.g. to
announce that a long background job finished — instantiate `Mouth()` and use
**`say_chunk(text)`**, not `say(text)`:

```
cd "C:/Users/Fredy 2/my-agent/backtalk"
uv run --quiet python -c "import time; from backtalk.mouth import Mouth; m=Mouth(); m.say_chunk('the whole message as one string'); m.wait_done(180); time.sleep(1)"
```

`say(text)` splits into sentences and synthesises each separately, so every sentence pays its
own Kokoro latency first — Nathan hears the gaps and dislikes them (2026-08-29). `say_chunk`
sends the whole passage as one streamed TTS request: tight, continuous delivery. backtalk's
own voice line already uses `say_chunk` for batched replies. The scratchpad has a `speak.sh`
wrapper. `python -m backtalk.mouth "text"` still works but uses the sentence-splitting `say`.
No audio goes to stdout; empty output means it worked.

## Hands-free wake word (openWakeWord, added 2026-08-29)

`mic_mode` is now `"open"` with `"wake_word": "hey_mycroft"` in `backtalk.json`. The Beast
sits quiet; you say **"Hey Mycroft"** and it wakes and listens for the command. (Picovoice
Porcupine + a custom "Hey Beast" was the first plan — abandoned because Picovoice now blocks
free-email signups. openWakeWord is fully local, no account.)

**Current setup: `wake_phrase: "hey beast"`** (the transcription gate, not an openWakeWord
model). openWakeWord's pretrained models were tried and only `alexa` scored well on Nathan's
real voice (`hey_jarvis` ~0.15, `hey_mycroft` nothing) — its models are TTS-trained and miss
real accents. "Hey Beast" / "computer" have no pretrained model, and Picovoice (custom) blocks
free-email signups. So: **the mic transcribes what it hears with Whisper** (which handles
Nathan's voice fine) and wakes when "hey beast" turns up anywhere in what it heard (it scores
every two-word window against the phrase). A command in the
same breath ("Hey Beast, what's the weather") passes straight through; "Hey Beast" alone
captures the next utterance.

- Config keys (`config.py` defaults): `wake_phrase` (text, takes precedence — the
  transcription gate); `wake_word` (an openWakeWord model name — `hey_mycroft`, `alexa`,
  `hey_jarvis`, `hey_rhasspy`); `wake_threshold` (0–1 for `wake_word`, default 0.5);
  `wake_debug` (logs what the gate hears / the score). Only applies in `mic_mode "open"`.
- Trade-off of `wake_phrase`: it runs Whisper on ambient speech (local, private, cheap) and
  it's a soft gate — a nearby "hey beast" in conversation wakes it. A true always-asleep
  model needs openWakeWord's synthetic training pipeline (~6 GB, hours of CPU) or Picovoice.
- **Source edits** (`backtalk/ears.py`): `_wake_model()` lazy-loads the openWakeWord model;
  `Ears._await_wake()` runs it on the mic stream and blocks until the phrase is heard, then
  `listen_once` captures the command as normal. openWakeWord + scipy + scikit-learn added to
  `pyproject.toml` / `uv.lock`. Reapply after a backtalk update if `ears.py`/`config.py` get
  overwritten.
- Models cache under the openwakeword package dir (~10 MB, `hey_mycroft` + shared
  melspectrogram/embedding/silero-vad). Inference ~7 ms per 80 ms frame on this CPU.
- Tested headless: a Kokoro-synthesized "Hey Mycroft" peaks the score at 1.00; 3 s of white
  noise peaks at 0.001. Real-voice detection through the live mic is Nathan's to confirm.

### Wake phrase tuning (2026-09-22)

`wake_phrase_fuzz` is the fuzzy-match bar (0-1, default 0.80). On the rebuilt Surface with
`base.en`, Nathan's "hey beast" came through as "how you beast" and "bye beast", both scoring
0.778, so the default missed him. Set to **0.76**, not 0.75: at 0.75 exactly, "a beast" and
"hey bee" (both 0.750) would wake it, which is what the default exists to block. "the beast"
(0.89) and "yo beast"/"hi beast" (0.82) wake at any of these settings. To score a phrase:
`difflib.SequenceMatcher(None, "<two heard words>", "hey beast").ratio()`.

`wake_debug` is **off**. When on, it logs every utterance the open mic transcribes into
`logs\backtalk.log`, so room conversation ends up on disk. Turn it on only while tuning, then
off again. All of them (09-22 and the old install's 08-29 to 09-02 batch, 837 lines) were scrubbed
from the log on Nathan's OK on 09-22; to do the same
again, remove lines matching `^<date> .* \[ears\] wake heard:` (the file can be edited while
the voice line runs; it appends).

## Running the voice line

- Desktop shortcut "Talk to The Beast", or `uv run python -m backtalk.main` from the backtalk folder.
- `start.bat` / the shortcut uses `uv sync --inexact` — do not run a bare `uv sync` (exact),
  it prunes `pip` and the `en_core_web_sm` spaCy model that Kokoro needs.
- **"Goodbye The Beast"** hangs up cleanly (the startup line says "say 'goodbye the beast' to
  hang up"; it is "goodbye" plus the agent's `name`). Logs: `backtalk\logs\backtalk.log`.
- Hold Caps Lock, speak, release, then leave the key alone: **pressing it while The Beast is
  talking cancels the reply**.
- First run after a wipe downloads Whisper `base.en` (Systran) and Kokoro-82M into
  `C:\Users\Fredy 2\.cache\huggingface\hub`; the symlink warning during that is harmless.
  On 2026-09-22 startup took about 8 minutes, most of it Kokoro loading while RAM was short
  (0.3 GB available). Closing Obsidian got it through.

### Whisper repetition loops (local patch, 2026-09-22)

Symptom: push-to-talk turns arrive as "Okay. All right. All right..." or "Okay. Okay. Okay..."
whatever was said. Cause: upstream calls `model.transcribe(..., temperature=0.0)`, which
disables faster-whisper's re-decode of looping output, and the Surface mic is fairly quiet
(speech around -40 dBFS RMS on the generic driver), which makes loops start. Ruled out on the
way, each by measurement: mic level (Whisper transcribed a plain recording correctly, and 8 dB
of gain changed nothing), Caps Lock handling (a 3 s hold read as 2.99 s), and the speaker and
open-mic streams being open at once (same level, and the first twelve words came through
fine before the loop).

Fix, local commit `cd7198b` in `backtalk/ears.py` `transcribe()`: `temperature=(0.0, 0.2,
0.4, 0.6, 0.8, 1.0)`. Tested on the recording that looped: "1-2-3...-12-8-12-8-12..." became
"1, 2, 3, ... 12, 13."; clean recordings decode the same. Worth reporting upstream.

## Audio output device (local source patch, 2026-08-29)

On this machine, `sounddevice` defaults to the **MME** host API and that endpoint
("Surface Omnisonic Speakers", device 3) is silent — so nothing backtalk spoke was
audible, even though synthesis succeeded. The working output is **WASAPI**, device 8
("Surface Omnisonic Speakers – Surface High Definition Audio"). Host APIs here:
0 MME (out 3), 1 DirectSound (out 6), 2 WASAPI (out 8), 3 WDM-KS (out 15).

DirectSound (device 6, "Primary Sound Driver") was tried too and was **also
silent** — its default endpoint is not the active output. **WASAPI device 8 is the
one that works.**

Stock backtalk had no output-device setting (only `stt_device` for the mic). Added:

- `backtalk/config.py` — new default `"tts_device": "auto"`.
- `backtalk/mouth.py` — `_resolve_tts_device()` maps the config value to a
  sounddevice selector: `"auto"`/empty → `None` (library default); an int or digit
  string → that device index; any other string → first output-capable device whose
  name contains it. `_get_out()` now passes `device=` to `sd.OutputStream`, and when
  the target device is on the WASAPI host API it also passes
  `extra_settings=sd.WasapiSettings(auto_convert=True)` — WASAPI shared mode
  otherwise rejects any rate but the device mix rate (Kokoro is 24 kHz, the device
  wanted 48 kHz → `PortAudioError: Invalid sample rate`).
- `backtalk/mouth.py` — WASAPI shared-mode streams auto-idle the instant their
  buffer drains (the pause between sentences), and a later `write()` then raises
  `paStreamIsStopped` (-9983) or `paBadStreamPtr` (-9988). The long-lived stream
  ("audio law #1") is **kept** — reopening it per sentence adds an audible gap
  Nathan complained about — but `_play_stream._write` now guards every write:
  `if not out.active: out.start()`, and on any exception it drops and reopens the
  stream once and retries the chunk. `_get_out()` similarly self-heals a bad
  cached stream. `_is_wasapi()` is the host-API check.
- `backtalk.json` — `"tts_device": 8`.

Confirmed working 2026-08-29: a 4-sentence spoken test played in full through
device 8 with no errors.

**These edits are in tracked files** (`config.py`, `mouth.py`), so a `backtalk`
update can conflict or overwrite them. After any `./update.bat` / "pull the latest
backtalk", re-check these two files and reapply if lost. `backtalk.json` is
untracked and safe.

**Rechecked after the rebuild (2026-09-22):** device 8 is still the right one, now named
"Speakers (Surface High Definition Audio)" on Windows WASAPI (the rebuild's generic driver
dropped the "Omnisonic" name). MME is 0-3, DirectSound 4-7, WASAPI 8-9, WDM-KS 10 and up. So
`"tts_device": 8` needs no change, but it survived by luck: the numbering depends on what's
plugged in. To list devices, from the backtalk folder:
`.venv/Scripts/python.exe -c "import sounddevice as sd; print(sd.query_devices())"`.

If device indices ever shift (hardware added/removed), switch `backtalk.json` to a name
substring instead. "Omnisonic" no longer matches anything; check the list first, and note
that a bare "Speakers" matches several host APIs, so pick one that is unique to the WASAPI
entry.

## Rebuilding the venv (checked 2026-09-21)

The `.venv` is not in the backup, so a wipe means recreating it. From the backtalk folder:

1. `uv sync --inexact` (about 160 packages, torch is the big download)
2. `uv pip install pip`
3. `uv run python -m spacy download en_core_web_sm`

`uv sync` installs neither `pip` nor the spaCy model, and kokoro needs both. `webrtcvad`
installs as the prebuilt `webrtcvad-wheels`, so no C++ Build Tools are needed. The local
source patches (wake-phrase gate in `ears.py`, WASAPI output in `mouth.py`, `tts_device` in
`config.py`) are committed in the backtalk repo (`0b9cec7`, merged in `8190423`; plus the
Whisper loop fix `cd7198b`, 2026-09-22), so a
restored folder keeps them. A fresh clone from upstream would not, so since 2026-09-22 they are
also backed up in the my-agent repo as `tool-configs\backtalk-local.bundle` (full history) and
`tool-configs\backtalk-local.patch` (one plain diff), both tested to restore. Restore steps are in
`tool-configs\README.md`. The snapshot branch and tag `pre-upstream-merge` mark the state before
the last upstream merge. If the source changes again, rebuild the bundle and patch (commands in
the same README).

## When it breaks

Read `backtalk\TROUBLESHOOTING.md` (Windows notes near the end) and `logs\backtalk.log`.
Known machine-specific quirks: `webrtcvad` needed MS C++ Build Tools to compile (installed);
if the voice fails to load, `PHONEMIZER_ESPEAK_LIBRARY` must point at `libespeak-ng.dll`
under `Program Files\eSpeak NG`.

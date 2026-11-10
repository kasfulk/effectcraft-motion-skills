# Reel port — Design

Date: 2026-11-10 · Status: approved in chat, awaiting written-spec review

## Goal

Bring the useful parts of `reel-skill-chat` (a chat-sandbox reel studio built on HTML canvas,
three.js, Chromium and a numpy mixer) into effectcraft-motion: sound in the spec, a few brand
constants, four looks as themes, and the reel workflow as a reference document. The engine stays
effectcraft-cli; nothing from the Chromium/three.js pipeline is ported.

## Verified on effectcraft-cli 0.23 (2026-11-10)

- `app.project.importFile` takes `.ogg`, `.m4a`, `.wav`; footage reports `hasAudio`, `duration`.
- `layer.property('Audio').property('Audio Levels').setValue([dB, dB])` works.
- `render --format h264` muxes an AAC track; no ffmpeg mix step is needed.
- Audio inside a scene precomp plays in `Main` at the right offset, but is **cut at the precomp's
  end**. Sound layers therefore go in `Main`, not in scene comps.
- Arabic with full tashkeel shapes correctly with `Amiri-Regular` (installed system font).
- System fonts for the new themes resolve: Futura, Didot, Baskerville, Chalkduster, Menlo.

## Spec fields

```json
{"theme":"lentera","bed":"rain","handle":"@halaman","scenes":[
  {"type":"hook","text":"…","sfx":["bong"]},
  {"type":"quote","text":"…","arabic":"…","source":"HR. Bukhari 6464"},
  {"type":"stat","value":72,"sfx":[{"id":"kit:whoosh-slow-soft","at":0.2,"db":-3}]}]}
```

| field | level | type | rule |
|---|---|---|---|
| `bed` | spec | string | one of the 13 names in `assets/sfx/beds/` or `none` (default `none`) |
| `handle` | spec | string | non-empty; draws the watermark |
| `sfx` | scene | array | items are a name string or `{id, at?, db?}` |
| `sfx[].id` | | string | a local name (table below) or `kit:<id>` present in `assets/sfx-kit/sounds.json` |
| `sfx[].at` | | number | seconds from scene start, `0 ≤ at ≤ 15`; default `0`. A time past the scene's final (possibly auto-extended) duration fails at build: `scene 2 (stat): sfx 1 at 4s is past the scene end (3.5s)` |
| `sfx[].db` | | number | `-24 … +6`, added to the sound's base gain; default `0` |
| `arabic` | `quote` | string | non-empty; set above the quote text |

Local names map to files in `assets/sfx/`: `key` (keypress 1–6, rotated), `tick` (chips-collide
1–4, rotated), `drop`, `plink`, `tap`, `thud`, `bell`, `bell2`, `bong`, `slide`, `glass` (rotated),
`wood` (rotated), `thunder` (rotated). Rotation is per spec in order of appearance.

Errors follow the existing pattern: `scene 2 (stat): sfx 1: unknown sound "kit:nope"`,
`bed: unknown "lake" (birds, breeze, …, none)`.

## Sound placement and level

- Each sound becomes a footage layer in `Main` at `sceneStart + at − sync`, where `sync` is the kit
  sound's `sync.at` (0 for local sounds). A start before 0 is clamped to 0.
- Base gain per file comes from `assets/sfx/levels.json`, written once by `test/levels.sh`
  (ffmpeg ebur128 per file): one-shots normalised to about −21 LUFS, beds to about −38 LUFS
  integrated. Final level = base + `db`.
- The bed is one footage layer looped by repeated layers to the total duration, with 1 s
  fade-in and fade-out keys on Audio Levels.
- Kit sounds are downloaded on first use from
  `https://raw.githubusercontent.com/wyzowl/sfx-kit/main/<file>` into
  `~/.cache/ecm/sfx-kit/`, verified against `sha256` in `sounds.json`; a mismatch deletes the file
  and fails with `sfx: kit:<id> failed its sha256 check`. No network and no cached file fails
  the same way with `could not download`. Kit base gain is `level.lufs` from `sounds.json`
  normalised to −21 LUFS; no measuring step.
- After `render`, `ffmpeg -af ebur128` reads the maximum momentary loudness. Above −18 LUFS prints
  `TOO LOUD at <t>s (<M> LUFS)` and exits 0 (a warning, the MP4 is kept).

## Brand constants

- `handle`: a text layer in `Main`, label font, 30 px, `muted` colour, opacity 20 %, centred at
  y 1475, from 0 to the end. If the last scene is `outro`, it fades out over 0.5 s from that
  scene's start.
- `arabic` on `quote`: font `theme.fonts.arabic`, default `Amiri-Regular`, right-justified,
  centred block above the quote text; the quote text moves down by the Arabic block's height.
  `assertFonts` also checks the Arabic font when a spec uses `arabic`.
- Scheherazade New is shipped in `assets/fonts/`; installing it to `~/Library/Fonts` and setting
  `fonts.arabic` to `ScheherazadeNew-Regular` is documented, not automatic.

## Themes

Four themes from reel-skill-chat style recipes, colours and fonts taken from each recipe's Look
section. Motifs reuse the existing set only.

| name | base / ink / accent | display / body / label | motifs | recipe |
|---|---|---|---|---|
| `riso` | `#f0e6d0` / `#1b6fc4` / `#ff4aa8` | Futura-Bold / Futura-Medium / Menlo-Regular | `square`, `hardShadow` | riso-print |
| `editorial` | `#e8ddc9` / `#1d1914` / `#7a1f2b` | Didot-Bold / Baskerville / HelveticaNeue | `thin`, `lineLabel` | editorial-spread |
| `lentera` | `#0d1b3a` / `#f6e9cf` / `#ffb347` | Baskerville-Bold / Baskerville / Menlo-Regular | `glow` | lantern-night |
| `kapur` | `#2c4639` / `#f0f2ec` / `#f6de78` | Chalkduster / Chalkduster / Menlo-Regular | `underline` | chalkboard-lesson |

Exact PostScript names are confirmed by `assertFonts` during implementation; a name that does not
resolve is replaced by the nearest installed face and the table is updated.
`reference/themes.md` gains the rows and a suggested `fx` per theme (`riso`: grain; `editorial`:
paper; `lentera`: glow, vignette; `kapur`: grain, paper).

## Reel workflow: `reference/reel.md`

A condensed version of the mg-reel chain, adapted to this skill. Each step ends at a stop where
the user approves.

1. **Questions** (one AskUserQuestion): source, mood (soft/intense), theme or "pitch me", length.
2. **Sources**: every claim read on its primary page; Islamic pages read sunnah.com / quran.com.
   Record title, URL, quoted line in `script.md`.
3. **Story**: pick a shape from `reference/story-shapes.md`; write three hooks from
   `reference/hooks.json` formulas, pick one; copy in the brand voice; one citation per screen;
   end with a comment ask.
4. **Look**: pitch two themes plus `fx`; preview one hero scene each.
5. **Spec and storyboard**: write the spec (scenes, `sfx`, `bed`, `handle`); `preview` sheet is
   the storyboard.
6. **Render and deliver**: `render`; fix any `TOO LOUD`; write the caption; run
   `scripts/caption_check.py`.

Carried rules: sparse sound (about one every 3–5 s, one at a time), no scratchy writing sounds,
soft reels avoid `thud`/`bong`/`thunder`, no hum, the Islamic-page rules (no drawn prophet, no
six-pointed star or emblem), no invented numbers.

Per-reel files live in the caller's working directory at `reels/<YYYY-MM-DD>-<slug>/`
(`script.md`, `video.json`, MP4). Brand and taste come from `templates/brand.md` and
`templates/taste.md`, copied once to `reels/brand.md` and `reels/taste.md`.

## Files

| path | change |
|---|---|
| `bin/ecm.mjs` | validate `bed`, `handle`, `sfx`, `arabic`; kit download + sha256; post-render loudness check |
| `lib/core.jsx` | `addAudio(comp, file, t, db)`, watermark |
| `lib/scenes.jsx` | `quote` draws `arabic` |
| MAIN in `ecm.mjs` | place sfx and bed layers in `Main` |
| `themes.json`, `reference/themes.md` | four themes |
| `assets/sfx/levels.json`, `test/levels.sh` | base gains |
| `reference/reel.md`, `reference/sound.md` | workflow; sound names, levels, rules |
| `reference/story-shapes.md`, `reference/hooks.json`, `reference/THIRD-PARTY.md` | copied |
| `scripts/caption_check.py` | copied; ask regex also accepts `komen`/`komentar`/`tulis` |
| `templates/brand.md`, `templates/taste.md` | copied |
| `SKILL.md` | spec table rows, sound line, link to `reel.md` |

## Not ported

Canvas/three.js style pages and style prompts, carousel, parable, coach, idea scout, ledger and
review flows, ElevenLabs voiceover, `mix.py` synth sounds (`boom`, `rise`, `beat`; kit sounds
replace them), `hookscore.py` (English word lists misjudge Indonesian hooks).

## Testing

- Unit (`test/ecm.test.mjs`): valid and invalid `bed`, `handle`, `sfx` (names, `kit:` ids, `at`
  range, `db` range), `arabic`; local-name rotation; sync offset maths.
- Smoke (`test/smoke.sh`): one 2-scene spec with `bed`, a local sfx and a cached kit sfx renders;
  `ffprobe` shows an audio stream; silencedetect shows sound within 1 frame of the planned time.
- One manual render of `examples/reel.json` in each new theme, sheet read before render.

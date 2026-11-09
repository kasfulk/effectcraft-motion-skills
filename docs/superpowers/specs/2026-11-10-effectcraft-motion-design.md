# effectcraft-motion — Design

Date: 2026-11-10 · Status: approved in chat, awaiting written-spec review

## Goal

An agent skill that makes vertical 9:16 motion-graphics and infographic videos (TikTok/Reels) with
`effectcraft-cli` 0.22.0, consistently and with good taste, runnable by cheaper models (Sonnet/Haiku).
Timing comes from text only (no voiceover/beat sync).

## Why a rewrite

The original repo (22 `.sh` scripts + `SKILLS.md`) cannot run on the installed CLI:

- Subcommands `set_property` (93×), `add_effect` (73×), `add_keyframe` (21×), `set_parent`,
  `set_track_matte` do not exist; the CLI rejects them.
- Exec ids `layer.addComp`, `layer.importAsset`, `mask.add`, `layer.new`, `layer.duplicate` do not exist.
- 8 of 42 effect names are wrong (`FourColorGradient` → `4-Color Gradient`, `Ramp` → `Gradient Ramp`,
  `TurbulenceDisplace` → `Turbulent Displace`, `Particular`/`RGBSplit` absent; `TrimPaths`, `Repeater`,
  `TextAnimator` are shape items / commands, not effects).

The original state is preserved in git commit `57144a5`.

## Verified engine facts (spikes, 2026-11-09)

- `effectcraft-cli script FILE.jsx --empty --save-as P.ecproj` runs an After Effects-style object model:
  comps, precomps placed via `comp.layers.add(precomp)` with `startTime`, shape groups
  (rect/ellipse/fill/stroke/trim), text animators with range selectors, `KeyframeEase`,
  `setTemporalEaseAtKey`, expressions on Source Text (live counters), `sourceRectAtTime` (real text width).
- The JSX sandbox cannot read files outside the project folder → the spec and library must be
  **inlined into one generated script**.
- An unknown font name is silently substituted (no error), and `text.fonts` lists families, not PostScript names →
  fonts are verified by a width probe inside the generated JSX (see Error handling).
- `render-frame --max-side 480` ≈ 6–20 ms/frame; full 4 s 1080×1920 h264 render ≈ 1 s.
- `ffmpeg`, `magick`, `node` v24 are installed.

## Architecture

```
effectcraft-motion-skills/
  SKILL.md            ≤500 words: when to use, workflow, rules, red flags
  reference/
    scenes.md         scene type catalog + fields
    themes.md         the 6 themes + when to use each
    cli.md            verified CLI commands + pitfalls (sandbox, fonts, serial render)
  themes.json         theme tokens (colors, fonts, easing profile, shape style)
  lib/core.jsx        utilities: easing, text auto-fit, safe area, shape helpers
  lib/scenes.jsx      one builder per scene type
  bin/ecm.mjs         validate spec → assemble one script → build → contact sheet → render
  examples/*.json     example specs
  test/smoke.sh       the one runnable check
```

`ecm.mjs` is Node with no dependencies.

### Workflow

1. Agent writes `video.json`.
2. `node bin/ecm.mjs preview video.json` → `video.ecproj` + `video.sheet.png` (one frame per scene,
   taken at that scene's settle time).
3. Agent reads the sheet; fixes the spec; repeats.
4. `node bin/ecm.mjs render video.json` → `video.mp4` (serial, one at a time).

Outputs are written next to the spec, same basename, overwritten each run (all derivable from the spec).

## Spec schema

```json
{
  "theme": "reel",
  "out": "hemat.mp4",
  "scenes": [
    {"type": "hook",  "text": "Gaji naik, tabungan tetap?", "emphasis": "tetap"},
    {"type": "stat",  "value": 72, "suffix": "%", "label": "pekerja belum punya dana darurat"},
    {"type": "bars",  "title": "Tabungan per bulan", "items": [{"label":"Jan","value":40},{"label":"Feb","value":72}], "highlight": 1},
    {"type": "steps", "title": "Mulai dari sini", "items": ["Catat pengeluaran", "Sisihkan 10%", "Otomatiskan"]},
    {"type": "outro", "text": "Simpan video ini.", "cta": "Follow untuk tips lain"}
  ]
}
```

`out` is optional (default: spec basename + `.mp4`).

| `type` | Required | Visual |
|---|---|---|
| `hook` | `text` | Large headline; `emphasis` word in accent color |
| `kinetic` | `lines[]` | Stacked phrases revealed one by one |
| `stat` | `value` | Giant number counting up; `prefix`/`suffix`, `label` |
| `bars` | `items[]` (`{label,value}`) | Bars grow in sequence; `highlight` index in accent |
| `donut` | `value` (0–100) | Trim-path ring fills, percent counts up; `label` |
| `steps` | `items[]` (strings) | Numbered list, staggered entrance |
| `compare` | `left`, `right` (`{title, points[]}`) | Two blocks, "vs" |
| `quote` | `text` | Quote + `source` |
| `outro` | `text` | Closing line + `cta` |
| `custom` | `jsx` | Escape hatch: raw JSX body receiving `(comp, theme, scene, dur)` |

Optional on every scene: `duration` (s), `emphasis`, `title`, `bg` (`base` \| `ink` \| `accent`, default `base`).

### Duration

`1.2 + 0.37 × words + 0.25 × dataItems` seconds, clamped to 2.5–7 s; `tenang` multiplies by 1.2;
`duration` overrides. Words count all text fields of the scene.

### Transitions

Each scene owns its entrance and a 0.3 s exit at its end; hard cut to the next scene. No crossfades.

### Validation (before any CLI call)

Unknown `type`, missing required field, item counts outside limits (kinetic 1–6 lines, bars 2–6 items,
steps 1–5 items, compare ≤4 points per side), bars with every value 0, donut `value` outside 0–100,
`highlight` out of range, `emphasis` not in the scene text, unknown theme or `bg` → exit 1 with
`scene N (type): <field> <problem>`.

## Themes (v1)

Tokens derived from `~/Clipper/template/themes/satsetmotion-styles.json`; satsetmotion coordinates
(720×1280) scale ×1.5 to 1080×1920.

| Theme | Base / ink / accent | Display font | Easing | Signature |
|---|---|---|---|---|
| `reel` | `#f2efe8` / `#111111` / `#e63323`; `#ffd400` numbers only | HelveticaNeue-CondensedBlack | `snap` | Square color blocks slide in from edges, left-aligned, no shadow |
| `pitch` | `#f6f5f1` / `#16171c` / `#2b59ff` | Inter-ExtraBold + JetBrainsMono labels (`01  IDE`) | `smooth` | Thin lines drawn with trim paths; accent fills at alpha 0.14 |
| `infopop` | `#fff6e6` / `#1d2340` / `#ff8a3d` (marker `#ffd23f`, data `#1fc2a7`) | Montserrat-ExtraBold | `pop` | 6 px outline, hard shadow offset 9 px, tilted highlighter behind keyword, centered |
| `kinetik` | `#0b1416` / `#e6f4f1` / `#ffb000` | DINCondensed-Bold | `snap` | Left-aligned stacked phrases, accent underline that extends |
| `tenang` | `#eef0e6` / `#2f4a3a` / `#d9734e` | AvenirNext-Medium; quotes PlayfairDisplayRoman-Bold | `calm` (×1.2 duration) | Lots of empty space, soft glow behind accent |
| `edukasi` | kraft `#d9b98c` + cream sheet `#fbf6ea` / `#26355d` / `#f07a5a` | AvenirNext-Bold | `pop` | Paper cutouts without outline, soft shadow, paper tag with coral pin |

`bg` variants: `base` = theme base + ink text; `ink` = ink background + base text; `accent` = accent
background + text whichever of base/ink has higher contrast.

Easing profiles (`KeyframeEase` influence, %):
`snap` out 0 / in 90 · `smooth` out 30 / in 75 · `pop` scale overshoot 112 % then settle · `calm` 60 / 60.

Other satsetmotion styles (`scribble3d`, `kapur`, `diorama`, `blueprint`, …) are out of v1; adding one =
a `themes.json` entry plus any new motif helper.

## Rules enforced in `lib/` (not just documented)

- **Safe area:** content only within x 90–940, y 250–1450 (TikTok/Reels UI covers top, bottom, right).
- **Text auto-fit:** measure with `sourceRectAtTime`, word-wrap, shrink to fit; floors body 48 px,
  label 36 px. Still not fitting at the floor → throw `scene N: text too long`.
- **Easing:** position/scale never linear; always the theme's profile.
- **Rhythm:** entrance 0.4–0.6 s, 70 ms per-item stagger, ≥1.2 s hold after the last element settles,
  0.3 s exit.
- **One accent per scene:** only `emphasis`/`highlight` gets the accent color.
- **Micro-motion:** every scene drifts scale 100 → 103 over its duration (no frozen frames).
- **Fonts:** only fonts verified by the width probe.

## Error handling (`ecm.mjs`)

- Spec validation as above.
- Each scene build is wrapped in try/catch inside the generated script and rethrown as
  `scene N (type): <original message>`.
- Font preflight: a width probe inside the generated JSX measures each theme font against a fallback;
  a font whose width matches the fallback is substituted → the script throws, `ecm` exits 1.
- Blank-frame check runs inside `ecm` (`preview` and `render`), not only in `test/smoke.sh`.
- Render lock: `mkdir /tmp/ecm-render.lock`; held → exit 1 "another render is running"; removed on exit.

## Testing

1. `test/smoke.sh` (the one runnable check): one spec with all 9 scene types plus one `custom` scene built for each of the 6
   themes; assert exit 0, sheet exists, no blank frames (`magick` pixel stddev); one broken spec must fail
   with the expected message. Target < 1 min.
2. Visual review of every theme's contact sheet during implementation.
3. Skill TDD (writing-skills): RED = Sonnet subagent without the skill asked for a 9:16 infographic video
   (record failures); GREEN = same scenario with the skill; close loopholes; re-test.

## Migration & install

- Delete the 22 old scripts and `SKILLS.md`; replace with `SKILL.md` (history in git `57144a5`).
- Symlink `~/.claude/skills/effectcraft-motion` → this repo.
- Trigger split with `clipper-motion`: `effectcraft-motion` when the user says *effectcraft*, asks for
  infographics/data/numbers/charts, or a style other than "pitch" kajian; `clipper-motion` stays for
  pitch-style kajian videos from opus-video-prompts. Each description points to the other.

## Out of scope (v1)

Arabic/RTL text, line charts, maps, audio sync, crossfade transitions, remaining satsetmotion themes.

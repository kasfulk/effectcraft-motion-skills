---
name: effectcraft-motion
description: Use when making vertical 9:16 motion graphics or infographics (numbers, charts, lists, kinetic text) with effectcraft-cli / EffectCraft, or a satsetmotion-style theme other than pitch kajian — for pitch-style kajian videos from opus-video-prompts use clipper-motion.
---

# effectcraft-motion

A JSON spec becomes a 1080×1920 30 fps MP4 with eased motion, theme fonts, safe-area checks, and text-derived timing. **Never hand-write effectcraft-cli JSX for these scene types**. Hand-written builds get linear keys, default fonts, and misplaced labels.

## Workflow

```bash
E=~/.claude/skills/effectcraft-motion/bin/ecm.mjs
node $E check   video.json                          # validate; estimated seconds
taskpolicy -b nice -n 19 node $E preview video.json # builds project + video.sheet.png
# Read the sheet. Fix the spec, re-preview.
taskpolicy -b nice -n 19 node $E render  video.json # ~1 min; last line = MP4 path
```

## Spec

```json
{"theme":"reel","out":"hemat.mp4","scenes":[
  {"type":"hook","text":"Gaji naik, tabungan tetap?","emphasis":"tetap"},
  {"type":"stat","value":72,"suffix":"%","label":"pekerja belum punya dana darurat"},
  {"type":"bars","title":"Tabungan per bulan","items":[{"label":"Jan","value":40},{"label":"Feb","value":72}],"highlight":1},
  {"type":"steps","title":"Mulai dari sini","items":["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]},
  {"type":"outro","text":"Simpan video ini.","cta":"Follow untuk tips lain"}]}
```

| type | needs | use for |
|---|---|---|
| hook / quote / outro | `text` (+`emphasis`, `source`, `cta`) | opener, citation, closer |
| kinetic | `lines` 1–6 | phrases revealed one by one |
| stat | `value` (+`prefix`,`suffix`,`label`) | one big counting number |
| bars | `items` 2–6 `{label,value}` (+`highlight`) | comparison over categories/time |
| donut | `value` 0–100 | a share/percentage |
| steps | `items` 1–5 | numbered how-to |
| compare | `left`,`right` `{title,points≤4}` | before/after, A vs B |
| custom | `jsx` | anything else, via core helpers |

Optional per scene: `title` (kinetic/bars/steps), `bg` (`base`/`ink`/`accent`), `duration` (1–15 s; omit to time from text). Fields: [reference/scenes.md](reference/scenes.md).

**Effects:** `fx` at spec or scene level, e.g. `"fx":["grid","rgbIn"]`. Presets: `grid liquid paper grain vignette glow rgbIn blurIn sweep float glitch`. Two or three per scene; `liquid`/`paper` add render time. See [reference/fx.md](reference/fx.md).

## Themes

reel: bold news/finance · pitch: calm, technical · infopop: playful explainer · kinetik: dark, high-energy · tenang: soft, reflective · edukasi: lesson/worksheet. See [reference/themes.md](reference/themes.md).

## Rules

- **Read the whole sheet before every render** (one settled frame per scene).
- **One engine process at a time.** Never run preview/render in parallel or in the background. `render` holds `/tmp/ecm-render.lock`; `preview` doesn't, so never preview during a render.
- **Fix errors in the spec.** Errors name the scene: `scene 3 (bars): text too long`.
- **Use only numbers from the user or a cited source.** Never invent data. If you have no numbers, ask for them. If you can't ask, use hook/kinetic/steps/compare and say the video has no data.
- **Raw effectcraft-cli** only for edits outside these scenes: [reference/cli.md](reference/cli.md) (verified pitfalls).

## Common mistakes

| Mistake | Instead |
|---|---|
| Probing the API by trial, writing JSX | Write a spec. New visual: `custom` + helpers (scenes.md) |
| Checking 2–3 frames | Read every frame on the sheet |
| Every scene fixed at 3 s | Omit `duration` |
| Default font, generic dark bg | Pick a theme |
| Hand-adding AE effects in `custom` JSX | Use an `fx` preset; new effect: add it to `lib/fx.jsx` |
| `sed -i` on macOS | Use the Edit tool on the spec |
| Sheet shows sparse/lopsided scene | Fix the spec, re-preview (cheap) before the one render |

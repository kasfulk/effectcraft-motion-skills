---
name: effectcraft-motion
description: Use when making vertical 9:16 motion graphics or infographics (numbers, charts, lists, kinetic text) with effectcraft-cli / EffectCraft, or a satsetmotion-style theme other than pitch kajian — for pitch-style kajian videos from opus-video-prompts use clipper-motion.
---

# effectcraft-motion

A JSON spec becomes a 1080×1920 30 fps MP4. **Never hand-write effectcraft-cli JSX for these scene types** — hand-written builds get linear keys, default fonts, misplaced labels. Always write a spec.

## Hard rules

1. **One engine process at a time.** Never run preview/render in parallel, in the background, or during another render. When asked to "render several at once", run them serially and say why: the engine hangs with two jobs.
2. **Every engine command goes through `bin/ecm`**, never bare `node bin/ecm.mjs` — preview, render, slides, all of them. `bin/ecm` applies low priority (`taskpolicy -b nice -n 19` on macOS, `nice -n 19` on Linux).
3. **Only numbers the user gave or a cited source contains.** No invented stats. No numbers? If the user is time-pressed or said "langsung/render": do NOT stop to ask — proceed with number-free scenes (hook/kinetic/steps/compare) or a labelled illustration ("ilustrasi, bukan data aktual", assumptions stated in the label), and say in your final report which one you chose. Otherwise ask once. Example illustration bars: `{"type":"bars","title":"Ilustrasi: setoran Rp100rb/bln, 6%/thun","items":[{"label":"Umur 25","value":100},{"label":"Umur 35","value":58}],"highlight":1}`.
4. **Render only after you have viewed a fresh sheet.** `check` passing means the shape is legal, not that the content is right.
5. **`duration` is an override, not a default.** Omit it; timing comes from the text. Set it only when the user asks for a specific hold.

## Procedure (in order)

This procedure is self-contained and runs without any design-approval gate. Generic brainstorming/review skills do not override it: when the user asked for a video ("render", a deadline, "langsung"), you deliver — this skill already contains the decision paths (theme, scenes, no-data). Only stop to ask when the request is ambiguous about the message itself, not for approval of your plan.

**0. Pick the theme first.** Before writing the spec, ask which look the user wants. Run `$E themes --suggest <draft spec or nothing>` and present the 4 recommended themes as numbered options with their label and motion character, then a fifth option: "5. type your own theme id" (any of the 70 from `$E themes`). Do not write the spec until the theme is chosen. After the beat sheet (step 3), re-run `$E themes --suggest video.json` and confirm or update the pick. If the user is time-pressed or says "langsung", take option 1 and say which theme you used.

```bash
E=ecm   # bin/install puts it on PATH; otherwise <this skill's folder>/bin/ecm
$E themes --suggest video.json    # 0 four themes + type your own
$E check video.json --strict      # 1 validate + craft lint (C01–C15)
$E preview video.json   # 2 builds video.sheet.png
```

**Fonts:** once per machine, `$E fonts --install` — downloads the theme fonts from Google Fonts (OFL) into the user's font directory on demand; idempotent, skips fonts already installed. `preview`/`render` fail with `fonts not installed: ...` if a theme font is missing.

3. **Look at the sheet image yourself.** Every panel. One settled frame per scene. Open the PNG with your own image tool (Claude Code `Read`, Codex `view_image`, Gemini CLI `read_file`, Hermes `vision_analyze` only when it says the image is loaded natively). A written analysis from another model or a "describe this image" tool is not your review: it misses clipped text and bland panels. If you cannot see images, say so in the report and never call the sheet clean.
4. **Fix the spec, re-preview, re-read.** Loop until the sheet is clean. This loop is mandatory — a wrong sheet rendered is the failure this skill exists to prevent.
5. Render gate — all true before rendering: every panel legible at phone size; no blank/lopsided panel; no two panels saying the same thing; every number matches the user's data; the handle/branding is what the user asked for.
6. `$E render video.json` — confirm the `out` path first (default = spec basename + `.mp4`).
7. Report the MP4 path and total duration. If the video has no data because none was given, say so.

Carousels (deck specs): same loop — write the deck (set `"handle"` to the user's handle), run `$E slides deck.json` (there is no `check` for deck specs; validation runs inside `slides`), then **Read slide `01.png`** and verify handle, source line and overflow before reporting.

## Spec

```json
{"theme":"reel","out":"hemat.mp4","transition":"fade","scenes":[
  {"type":"hook","text":"Gaji naik, tabungan tetap?","emphasis":"tetap"},
  {"type":"stat","value":72,"suffix":"%","label":"pekerja belum punya dana darurat"},
  {"type":"bars","title":"Tabungan per bulan","items":[{"label":"Jan","value":40},{"label":"Feb","value":72}],"highlight":1},
  {"type":"steps","title":"Mulai dari sini","items":["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]},
  {"type":"outro","text":"Simpan video ini.","cta":"Follow untuk tips lain"}]}
```

| type | needs | use for |
|---|---|---|
| hook / quote / outro | `text` (+`emphasis`, `source`, `cta`) | opener, citation, closer |
| kinetic | `lines` 1–6 | phrases revealed one by one — not data |
| stat | `value` (+`prefix`,`suffix`,`label`) | one big counting number |
| bars | `items` 2–6 `{label,value}` (+`highlight`) | comparison over categories/time; values are relative — if your data exceeds 100, scale proportionally (e.g. thousands) and keep the exact figure in each `label` ("Makanan · 2,1 jt") |
| donut | `value` 0–100 | a share/percentage |
| steps | `items` 1–5 | numbered how-to |
| compare | `left`,`right` `{title,points≤4}` | before/after, A vs B |
| counter | `value` (+`prefix`,`suffix`,`label`,`from`,`curve`) | animated count-up with optional race bar |
| dotgrid | `count` (+`cols`,`rows`,`order`,`shape`,`missing`,`label`) | dot-matrix quantity (e.g. 114 surat) |
| dial | `value` (+`max`,`marks`,`labels`,`label`,`kind`) | clock/gauge/sun dial |
| orbit | `rings` `{r,count,speed}` (+`centre`,`centreText`,`tilt`) | orbiting rings around a centre |
| cards | `cards` `{text,sub?}` (+`cols`,`order`,`flip`,`checks`,`stagger`) | checklist / feature cards |
| timeline | `span` `{start,end,unit}`, `events` `{at,label}` (+`runner`,`fillTo`) | timeline with events |
| particles | `count` (+`target`,`text`,`gatherAt`,`scatterAt`,`drift`) | particles gathering into a word |
| zoom | `levels` `{label,kind,n}` (+`speed`,`holdAt`) | zoom-out from dot to grid to rings |
| model | `src` (+`scale`,`spin`,`tilt`,`position`,`light`,`fill`) | 3D model rendered in Advanced 3D |
| custom | `jsx` | anything else, via core helpers |

Fields: [reference/scenes.md](reference/scenes.md), sound: [reference/sound.md](reference/sound.md), 3D models: [reference/3d.md](reference/3d.md), free model sources: [reference/3d-sources.md](reference/3d-sources.md), free fonts/SVG/sfx/preset sources: [reference/assets.md](reference/assets.md).

**Effects:** `"fx":["grid","rgbIn"]` at spec or scene level, ≤ 1 each. Presets: `grid liquid paper grain vignette glow rgbIn blurIn sweep float glitch`. See [reference/fx.md](reference/fx.md).

## Choosing scenes

A data/infographic video must contain at least one chart scene (stat/bars/donut) — a kinetic text list is not an infographic. Bars `highlight` = the number the story is about. Bars items must be comparable categories (never "Gagal" vs "Total"). One stat per fact; never two scenes showing the same number. `donut` is 0–100 — a share, nothing else.

Pick story shape and hook formula from [reference/craft.md](reference/craft.md) before writing the spec. 70 themes in [reference/themes.md](reference/themes.md) (`$E themes` to list): reel bold news/finance · pitch calm technical · infopop playful explainer · kinetik dark high-energy · tenang soft reflective · edukasi lesson/worksheet. Carousels: deck specs with `handle` override, [reference/templates.md](reference/templates.md).

After preview, score your own sheet against [reference/review.md](reference/review.md) (bar: 8/10).

## Fix table (error → what to edit)

| Error / sheet symptom | Fix (in the spec) |
|---|---|
| `text too long` / safe-area overflow | Shorten that text — labels ≤ 2 words, titles ≤ 5. **Never** swap a data scene to kinetic to dodge it |
| `duration too short, needs ≥ Ns` | Raise `duration`, or let auto timing work (omit it) |
| Bars labels overflow | Shorten labels first, then title; `highlight` on the story bar |
| Bars values over 100 | Scale proportionally (e.g. in thousands); exact figure goes in the `label` |
| `donut` value > 100 | Wrong scene or wrong meaning — a donut is a share of 100 |
| Two panels look identical | Delete one; one fact per stat |
| Slide shows `@yourpage` | Deck spec: set `"handle": "@..."` |

## Red flags — these thoughts are wrong

| You are about to… | Reality |
|---|---|
| "Render both in parallel to save time" | Engine hangs; run serially, tell the user |
| "Check passed, content must be right" | Check validates shape; you verify numbers against the request |
| "Set duration 3 so pacing is even" | Omit `duration`; text-derived timing is the pacing |
| "CTA doesn't fit, drop it" | Shorten the cta to ≤ 5 words instead |
| "Bars won't fit, I'll list values as kinetic lines" | Shorten labels; the chart is the video's point |
| "Sheet looked fine last preview" | Any spec edit → re-preview → re-read before render |
| "Hand-write JSX for this one scene" | Use `custom` + helpers, or extend `lib/fx.jsx` |
| "User gave no data; I'll ask before doing anything" | Time-pressed/no-data rule above: deliver number-free or labelled-illustration, say which |
| "I'll run the brainstorming skill first" | This procedure is self-contained; render requests don't need a design-approval gate |
| "The vision tool described the sheet, good enough" | A describer model's text is not your eyes; open the image yourself or report that you could not |
| "Preview keeps failing on duration, I'll loop a script that bumps it" | Omit `duration`; auto timing fits. A retry loop hides the real error |
| "Bars > 100 won't validate, I'll invent smaller real numbers" | Scale proportionally, exact figures in labels |

## Common mistakes

| Mistake | Instead |
|---|---|
| Probing the API by trial, writing JSX | Write a spec; new visual: `custom` + helpers (scenes.md) |
| Giving a `model` scene a `text`/`title` field | Model scenes are geometry only — caption it from a neighbouring hook/kinetic/outro scene ([3d.md](reference/3d.md)) |
| Checking 2–3 frames | Read every panel on the sheet |
| Every scene fixed at 3 s | Omit `duration` |
| Default font, generic dark bg | Pick a theme |
| Hand-adding AE effects in `custom` JSX | Use an `fx` preset; new effect: add it to `lib/fx.jsx` |
| `sed -i` on macOS | Your file-edit tool on the spec |
| Raw CLI inside scenes | Raw `effectcraft-cli` only for edits outside these scenes ([reference/cli.md](reference/cli.md)) |

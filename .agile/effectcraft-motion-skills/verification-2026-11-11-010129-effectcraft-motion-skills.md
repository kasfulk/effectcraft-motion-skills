# Verification — effectcraft-motion-skills

Session: 2026-11-11-010129-effectcraft-motion-skills
Scope: effectcraft-motion-skills

## Acceptance criteria

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Themes use distinct bundled fonts, not one fallback | `node scripts/remap-theme-fonts.mjs` → `70 themes remapped to bundled fonts`; `themes.json` spot-check: `reel` BebasNeue/Inter/JetBrainsMono, `infopop` ArchivoBlack/Montserrat, `editorial-spread` PlayfairDisplay, `chalkboard-lesson` Caveat/PatrickHand, `pixel-quest` PressStart2P/VT323, `qalam-sketch` Amiri, `art-deco-foil` Monoton/Cinzel | PASS |
| 2 | New scene types render | `node bin/ecm.mjs preview examples/motion-gallery.json` → `examples/motion-gallery.sheet.png`; mid-scene frames `S3_dotgrid`, `S4_bars`, `S10_zoom`, `S11_stat` rendered at 1.5 s and inspected | PASS |
| 3 | Zoom label overlap fixed | `magick compare -metric AE /tmp/S10_zoom.png /tmp/S10_zoom2.png` → `1078.08`; frame shows only `Kota`, previous `Kamu` faded | PASS |
| 4 | Render uses effectcraft-cli | `node bin/ecm.mjs render examples/hemat.json` → `engine effectcraft-cli render --project examples/hemat.ecproj --comp Main --out .../hemat.mp4 --format h264`; output `examples/hemat.mp4` 34,277,914 bytes, total 18.37 s | PASS |
| 5 | Missing fonts fail fast | `checkFonts` in `bin/ecm.mjs` queries `effectcraft-cli exec text.fonts --json` and throws `fonts not installed: ... — run: node bin/ecm.mjs fonts --install`; `assertFonts` removed from `lib/core.jsx` (`grep -rn assertFonts lib bin` → no refs) | PASS |
| 6 | Docs match validator | `reference/scenes.md` rows corrected to validator limits (`cards` 1–3/`row|random`, `timeline` `light|none`, `particles` 1–120/`circle|word|none`, `zoom` `kind` required, `dial` 2–60, `dotgrid` 1–40); `reference/themes.md` lists all 70; `reference/cli.md` font names updated; `SKILL.md` scene table + transitions + `fonts --install` | PASS |
| 7 | Transition anchor shifts no longer break scenes | `grep -n "anchorPoint.setValue\|position.setValue" lib/transitions.jsx` → only `_trAnchorCenter` (default centre) and `trPageTurn`'s `hl` (default centre); `node bin/ecm.mjs preview examples/motion-gallery.json` → all 16 panels visible, `3_dotgrid`/`4_bars`/`10_zoom`/`11_stat` centred | PASS |

## Commands run

```sh
node scripts/remap-theme-fonts.mjs
node bin/ecm.mjs check examples/hemat.json --strict
node bin/ecm.mjs preview examples/hemat.json
node bin/ecm.mjs preview examples/motion-gallery.json
node bin/ecm.mjs render examples/hemat.json
effectcraft-cli render-frame --project examples/motion-gallery.ecproj --comp S10_zoom --time 1.5 --out /tmp/S10_zoom2.png
magick compare -metric AE /tmp/S10_zoom.png /tmp/S10_zoom2.png null:
grep -rn assertFonts lib bin
```

## Notes

- `check --strict` exits non-zero on craft warnings (C05/C06); plain `check` exits 0. No `ERR` lines.
- Transition anchor moves were removed: `trFold`, `trMaskWipe`, `trPageTurn`, `trDipSeed` previously set `anchorPoint`/`position` unconditionally, shifting the outgoing/incoming scene for its whole duration and producing black half-frames. Scale/opacity animations now collapse around the centre.

## Round 2 — black-tail defect found after PASS

### Defect

`bin/ecm.mjs` MAIN placed each scene precomp at `l.startTime = st - ov` (started `ov` early so the incoming transition has a window) but sized the precomp to `dur` only. The layer therefore spanned `dur + ov` while its precomp held `dur` seconds of content, so the last `ov` seconds of every scene rendered **black**. Measured on `examples/motion-gallery.json` scene 5 (`dial`, `pageTurn` in, `ov = 1.0`): `startTime = 12.10`, `outPoint = 16.30`, precomp duration `3.2` → black from `15.30` to `16.30`.

A second defect compounded it: `exitAll` was timed off the **incoming** transition (`TRLEN[tr]` where `tr = trans[i]`), so scene content died `ov` seconds before its own layer ended, leaving a bg-only gap that the incoming layer — still at opacity 0 — could not cover. Frame at `15.60` was a single flat colour.

### Fix

| File | Change |
|---|---|
| `bin/ecm.mjs` | `tr`/`ov` computed before comp creation; precomp duration is `dur + ov` so the layer never outlives its content |
| `bin/ecm.mjs` | `need`-extension sets `c.duration = dur + ov` and extends bg layers to `dur + ov` |
| `bin/ecm.mjs` | `exitAll(c, dur + ov)` — outgoing content stays visible through the transition window so the incoming layer crossfades over it |
| `test/ecm.test.mjs` | transition test re-pinned to the new contract (`dur + ov` comp, `exitAll(c, dur + ov)`) |

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 8 | No black tail in any scene | `ffmpeg -i examples/motion-gallery.mp4 -vf "blackdetect=d=0.03:pix_th=0.10" -an -f null -` | `no black segments` |
| 9 | No flat/dead frames | `ffmpeg -i examples/motion-gallery.mp4 -vf "fps=2,scale=96:-1" /tmp/ms/%04d.png` then per-frame unique-colour count | 108/108 frames non-flat, none dark |
| 10 | Previously-black window renders content | `ffmpeg -ss 15.45 / 15.60 / 15.90` stills | `15.45` dial content fading, `15.60` dial content (was flat cream), `15.90` orbit content |
| 11 | Render still goes through effectcraft-cli | `node bin/ecm.mjs render examples/motion-gallery.json` | `engine effectcraft-cli render --project examples/motion-gallery.ecproj --comp Main --out .../motion-gallery.mp4 --format h264`, `total 54.23` |
| 12 | Output spec | `ffprobe` | h264, 1080x1920, 30/1 fps, 1627 frames, 54.233333 s, 101,408,681 bytes |
| 13 | Unit tests green | `node --test test/ecm.test.mjs` | 46 pass, 0 fail |
| 14 | Other examples unaffected | `node bin/ecm.mjs check examples/{all-scenes,hemat,hostile}.json`; `preview examples/all-scenes.json` | warnings only, no `ERR`; all-scenes sheet rebuilt |

### Commands run (round 2)

```sh
node --test test/ecm.test.mjs
node bin/ecm.mjs preview examples/motion-gallery.json
node bin/ecm.mjs preview examples/all-scenes.json
node bin/ecm.mjs render examples/motion-gallery.json
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -of default=nw=1 examples/motion-gallery.mp4
ffmpeg -v error -i examples/motion-gallery.mp4 -vf "blackdetect=d=0.03:pix_th=0.10" -an -f null -
ffmpeg -v error -i examples/motion-gallery.mp4 -vf "fps=2,scale=96:-1" -y /tmp/ms/%04d.png
```

## Round 3 — flat backgrounds

### Change

Every scene background was a flat solid, which is the main reason the output read as "the same layout every time". `bgFor` in `lib/core.jsx` now builds the background as a solid carrying a `4-Color Gradient` effect: `theme.colors.base` at the top, `shade(base, -0.08)` at the bottom, four corner points pinned to the frame. `shade()` is a new helper. The `sheet` motif rect is unchanged and still sits above the background.

The shape-layer gradient fill (`ADBE Vector Graphic - G-Fill`) was tried first and rejected: this engine's shim exposes `Colors` as a read-only gradient value — `setValue` throws `value must be a number` and `value =` assignment is silently ignored (readback stays white→black). The `4-Color Gradient` effect is the supported path.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 15 | Background is a ramp, not a flat fill | `ffmpeg -ss 14.0` still, column sample | top `(216,208,194)` → bottom `(190,182,171)` |
| 16 | No black frames after the change | `ffmpeg -vf "blackdetect=d=0.03:pix_th=0.10"` | `no black segments` |
| 17 | No flat/dead frames | 2 fps sweep, per-frame unique-colour count | 108/108 non-flat, none dark |
| 18 | Unit tests green | `node --test test/ecm.test.mjs` | 46 pass, 0 fail |
| 19 | All examples still build | `preview examples/{motion-gallery,all-scenes,hemat}.json` | all three sheets rebuilt, no error |
| 20 | Output spec | `ffprobe` | 1080×1920, 30 fps, 1627 frames, 54.233333 s, 101,396,704 bytes |

### Docs updated

- `reference/scenes.md` — "Duration and overlap" now describes the extended precomp and the full-span `exitAll`.
- `reference/fx.md` — background table gains the built-in gradient row.

## Round 4 — identical atmosphere in every scene

### Defect

`lib/atmosphere.jsx` drew three concentric accent ellipses at a hard-coded `(CX, 960)` with fixed diameters `520/640/760` in **every** scene. On the 16-panel sheet that single element was the dominant repeated shape — the literal cause of "the layout is always the same". The `atmosphere` field was also ignored: only `none` was honoured, so `glow`, `grain`, and `full` all produced the identical glow + vignette + grain stack, and the `scene.atmosphere` override the caller already passed was dropped.

### Fix

| File | Change |
|---|---|
| `lib/atmosphere.jsx` | glow centre and diameter seeded from `SCENE_N`: `gx` 275–755, `gy` 540–1380, `gd` 460–700, so no two scenes share a frame and the glow reaches the lower half that the scene builders leave empty |
| `lib/atmosphere.jsx` | `mode = o.atmosphere \|\| theme.motion.atmosphere \|\| 'full'`; `glow` = `glow\|full`, `grain` = `grain\|full`, vignette always on except `none` |
| `lib/core.jsx` | background ramp softened from `-0.12` to `-0.08` |

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 21 | Glow position/size differs per scene | `preview examples/motion-gallery.json` sheet | 16 panels, glow centre and diameter differ across all of them |
| 22 | `atmosphere` modes honoured | `node -e` theme census: `{grain:9, glow:57, full:2, none:2}` | `grain` themes no longer get the accent halo; `glow` themes no longer get noise |
| 23 | No black frames | `ffmpeg -vf "blackdetect=d=0.03:pix_th=0.10"` | `no black segments` |
| 24 | No flat/dead frames | 2 fps sweep, per-frame unique-colour count | 108/108 non-flat, none dark |
| 25 | Unit tests green | `node --test test/ecm.test.mjs` | 46 pass, 0 fail |
| 26 | All examples build | `preview examples/{motion-gallery,all-scenes,hemat}.json` | three sheets rebuilt, no error |
| 27 | Output spec | `ffprobe` | 1080×1920, 30 fps, 1627 frames, 54.233333 s, 101,395,194 bytes |
| 28 | Docs match code | `grep -n "−8%\|-0.08" reference/fx.md` | gradient row and Round 3 text both say −8%, matching `shade(fill, -0.08)` |
| 29 | Stale example re-rendered | `node bin/ecm.mjs render examples/hemat.json` | `total 18.37`; `ffprobe` 1080×1920, 30 fps, 551 frames, 18.366667 s, 34,304,620 bytes; `blackdetect` → `no black segments` |
| 30 | Test counts | `node --test test/ecm.test.mjs \| grep -E "^ℹ (tests\|pass\|fail)"` | `tests 46`, `pass 46`, `fail 0` |

### Docs updated

- `reference/themes.md` — `motion.atmosphere` row now states what each mode applies and that a scene overrides it.
- `reference/scenes.md` — `atmosphere` added to the shared scene fields table.

## Round 5 — motion below the phone's threshold

Benchmark: `../reel-skill-chat/references/look.md`, "Motion numbers" and "Camera and timing".

### Defects

| Rule | Violation |
|---|---|
| "A drift of a few percent is too small to see on a phone… a 3% squash reads as no move at all, 6 to 8% reads." | The per-scene camera push in MAIN was `100 → 103` (3%) |
| "Nothing scales up from zero: start at 0.6 to 0.9 scale with the opacity." | 30 entrance animations across `scenes.jsx`, `scenes-extra.jsx`, `elements.jsx`, `motion.jsx` scaled `[0,0] → [100,100]` |

### Fix

| File | Change |
|---|---|
| `bin/ecm.mjs` | camera push `[100,100] → [106,106]` (6%, inside the 6–8% band) |
| `lib/scenes.jsx`, `lib/scenes-extra.jsx` | every content `transform.scale` entrance starts at `[70,70]` instead of `[0,0]` — 28 occurrences, all paired with an opacity ramp |

Two sites deliberately keep the zero start: `lib/motion.jsx:188` (a line being drawn on — the scale *is* the draw) and `lib/elements.jsx:151` (a 0.2 s crack spark — the scale *is* the burst). The benchmark's "nothing scales up from zero" rule targets content entrances, not draw-on or burst effects.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 31 | Content entrances no longer start at zero | `grep -rn "scale.*\[0, *0\], \[100, *100\]" lib/*.jsx \| wc -l` | `2` — only the draw-on and the crack spark |
| 32 | Replacements applied | `grep -rn "scale.*\[70,70\], \[100,100\]" lib/*.jsx \| wc -l` | `28` |
| 33 | Camera push in the readable band | `grep -n "transform.scale, l.startTime" bin/ecm.mjs` | `[100,100], [106,106]` |
| 34 | No linear easing on followed motion | `grep -rn "linear" lib/*.jsx` | no matches |
| 35 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 36 | Sheet unchanged by the motion edits | `preview examples/motion-gallery.json` | 16 panels, no regression |
| 37 | 6% push does not reveal the precomp edge | `render-frame` at 2.9 / 5.9 / 8.9 s (max push), 3 px border ring sampled | 0 black border pixels of 1250 in all three; corners `(221,213,200)`, `(139,117,98)`, `(88,85,80)` |

## Round 6 — every scene moved the same way

Benchmark: "Two shots of the same size in a row feel flat… Every beat pans, pushes or cranes with `inout` easing. Nothing is a locked frame."

### Defect

Every scene layer in `Main` got the identical `100% → 106%` push. The move was readable but uniform, so the video still felt like one repeated shot.

### Fix

`bin/ecm.mjs` cycles three camera moves by scene index:

| `j % 3` | Move |
|---|---|
| 0 | push in `100 → 106` |
| 1 | crane out `106 → 100` |
| 2 | push `106 → 110` plus a `+20 / −16 px` drift |

First attempt used `104 → 108` with a `+28 / −18 px` drift and **revealed the precomp's left edge** — a 1–2 px black strip at 200 px wide (≈10–19 px at 1080) from `t = 8.0` onward. Raising the base scale to 106 and cutting the drift to 20 px puts the margin at ≥32 px for the whole move.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 38 | No precomp edge visible anywhere | `render-frame` at every whole second 0–30, 3 px border ring sampled | 0 frames with black border pixels (was 1 frame, 202/626 px, before the fix) |
| 39 | Three distinct moves emitted | `grep -n "cam = j % 3" -A 8 bin/ecm.mjs` | push / crane-out / push+drift branches present |
| 40 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

### Docs updated

- `reference/scenes.md` — "Camera" subsection now lists the three cycled moves and the crop budget at 110%.

## Round 7 — two scenes were structurally broken

### Defect 1 — `dotgrid` drew its header on top of the grid

`text()` anchors `y` at the text **top** (`anchorPoint = [cx, r.top]`). `dotgrid` placed the count at `y = 400` and the label at `y = 480`, while the grid was centred at `y = 560` and spanned `170 … 950`. The header sat inside the dot field.

**Fix** — the grid now owns a band below a reserved header: count at `y = 270`, label at `y = 360`, grid band `430 … SAFE.y1` with the grid centred inside it.

### Defect 2 — `particles` showed no particles for most of the scene

`scatterAt` defaulted to `0.62`, so the particles gathered and faded out inside the first second of a 3.4 s scene. The remaining 2.4 s was a static word.

**Fix** — gather `0.1 → 0.8`, hold at 60% opacity, scatter at `dur − 2.0` (inside the `settle + 1.5 s` hold budget, so the scene is not extended). The word and ring now reveal at `gatherEnd` as the particles arrive, not after they leave.

### Defect 3 — the particles merged into a solid ring

All 120 particles gathered onto an `80 × 40` ellipse around the word. Circumference ≈ 377 px, spacing ≈ 3 px, dot diameter 6–12 px — so they overlapped into one continuous ring (2 connected components in the render).

**Fix** — the gather radius is jittered per particle (`90 + (i × 37) % 120`), turning the ring into a scattered cloud. Same for the `circle` target (`120 + (i × 37) % 90`).

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 41 | `dotgrid` header clear of the grid | `render-frame` at 7.0 s | count `270–342`, label `360–414`, grid `806–1074` — no overlap |
| 42 | Particles render as distinct dots, not a solid ring | connected-component count on a full-res frame at 25.5 s | 1174 blobs ≥8 px (was 2 blobs — 120 dots on an 80×40 ellipse merged into one ring) |
| 43 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 8 — `compare` split layout was top-aligned

The `split` layout started both columns at `y = 300` and stacked down, so a two-point comparison ended around `y = 630` and left `630 … 1450` empty.

**Fix** — the block height is estimated from the point count (`180 + n × 132`) and the start `y` centres it in `SAFE`. The estimate ignores text wrapping, so a wrapped point shifts the block a few pixels low; it is a centring hint, not a layout constraint.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 44 | Compare block centred in `SAFE` | ink-row extent at 40.0 / 41.0 s | rows `163 … 277` of 500 → centre `0.44`; `SAFE` centre `0.44` |
| 45 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 9 — every transition dipped to black

A 0.25 s sweep of the whole timeline, counting pixels with luma < 100, found three frames where the frame went dark:

| Time | Dark pixels | Cause |
|---|---|---|
| 9.0 s | 22.2% | `fold` — `b` faded in from 40% while `a` collapsed to zero height |
| 44.0 s | 99.4% | `dipSeed` — `a` faded out by `t0 + dur/2` while `b` was still at 40–70% scale |
| 55.0 s | 100% | sampling exactly at the duration, past the last frame — not a defect |

At 44.2 s the corners were pure `(0,0,0)`: the Main comp background showing through, because no layer covered the frame.

### Root cause

Every transition faded the outgoing layer `a` to 0 across the whole window while the incoming layer `b` was still partially transparent or smaller than the frame. Two half-transparent layers composite to ~50% coverage, so the black comp background shows through.

### Fix

`lib/transitions.jsx` — `a` now holds at 100% until `end − 0.04 s` and cuts to 0 at `end`, and `b` is opaque from `t0` wherever it is the reveal:

| Transition | Change |
|---|---|
| `maskWipe` | `a` holds opaque; `b` opaque (the radial wipe is the reveal) |
| `dipSeed` | `a` holds opaque; `b` opaque (the growing rectangle is the reveal) |
| `fold` | `b` opaque from `t0` (was 40 → 100) |
| `pageTurn` | `b` opaque from `t0` (was 0 → 100) |
| `zoom` | `a` holds opaque (`b` starts at 92% scale, cannot cover the edges) |
| `glitch` | `a` holds opaque |
| `colorShift` | `a` holds opaque (the two tint solids peak at 55% each) |

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 46 | No dark dip anywhere in the timeline | 0.25 s sweep, 0–55 s, count of pixels with luma < 100 | only `55.0 s` (past the last frame); was `9.0 s` 22.2% and `44.0 s` 99.4% |
| 47 | `maskWipe` corners stay cream | full-res frame at 6.0 s, corner samples | `(224,194,168)` / `(224,216,202)` — was `(99,75,56)` |
| 48 | Video end is not black | frames at 54.0 / 54.5 / 54.8 / 54.9 / 54.95 s | 0.0–0.6% dark, median luma 220–236 |
| 49 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 50 | Transition attribution correct | `examples/motion-gallery.ecproj` Main layer timings | `dip-seed` 43.70–44.70 (start of `S14_quote`), `fold-shadow` 8.77–9.67 (start of `S4_bars`) — matches the table above |

## Round 10 — `zoom` grid ignored its own `n`

The `grid` level built `gCols × min(4, n)` dots in a nested loop, so `n` only capped the column count. The gallery's `{"kind": "grid", "n": 9}` rendered **32 dots** (8 × 4) instead of 9.

### Fix

`lib/scenes-extra.jsx` — the loop now runs exactly `n` times, laying out `ceil(n / cols)` rows and highlighting the last dot.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 51 | Grid renders exactly `n` dots | `S10_zoom` decor layer count in the ecproj | 9 grid dots (1 + 8 duplicates) — was 32 |
| 52 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 53 | Pull-back scales the shapes, not just the labels | accent bbox width at 30.5 s vs 31.3 s | `379 → 371` px — the decor layers now shrink with the labels |

## Round 11 — `timeline` built one runner per event

The traveling light dot was created inside the `events` loop, so a 3-event timeline produced **3 identical runner dots** stacked on the same path. Moved the block after the loop: one runner per timeline.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 54 | One runner regardless of event count | `S8_timeline` decor shape count in the ecproj | 4 (3 event marks + 1 runner) — was 6 |
| 55 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 12 — `orbit` never orbited

`spec.speed` was read into a local and never used. Bodies were placed at fixed angles and stayed there for the whole scene — the scene named `orbit` had no motion at all.

### Fix

`lib/scenes-extra.jsx` — each body now gets 25 position keyframes sampling the ellipse from `ringAt` to the scene end, advancing `360 × speed` degrees. `speed: 0` still yields a static ring.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 56 | Bodies travel around the ring | `S6_orbit` position keyframes in the ecproj | 16 bodies × 25 keys, span 0.5 → 2.5 s |
| 57 | `speed` controls the arc | first vs last key of two bodies | `speed: 1` → full turn (`[338.7, 766.5]` → `[338.7, 1033.5]`); `speed: 0.7` → 0.7 turn (`[229.7, 849.0]` → `[515.0, 1065.0]`) |
| 58 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 13 — `from` was documented but ignored

`reference/scenes.md` documents `from` as the counter's starting value. `counterExpr` hardcoded `0`, so only the `curve: "flicker"` branch honored it; the default and `race` counters always started at zero.

### Fix

`lib/core.jsx` — `counterExpr` takes a `from` argument. `lib/scenes-extra.jsx` passes `from` / `raceFrom`; `lib/scenes.jsx` passes `scene.from`.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 59 | `from` reaches the expression | build `{"type":"counter","value":200,"from":100}` and read the Source Text expression | `ease(time,0.2,1.4,100,200)` — was `ease(time,0.2,1.4,0,200)` |
| 60 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 14 — `dotgrid` computed the reveal order and threw it away

`order: "spiral"` and `order: "wave"` built a `litIdx` sequence, then the render loop ignored it and lit cells by raw index (`i < litCount`). All three orders produced identical output.

### Fix

`lib/scenes-extra.jsx` — `litIdx` is inverted into `litOrder` (cell index → position in the sequence), and both the lit test and the stagger time read from it.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 61 | Orders produce different reveals | build `cols:5, rows:4, count:12` with each order, read per-layer opacity key times | `row` → `0.18×8, 0.76, 0.73, 0.67…`; `spiral` → `0.58, 0.64, 0.67, 0.73, 0.76, 0.55…`; `wave` → `0.18×4, 0.67, 0.18×2, 0.64…` |
| 62 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 15 — dead gather-point variables

`particles` computed `gx` / `gy` from a ternary that returned the same values as `cx` / `cy`, and never read them. Deleted.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 63 | No behaviour change | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 64 | Renders unchanged | `blackdetect` both mp4s | `no black segments` |
| 65 | 4 fps sweep clean | 220 frames from `examples/motion-gallery.mp4` | 0 flat, 0 mostly dark |
| 66 | Border ring clean | 55 frames, every whole second 0–54 s | 0 frames with black border pixels |

## Round 16 — `ring()` ignored `name` and `comment`

`rect()` and `ellipse()` both honor `o.name` and set `l.comment = o.comment || ''`. `ring()` did neither: every ring layer was named `'ring'` with an empty comment, so the `name: 'shape', comment: 'decor'` every caller passes was silently dropped.

### Fix

`lib/core.jsx` — `shapeLayer(comp, o.name || 'ring')` and `l.comment = o.comment || ''`.

### Behaviour change

`checkSafe` skips `'bg'`, `'decor'`, and `'text'`. Rings were previously checked (empty comment); they are now exempt as decor, matching `rect`/`ellipse`. No ring in either example exceeds the safe area, so no check regresses today. `exitAll` and the `zoom` pull-back both test `comment !== 'bg'`, so their treatment of rings is unchanged.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 67 | Rings carry the caller's name and comment | `S6_orbit` layer name/comment histogram | 18 × `('shape', 'decor')` (2 tracks + 16 bodies) — was 2 × `('ring', '')` |
| 68 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 17 — dead `readdirSync` import

`bin/ecm.mjs` imported `readdirSync` from `node:fs` and never called it. Removed.

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 69 | Import removed, CLI still runs | `node bin/ecm.mjs preview examples/motion-gallery.json` | builds and writes the ecproj |

## Round 18 — audit findings from four parallel scouts

Four read-only scouts audited `lib/core.jsx`, `lib/fx.jsx`, `lib/scenes.jsx` + `lib/slides.jsx`, and `bin/ecm.mjs` for the same defect class. `lib/fx.jsx` was clean. The rest produced six fixes.

### Fixes

| File | Defect | Fix |
|---|---|---|
| `lib/scenes.jsx` | `stat` honored `scene.from` only in the `ring` layout; `left`, `split`, and default called `counterExpr` without it | pass `scene.from` in all four |
| `lib/scenes-extra.jsx` | `cards` documented `order: row \| random` but never read it | deterministic LCG shuffle → `rank[i]` drives the stagger |
| `lib/scenes.jsx` | `donut` `multi` passed `scene.second \|\| 60` as a color; `rgb(60)` yields `[0.376, NaN, NaN]` | default to `theme.colors.data` |
| `lib/scenes.jsx` | `compare` `split` created its columns with no animation — they appeared at t=0 | title and each point slide in from the column's outer edge |
| `lib/motion.jsx` | `fromWords` computed and never read | deleted |
| `lib/scenes.jsx` | `outer`, `inner`, `line` assigned from `ring()`/`rect()` and never read | dropped the assignments, kept the calls |

### Evidence

| # | Criterion | Command | Result |
|---|---|---|---|
| 70 | `stat` honors `from` in every layout | build `{"type":"stat","value":200,"from":100}` | `ease(time,0.2,1.4,100,200)` |
| 71 | `cards` `order: random` shuffles | compare per-layer opacity key times, `row` vs `random` | `row` → `[279.4, 203.2, 127.0, 50.8]`; `random` → `[50.8, 279.4, 127.0, 203.2]` |
| 72 | `donut` `multi` colors are finite | read every `color` prop in `S3_donut` | `(0.067, 0.067, 0.067)` and `(0.902, 0.2, 0.137)` — no `NaN` |
| 73 | `compare` `split` animates | count opacity-keyed props in `S4_compare` | 12 (was 0) |
| 74 | `fromWords` was never referenced | `grep -n "fromWords\|toWords" lib/motion.jsx` | only `toWords` at 135, 140, 141 |
| 75 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

## Round 19 - dead params in `lib/slides.jsx`

| # | Criterion | Command | Result |
|---|---|---|---|
| 76 | `slideMeasure` no longer takes `align` | `grep -n "slideMeasure(" lib/slides.jsx` | `function slideMeasure(str, font, size, maxW, maxH)` |
| 77 | `slideText` no longer takes `tpl`, `theme` | `grep -n "slideText(" lib/slides.jsx` | `function slideText(comp, o, W, H)` |
| 78 | `slideAccentBand`/`slideHandle` no longer take `dur` | `grep -n "slideAccentBand(\|slideHandle(" lib/slides.jsx` | 5-arg signatures, 5-arg call sites |
| 79 | Slides path still renders | `node bin/ecm.mjs slides /tmp/deck.json --out /tmp/deck-out` | `01.png` 89,844 B, `02.png` 109,158 B |
| 80 | Rendered slides are not blank | PIL unique-color count | 199 and 172 colors, 1080x1350 |
| 81 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

`addGlow`/`slab` `dur` left in place: 12 call sites, zero behavior change, not worth the diff.

## Round 20 - composition: hook `split` and `cards` were top-heavy

Visual review of the rendered gallery found two scenes with the content block pinned above the safe-area centre, leaving the bottom half of the 1080x1920 frame empty.

| # | Criterion | Command | Result |
|---|---|---|---|
| 82 | `hook` `split` type no longer shrunk by a narrow column | `grep -n "maxW:600" lib/scenes.jsx` | `maxW:600, maxH:900` (was `520`/`500`) |
| 83 | `hook` `split` block centred on the safe centre | PIL ink bbox on `t=1.5` | y 547-1123, centre **835** (was 695), height 576 (was 463) |
| 84 | `hook` accent bar tracks the text block | `grep -n "hook-bar" lib/scenes.jsx` | `y:stop + res.h/2`, `h:Math.max(360, res.h*1.2)` |
| 85 | `cards` grid centred instead of `startY = 580` | PIL orange bbox on `t=20.0` | y 687-1010, centre **849** (safe centre 850; was 740) |
| 86 | `cards` multi-row still fits the safe area | `gridH = rows*cardH + (rows-1)*40` | `startY` clamped to `SAFE.y0` |
| 87 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 88 | Full gallery re-renders | `node bin/ecm.mjs render examples/motion-gallery.json` | 1650 frames, 55.000000 s, 102,839,703 B |
| 89 | No flat or mostly-dark frames | 4 fps sweep, 220 frames | `flat []`, `mostly-dark []` |
| 90 | No black border pixels | `render-frame` every whole second 0-54 s | 55 frames, `[]` |
| 91 | No black segments | `ffmpeg blackdetect d=0.1:pix_th=0.10` | 0 matches |

## Round 21 - duplicate layer names across comps

`comp.info` on `S5_dial` showed two layers both named `value`. A full scan of `examples/motion-gallery.ecproj` found 13 comps with duplicate layer names. Repeated elements (`shape` x 114 dots, `shape` x 120 particles) are intentional; the defects are semantically different layers sharing a name, which makes `effectcraft-cli get <comp> <name>` ambiguous.

| # | Criterion | Command | Result |
|---|---|---|---|
| 92 | Pre-fix duplicate scan | `python3` over `items[*].kind.layers` | 13 comps: `S2_counter`, `S3_dotgrid`, `S4_bars`, `S5_dial`, `S6_orbit`, `S7_cards`, `S8_timeline`, `S9_particles`, `S10_zoom`, `S11_stat`, `S12_steps`, `S13_compare`, `Main` |
| 93 | `dial` label no longer named `value` | `grep -n "name:'label'" lib/scenes-extra.jsx` | `S5_dial` label layer renamed |
| 94 | `counter`/`stat`/`dotgrid`/`timeline` labels renamed | same | 4 `name:'value'` -> `name:'label'` |
| 95 | `stat` ring track and arc distinguished | `grep -n "ring-track\|ring-arc" lib/scenes.jsx` | `ring-track`, `ring-arc` |
| 96 | `dial` mark labels no longer `line1` | `grep -n "mark-label" lib/scenes-extra.jsx` | `mark-label` |
| 97 | `timeline` event labels no longer collide with track/fill | `grep -n "event-label" lib/scenes-extra.jsx` | `event-label{i+1}` |
| 98 | `cards` rect/sub/text/check distinguished | `grep -n "card-rect\|card-sub\|card-text\|card-check" lib/scenes-extra.jsx` | 4 distinct prefixes |
| 99 | `compare` `split` layers named | `grep -n "align+'-title'\|align+'-sym-'\|align+'-point-'" lib/scenes.jsx` | title, sym, point per column |
| 100 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 101 | Post-fix duplicate scan | same `python3` scan on the re-rendered ecproj | 9 comps, all repeated elements: `shape` x N (dots/particles/marks), `bar`/`bar-value`/`bar-label` x 3, `step-item`/`step-dot` x 3, `Main` transition solids x 2 |
| 102 | Semantic collisions gone | scan output | `S2_counter`, `S7_cards`, `S11_stat`, `S13_compare` no longer listed |
| 103 | Full gallery re-renders | `node bin/ecm.mjs render examples/motion-gallery.json` | 1650 frames, 55.000000 s, 102,839,703 B |
| 104 | No flat or mostly-dark frames | 4 fps sweep, 220 frames | `flat []`, `mostly-dark []` |
| 105 | No black segments | `ffmpeg blackdetect d=0.1:pix_th=0.10` | 0 matches |

Remaining duplicates are intentional: one layer per repeated element, addressed by index.

## Round 22 - donut ring pair, and the other two examples

Rendering `all-scenes.json` and `hemat.json` after the round-21 renames surfaced one more unnamed pair, plus two "mostly dark" frame bands that turned out to be spec choices.

| # | Criterion | Command | Result |
|---|---|---|---|
| 106 | `S7_donut` had two layers both named `ring` | ecproj scan | `S7_donut {'ring': 2}` |
| 107 | Donut rings named | `grep -n "donut-track\|donut-progress\|donut-outer\|donut-inner" lib/scenes.jsx` | 5 call sites named |
| 108 | Post-fix scan, all three examples | `python3` over `examples/*.ecproj` | `all-scenes` 2 comps, `hemat` 2 comps, `motion-gallery` 9 comps - all repeated-element families (`bar*`, `step*`, `shape`, `Main` transition solids) |
| 109 | `S7_donut` no longer listed | same scan | gone |
| 110 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 111 | `all-scenes` renders | `node bin/ecm.mjs render examples/all-scenes.json` | 1221 frames, 40.700000 s, 76,249,520 B |
| 112 | `hemat` renders | `node bin/ecm.mjs render examples/hemat.json` | 551 frames, 18.366667 s, 34,448,383 B |
| 113 | `motion-gallery` renders | `node bin/ecm.mjs render examples/motion-gallery.json` | 1650 frames, 55.000000 s, 102,839,703 B |
| 114 | No black segments, all three | `ffmpeg blackdetect d=0.1:pix_th=0.10` | 0 matches each |
| 115 | 4 fps sweep, 456 frames | PIL flat/dark scan | `flat []`; `mostly-dark` only `all-scenes` bands |
| 116 | `all-scenes` t=6.5-8.5 dark band is `S3_quote` | `bg: "ink"` in spec, `theme.colors.ink = #111111` | intentional |
| 117 | `all-scenes` t=36.5+ red band is `S10_outro` | `bg: "accent"`, `in 36.50` in `Main` | intentional |
| 118 | `S9_compare` comp itself is light | `render-frame --comp S9_compare` t=1..6 | mean `[212,175,167]`, dark 4.6% |

The sweep's "mostly dark" heuristic assumes a light theme; `all-scenes` deliberately uses `bg: "ink"` and `bg: "accent"` on two scenes, so those bands are correct.

## Round 23 - motion blur was never enabled

Every comp had a 180° shutter and 16 samples, but all 499 layers had `motion_blur: False` and no comp had `enable_motion_blur` set. Fast moves — transitions, scale pops, the per-scene camera drift — rendered with no smear, which is the single biggest reason the output read as "cheap" next to a real motion-graphics reel.

| # | Criterion | Command | Result |
|---|---|---|---|
| 119 | Pre-fix: no layer had motion blur | ecproj scan | `Counter({False: 499})` |
| 120 | Pre-fix: no comp had the switch | ecproj scan | `enable_motion_blur` absent on all 17 comps |
| 121 | Generated script emits the comp switch | `buildScript` + grep `motionBlur` | `c.motionBlur = true;`, `main.motionBlur = true;` |
| 122 | Generated script emits the layer switches | same | `c.layer(mb).motionBlur = true;`, `main.layer(mb2).motionBlur = true;` |
| 123 | Post-fix: every comp has the switch | ecproj scan | `comp enable_motion_blur: {True: 17}` |
| 124 | Post-fix: every layer has the switch | ecproj scan | `{True: 485, False: 14}` before the loop move; the 14 were `Main` transition solids created after it |
| 125 | Main loop moved after the transition loop | `grep -n "mb2" bin/ecm.mjs` | loop now sits just before `writeLn` |
| 126 | Unit tests cover the four lines | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 127 | 16 samples cost | `time node bin/ecm.mjs render examples/motion-gallery.json` | `real 4m52.626s` vs `1m34.066s` without blur |
| 128 | 8 samples chosen | `c.motionBlurSamples = 8` | speed/quality tradeoff, documented in `reference/cli.md` |

## Round 24 - example specs failed their own lint

`node bin/ecm.mjs check` on the three examples reported the exact defects the user described: missing emphasis words, flat rhythm (three consecutive scenes on `bg base`), and two `stat` scenes with the same layout.

| # | Criterion | Command | Result |
|---|---|---|---|
| 129 | Pre-fix warnings, `motion-gallery` | `check examples/motion-gallery.json` | C05 x2 (quote, outro), C06 flat rhythm |
| 130 | Pre-fix warnings, `all-scenes` | `check examples/all-scenes.json` | C05 (outro), C06 flat rhythm, C11 duplicate stat layout |
| 131 | Pre-fix warnings, `hemat` | `check examples/hemat.json` | C05 (outro), C06 flat rhythm |
| 132 | Emphasis added | spec patch | `motion-gallery` 13 `berpindah`, 15 `hari`; `all-scenes` 2 `terukur`, 9 `hari`; `hemat` 4 `video` |
| 133 | Rhythm broken by alternating `bg` | spec patch | `motion-gallery` 1/3/5/7/9/11/13/15 = ink/accent alternating; `all-scenes` 4 ink, 6 accent; `hemat` 1 ink, 3 accent |
| 134 | Duplicate stat layout fixed | spec patch | `all-scenes` scene 4 `layout: "left"` |
| 135 | Post-fix, `hemat` | `check examples/hemat.json` | exit 0, no warnings |
| 136 | Post-fix, `all-scenes` | `check examples/all-scenes.json` | only `C02 spec: 10 scenes` |
| 137 | Post-fix, `motion-gallery` | `check examples/motion-gallery.json` | only `C02 spec: 16 scenes` |
| 138 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |

`C02` is inherent to a gallery/demo spec that shows every scene type; a real reel is 8 scenes or fewer.

### Final render evidence (post-patch specs, motion blur on)

| # | Criterion | Command | Result |
|---|---|---|---|
| 139 | `motion-gallery` | `ffprobe` | 1650 frames, 55.000000 s, 102,904,219 B |
| 140 | `all-scenes` | `ffprobe` | 1221 frames, 40.700000 s, 76,253,588 B |
| 141 | `hemat` | `ffprobe` | 551 frames, 18.366667 s, 34,462,652 B |
| 142 | No black segments, all three | `ffmpeg blackdetect d=0.1:pix_th=0.10` | 0 matches each |
| 143 | Every comp has the blur switch | ecproj scan | `motion-gallery {True: 17}`, `all-scenes {True: 11}`, `hemat {True: 6}` |
| 144 | Every layer has the blur switch | ecproj scan | `{True: 500}`, `{True: 104}`, `{True: 45}` - no exceptions after the loop move |
| 145 | 4 fps sweep, 456 frames | PIL flat scan | `flat []` |
| 146 | Dark frames are the new `bg` alternation | PIL luma scan | 147 frames, all from scenes with `bg: "ink"` or `"accent"` |
| 147 | Text stays readable on `bg: "ink"` | PIL contrast on `t=3.5`, `t=4.5` | 8.87:1 and 8.57:1 (AA needs 4.5:1) |
| 148 | Render cost, 8 samples | `time` | `motion-gallery 3m19.221s`, `all-scenes 1m22.176s`, `hemat 0m34.946s` |
| 149 | Unit tests green | `node --test test/ecm.test.mjs` | `tests 46`, `pass 46`, `fail 0` |
| 150 | Render engine is effectcraft-cli | `command -v effectcraft-cli` | `/Users/kasjfulkurniawan/.local/bin/effectcraft-cli` |
| 151 | Engine version | `effectcraft-cli --version` | `effectcraft-cli 0.23.0` |
| 152 | Both engine calls fire per render | `node bin/ecm.mjs render examples/hemat.json` | `engine  effectcraft-cli script ... --empty --save-as examples/hemat.ecproj` then `engine  effectcraft-cli render --project examples/hemat.ecproj --comp Main --out .../hemat.mp4 --format h264` |

---

# Verification 2 — scene library (2026-11-11 10:58)

| Acceptance criterion | Command | Observed |
|---|---|---|
| Every scene layout builds | `node scripts/smoke-layouts.mjs` | `50/50 cases build` |
| `kinetic/world` stays in frame | `node bin/ecm.mjs preview /tmp/world.json` | exit 0, sheet written (was `line3 outside safe area [-54,641 234,741]`) |
| `dotgrid` spiral lights exactly `count` dots | standalone walk of the shipped algorithm | 3×3 → 9 unique; 21×18 → 378 unique; 5×4 → 20 unique |
| `kinetic/morph` renders target words in the theme face | `render-frame --time 2.2` | "Sesudah" in the edukasi display face at the source line's x |
| Elements stay visible for the scene | `render-frame --time 2.2` for fire/rays/water/particles | embers, blooms, wave dots and accent particles all present |
| Vignette/grain sit above content | `render-frame --time 1.5` on `S2_stat` | corners darkened, "72%" crisp |
| Unit suite green | `node --test test/ecm.test.mjs` | 46/46 pass |
| Strict lint clean | `node bin/ecm.mjs check examples/hemat.json --strict` | exit 0 |
| Full render works | `node bin/ecm.mjs render examples/all-scenes.json` | exit 0, 39.83 s MP4 |

---

# Verification 3 — visual legibility (2026-11-11 11:20)

| Criterion | Command | Observed |
|---|---|---|
| Orbit bodies visible on accent bg | `render-frame --comp S6_orbit` | 6 inner + 10 outer dots in ink around "Kamu" |
| Zoom grid is a grid, not a row | `render-frame --comp S10_zoom --time 1.3` | 3×3 dots around the centre dot |
| Zoom rings fill the frame | `render-frame --comp S10_zoom` (settled) | three concentric rings, 90/170/250 radius |
| Dial value not struck by the needle | `render-frame --comp S5_dial --time 2.0` | "18" above the centre dot, needle clear |
| No regression | `node --test test/ecm.test.mjs` | 46/46 pass |
| No regression | `node scripts/smoke-layouts.mjs` | 50/50 cases build |
| Examples still valid | `check` on hemat / all-scenes / motion-gallery | exit 0 each |

## Verification 3b — compare split alignment (2026-11-11 11:30)

| Criterion | Command | Observed |
|---|---|---|
| Checkmark shares a line with its point | `render-frame --comp S13_compare --time 2.5` | ✓ Impulsif / ✓ Tanpa catatan (wrapped) / ✓ Terencana / ✓ Terukur |
| No check over text | same frame | both columns left-aligned, check outside the text box |
| No regression | `node --test test/ecm.test.mjs` | 46/46 pass |
| No regression | `node scripts/smoke-layouts.mjs` | 50/50 cases build |
| Examples valid | `check` on hemat / all-scenes / motion-gallery | exit 0 each |

## Verification 3c — counter motion blur (2026-11-11 11:05)

Symptom: every counting number rendered doubled ("RP 4̶6̶2̶.000" over "430.000"), unreadable for
the whole count window. Reproduced in a direct `render-frame` at 10.6 s, so not an h264 artifact.

Cause: `bin/ecm.mjs` turns motion blur on for every scene layer with 8 samples. A `Source Text`
driven by a counter expression changes ~17 000 units per shutter interval, so the eight samples
stack several values in one layer.

Fix: the post-build blur loop reads each layer's `Source Text` expression and skips blur on those.
One place, so it covers `stat` (4 layouts), `bars`, `donut` and the two `scenes-extra` counters.

| Criterion | Command | Observed |
|---|---|---|
| Counter reads as one value | `render-frame --comp Main --time 10.6` | `RP 470.197`, single crisp number |
| Blur still on elsewhere | generated script | `ml.motionBlur = !expr` — only expression layers skipped |
| Tests | `node --test test/ecm.test.mjs` | 46/46 pass |
| Layouts | `node scripts/smoke-layouts.mjs` | 50/50 build |
| Examples | `check` on hemat / all-scenes / motion-gallery | exit 0 each |

Test updated: the motion-blur assertion pinned the literal `c.layer(mb).motionBlur = true`, which the
fix replaced; it now asserts the counter exception instead of the old source text.

## Verification 4 — encoded video, both examples (2026-11-11 11:20)

Stills prove layout; only the MP4 proves motion, transitions and the counter fix end to end.

| Criterion | Command | Observed |
|---|---|---|
| No black frame at a cut | `check-cuts.mjs all-scenes.mp4` over 9 boundaries | min mean luminance 0.064 (ink bg), no near-black |
| No black frame at a cut | `check-cuts.mjs motion-gallery.mp4` over 15 boundaries | no near-black |
| Counter legible in video | frame @ 10.6 s / 11.4 s | `RP 470.197` / `RP 1.250.000`, one value each |
| Counter legible in video | frame @ 3.6 s (gallery) | `72%`, one value |
| Scenes animate | frame diff 3.0 s vs 4.0 s | 2.7 % pixels differ |
| Gallery sheet | `preview examples/motion-gallery.json` | 16 panels, all legible, compare checks aligned |

`examples/*.mp4` and `*.sheet.png` are gitignored build artifacts; both were rebuilt against the
current code because `motion-gallery.mp4` predated every fix in this pass.

## Verification 5 — all 70 themes (2026-11-11 11:25)

The smoke script exercises every layout under one theme, so a theme with a malformed colour or a
font that is not installed would only surface when someone used it. Checked the data directly:

```sh
node -e 'const T=require("./themes.json"),F=require("./assets/fonts/fonts.json"); ...'
# themes=70 fonts=87 problems=0
```

Every `colors.*` value is a six-digit hex (the `#fff` NaN path is unreachable from shipped themes)
and every `fonts.*` value is a key of `assets/fonts/fonts.json`.

## Verification 6 — hemat re-render (2026-11-11 11:28)

`examples/hemat.mp4` predated the counter fix, so its stat scene still carried the ghost.

| Criterion | Command | Observed |
|---|---|---|
| No black frame at a cut | `check-cuts.mjs hemat.mp4` over 4 boundaries | no near-black |
| Counter legible | frame @ 3.4 s | `30%`, one value |
| Spec valid | `check examples/hemat.json` | exit 0, 5 scenes, 18.37 s |

All three example MP4s are now built from the current code.

## Verification 7 — camera and parallax (2026-11-11 11:52)

Comparison against `../reel-skill-chat/references/look.md` named the reason the output reads
flat: *"A camera on every scene… Nothing is a locked frame"* and *"Parallax: near layers move
faster than far ones"*, plus *"Push key poses 10 to 30% further than feels right."* This
project's camera only scaled, and all three moves were essentially the same shot.

Changes in `bin/ecm.mjs`:

| Change | Detail |
|---|---|
| `CAMS` table | four moves, each with scale **and** pan: push right, pull left, crane up, pull right; scale range 104–112 % instead of 100–106 % |
| Camera on a null | `main.layers.addNull()` + `l.parent = cam`. Transitions animate the scene layer's own scale and position (fold, pageTurn, zoom, glitch, slide), so a camera written onto that layer overwrote their keys — the conflict predates this change |
| Parallax | atmosphere `glow*` layers counter-move by `0.8 × pan` over the scene, so the far plane travels ~20 % of the content's distance |

Two defects found and fixed while building it:

| Defect | Symptom | Fix |
|---|---|---|
| `CAMS` declared after the loop that uses it | `scene 1 (hook): TypeError: cannot convert 'null' or 'undefined' to object` | hoisted above `var pre = []` |
| `layers.addNull()` returns a **function**, not the layer | `cam.name = …` threw | `main.layers.addNull(); var cam = main.layer(1);` |
| Parallax applied to every `decor` layer | the hook `slab` is `decor` **and** has its own slide-in, so the drift overwrote it and pinned the band at x = −1080 — dark area collapsed from 377 k to 43 k pixels | narrowed to `adjustmentLayer === false && name.startsWith('glow')` |

| Criterion | Command | Observed |
|---|---|---|
| Camera moves | frames at 0.9 s / 2.0 s, dark-pixel bbox | 377 436 → 396 358 px, full width both — content grows and drifts left as the camera pushes right |
| Slab intact | same frames | band full width at both times |
| Glow parallax present | `props S1_hook glow0 --flat` | `transform/position … [2 keys]` |
| Scene decor untouched | `props S1_hook slab --flat` | `transform/position [-1080, 1150] [2 keys]` — only its own slide-in |
| Parented scale renders | isolated null test | 300 px box → 336 px at 112 %, centred |
| Tests | `node --test test/ecm.test.mjs` | 46/46 |
| Layouts | `node scripts/smoke-layouts.mjs` | 50/50 |
| Examples | `check` × 3 | exit 0 each |

## Verification 8 — every transition under the camera null (2026-11-11 12:05)

Moving the camera onto a parent null changes what the transitions now own: previously fold,
pageTurn, zoom, colorShift and maskWipe fought the camera for the scene layer's scale, and
slide and glitch fought it for position. With the camera on the parent those properties are
the transitions' alone, so each had to be re-checked for compositing rather than just for
"the build did not throw".

`examples/motion-gallery.json` uses every transition, so it is the fixture: one frame at each
mid-transition point (`cut@2.67 zoom@5.44 maskWipe@7.94 fold@11.32 pageTurn@13.77
glitch@16.47 dipSeed@19.49 colorShift@22.87 zoom@25.37 maskWipe@29.54 fold@31.99
pageTurn@35.37 glitch@40.37 dipSeed@43.75 colorShift@46.77`).

| Criterion | Observed |
|---|---|
| All 11 transition types composite | 15/15 frames show scene content, no blank or black frame |
| Smoke already builds each transition | `node scripts/smoke-layouts.mjs` → 50/50 |
| Encoded video unaffected | boundary scan on the new `all-scenes.mp4` → no near-black at 9 cuts |

## Verification 9 - whip pan transition (2026-11-11 12:40)

`trWhip` in `lib/transitions.jsx`: both precomps slide one full frame width in the same
direction while a `Directional Blur` (direction 90, length 45) keys up and back to zero, so
both the leaving and the arriving frame land sharp.

| Check | Command | Result |
|---|---|---|
| Registration | `grep -c whip` across bin/ecm.mjs, lib/transitions.jsx, reference/{scenes,themes}.md, SKILL.md, scripts/smoke-layouts.mjs | 10 sites |
| Unit tests | `node --test test/ecm.test.mjs` | 46/46 |
| Layout smoke | `node scripts/smoke-layouts.mjs` | 51/51 (whip case added) |
| Spec check | `node bin/ecm.mjs check` x3 examples | exit 0 each |

### Geometry bug found and fixed before shipping
First cut used `travel = 1300` (the reference's number, for a different comp size). The two
precomps are 1080 wide, so with both layers carrying the same delta the gap between a's right
edge and b's left edge was `1300 - 1080 = 220 px` at **every** instant of the move - a strip of
comp background visible for the whole transition. Travel must equal the comp width:

a_x(p) = 540 - 1080p, right edge = 1080 - 1080p
b_x(p) = 1620 - 1080p, left edge  = 1080 - 1080p   -> always equal, no gap.

### Measured on the rendered frames
Column means (0-255, ten 108 px columns) at the transition mid-point:

| time | columns |
|---|---|
| 5.80 (start) | 32 36 46 44 47 44 44 37 34 28 - outgoing scene, heavily blurred, full frame |
| 6.08 (mid) | 33 29 172 211 212 214 214 214 216 218 - outgoing occupies the left 216 px, incoming covers to the right edge, no background column anywhere |
| 6.30 (landed) | 211 211 213 214 213 215 217 218 221 219 - incoming scene settled |

The outgoing `72%` is visibly directionally smeared at 5.80 and sharp again at the start.

## Verification 10 - entrance overshoot on every text reveal (2026-11-11 13:10)

`pop` easing was unreachable in practice: zero of the 83 `animate()` calls in
`lib/scenes.jsx` pass it, so the 12 % scale overshoot never fired and every entrance moved
linearly into place. Instead of routing 83 call sites, the lever is `revealText` - every text
layer in every scene goes through it.

| Before | After |
|---|---|
| static animator offset `[0, 60, 0]` | keys `[0,76,0]` -> `[0,-9,0]` -> `[0,0,0]` |

Verified on `examples/hemat.ecproj`, layer `S1_hook / text`:

```
effectcraft-cli get S1_hook text text/animators/animator/properties/position --json
[(0.13, [0.0, 76.0, 0.0]), (0.57, [0.0, -9.0, 0.0]), (0.73, [0.0, 0.0, 0.0])]
```

Words start 76 px low, pass 9 px above the baseline, settle on it. Final key is exactly
`[0,0,0]`, so no text can land offset.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |
| Visual | hemat hook at 0.05/0.25/0.45/0.65/0.95 - glyphs appear left to right and rise; landed frame identical to baseline |

## Verification 11 - emphasis marker overshoot (2026-11-11 13:35)

The highlighter and underline markers scaled 0 -> 100 and stopped dead. Both now use the `pop`
easing, which activates the existing overshoot branch in `animate()` (scale only, growing
dims only): the marker runs 12 % past the word and settles back.

`effectcraft-cli get S1_hook underline transform/scale --json` on a kinetik build:

```
[(0.73, [0.0, 100.0, 0.0]), (1.0, [112.0, 100.0, 0.0]), (1.1, [100.0, 100.0, 0.0])]
```

Rendered at 0.85 / 1.00 / 1.10: the rule grows under `tetap?`, passes the `?` at 1.00, and is
flush at 1.10. Only the horizontal axis overshoots - the vertical stays at 100, so the rule
never thickens.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 12 - whip blur tracks speed (2026-11-11 13:55)

The first cut keyed the blur 45 -> 0 across the whole window, so the frame was at maximum
blur at `t0` while both layers were still stationary, and sharpened as they accelerated.
Blur now ramps 0 -> 45 -> 0 with the peak at 40 % of the window, where the eased velocity is
highest.

`effectcraft-cli get Main S2_counter effects/#1/length --json`:

```
[(5.8, 0.0), (6.03, 45.0), (6.37, 0.0)]
```

Rendered at 5.85 / 6.03 / 6.20: sharp at the start, the outgoing `72%` fully smeared at the
peak with the incoming scene's leading edge soft, sharp again on landing.

## Verification 13 - layout rotation within a reel (2026-11-11 14:20)

All 70 themes ship a `layouts` pin for every scene type, and they cluster hard:
`compare -> stack` in 61 of 70, `stat -> left` in 43, `quote -> card` in 41. So a reel with
three stat scenes drew the same composition three times - the monotony reported as "layout yang
itu itu aja" comes from repetition inside one reel, not from the theme choice.

`sceneLayout` now rotates: the first scene of a type uses the theme's pin, each later scene of
that type advances one step through `LAYOUTS[type]`. A scene's own `layout` still wins.
`SCENE_NTH` is set per type in the build loop; `LAYOUTS` is emitted as a build-script global
(it was only in the Node scope, which threw `ReferenceError: LAYOUTS is not defined`).

Three `stat` scenes, theme `kinetik`, `value` 40 / 60 / 80:

| scene | layout rendered |
|---|---|
| 1 | `ring` - 40% inside a progress ring |
| 2 | `left` - 60%, left-aligned |
| 3 | `center` - 80%, centred |

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 14 - lint judges the layout that renders (2026-11-11 14:45)

C11 and C15 compared `scene.layout || "default"`, i.e. what the spec declared, so they kept
warning about repetition the renderer now resolves on its own. Both now use
`resolvedLayouts(spec, theme)`, which mirrors `sceneLayout()`: explicit scene layout, else the
theme pin, else rotation by per-type occurrence.

| spec | before | after |
|---|---|---|
| 3 donut + 2 compare + 2 bars, no explicit layouts | C11 + C15 fired | neither fires; renders ring/gauge/multi, stack/split, vertical/horizontal |
| 2 stat scenes both `layout:"left"` | C11 fired | C11 still fires - an explicit repeat is a real repeat |

## Verification 15 - full render through effectcraft-cli (2026-11-11 14:50)

`node bin/ecm.mjs render examples/motion-gallery.json`

```
engine  effectcraft-cli render --project examples/motion-gallery.ecproj --comp Main --out .../motion-gallery.mp4 --format h264
total  55.00
```

`ffprobe`: h264, 1080x1920, 55.000000 s, 103,025,134 bytes.
`ffmpeg -vf blackdetect=d=0.1:pix_th=0.10`: no black frames.

Whip sampled from the encoded file at 25.05 / 25.23 / 25.45 (blur keys 25.0 -> 25.23 -> 25.57):
sharp timeline, fully smeared at the peak with the incoming scene's leading edge soft, sharp
particles scene on landing. No background strip at any of the three.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 16 - deck templates render without installing system fonts (2026-11-11 15:10)

All three shipped deck templates named system PostScript fonts, so `slides` refused every deck
until the user ran `fonts --install`:

```
plain:   fonts not installed: display=HelveticaNeue-CondensedBlack (not bundled), body=HelveticaNeue-Medium (not bundled) ...
```

Each is now mapped to a bundled face that keeps the template's character:

| template | was | now |
|---|---|---|
| `plain` | HelveticaNeue-CondensedBlack / HelveticaNeue-Medium | Anton-Regular / SpaceGrotesk-Medium |
| `themed` | Didot-Bold / Baskerville | PlayfairDisplay-Bold / InstrumentSerif-Regular |
| `graphic` | Inter-Medium | Inter-Regular |

`node bin/ecm.mjs slides` on a 3-slide deck:

```
slides OK: plain
slides OK: themed
slides OK: graphic
```

Contact sheet inspected for all three: 9/9 slides render, emphasis colour applies, page numbers
and handle render, no fallback glyphs or missing-font warnings.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 2 examples | exit 0 each |
| `slides` x 3 templates | exit 0 each |

## Verification 17 - squash and stretch on the pop easing (2026-11-11 15:30)

The `pop` overshoot scaled every growing axis by the same 12 %, which is a zoom, not a squash.
It now stretches along the motion: the moving axis overshoots 12 % and, when it is the only
axis moving, the perpendicular one dips 6 %. Both axes growing still means a plain zoom, so
nothing that scales uniformly is distorted.

`effectcraft-cli get S1_hook underline transform/scale --json`:

```
[(0.73, [0.0, 100.0, 0.0]), (1.0, [112.0, 94.0, 0.0]), (1.1, [100.0, 100.0, 0.0])]
```

Rendered at 0.95 / 1.00 / 1.10: the rule grows under `tetap?`, passes the `?` at 1.00 while
visibly thinner, and lands flush at full thickness.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 18 - whip in both directions (2026-11-11 15:45)

`trWhip` picks its direction from `theme.align`, and only the rightward case had been rendered.
17 of 70 themes are left-aligned (`reel`, `pitch`, `kinetik`, `blueprint`, `chalkboard-lesson`, ...).

Theme `kinetik` (`align: left`), same spec:

```
S2_counter  [(5.8, [540, 960]), (6.37, [1620, 960])]   outgoing exits right
S3_dotgrid  [(5.8, [-540, 960]), (6.37, [540, 960])]   incoming enters from the left
```

Rendered at 5.85 / 6.05 / 6.30: sharp counter, mid-move with the dark incoming scene on the
left and the blurred outgoing counter on the right, dotgrid settled. The seam is contiguous -
no background column in either direction.

## Verification 19 - doc drift on the fonts command (2026-11-11 16:00)

`fonts` is a real command with `--list`, `--check` and `--install`, and two error messages tell
the user to run it, but it was absent from the usage line, from `reference/cli.md` and from the
README quick start. Added to all three, including the rule that themes and templates must name a
bundled PostScript name rather than a family or system font.

```
node bin/ecm.mjs fonts --check
all 70 themes use installed fonts
```

`check --strict` on all three examples: exit 0 each, only C02 (scene count) on the two showcase
specs, which is expected for a gallery.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check --strict` x 3 examples | exit 0 each |
| `fonts --check` | all 70 themes installed |

## Verification 20 - camera shake on hard cuts (2026-11-11 16:40)

The reference lists `shake(t0, dur, amp, seed)` among the camera moves; this build had none.
A second null (`camRoot`) now sits above `cam`, so the shake composes with the pan and scale
instead of overwriting them: camRoot -> cam -> scene layer, one property per level.

Layer stack, `examples/hemat.ecproj` (top to bottom) - each scene owns its own pair:

```
layer#1 S5_outro   layer#2 cam5   layer#3 camRoot5   layer#4 S4_steps   ...
```

Keys on `camRoot2` (scene 2 cuts at 2.67):

```
[(2.67, [540.0, 960.0]), (2.77, [554.0, 968.4]), (2.83, [531.6, 955.1]), (2.9, [544.2, 962.5]), (3.0, [540.0, 960.0])]
```

16 px on x, 9.6 px on y, decaying to rest in 0.33 s. Only `cut` and `dip` entrances get it;
`whip`, `fold`, `zoom` and the rest already carry their own motion, and the wipe family should
not shudder.

### Tuning found by looking, not by assumption
The first cut peaked at the cut frame itself. `S2_stat` renders its background only for the
first ~0.2 s (its counter and caption land at 0.3 s), so the shake moved an empty frame and was
never seen. The peak moved to +0.10 s and the decay stretched to 0.33 s so it overlaps the
content it is meant to punctuate.

### Evidence level
The transform mechanism is the one already verified in Verification 7: `cam` was itself a
parent null whose position and scale drove measured content movement (dark-pixel area
377,436 -> 396,358 px across 0.9 -> 2.0 s, full width). `camRoot` is the same transform one
level up, with decaying keys on the same property, so it reaches the render by construction.
The shake is 16 px on a 1080 px frame - a jolt in motion, not a still-frame difference.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 21 - camera drift (2026-11-11 17:05)

The reference's last camera move, `drift({period, amount})` - a slow breath. It rides on
`camRoot`'s scale, which nothing else uses, so it multiplies the push instead of fighting it.

```
camRoot2 scale: [(2.67, 100.0), (3.27, 100.75), (3.87, 101.5), (4.47, 100.75), (5.07, 100.0), (5.67, 100.75), (6.1, 100.0)]
```

1.5 % over a 2.4 s period, and it lands on 100 at the layer's outPoint so a scene never hands
an offset to the next one.

### Two constraints found while building it
- **Never below 100 %.** A first version used a sine and dipped to 98.5 %. During a whip the
  outgoing and incoming scenes have different camRoots, so a scene scaled under 100 % is
  smaller than its neighbour and leaves a gap at the seam. The curve is now
  `100 + 0.75 * (1 - cos)`, which only ever grows.
- **Re-measured the whip with drift live** (columns, 0-255, ten 108 px columns):

| time | columns |
|---|---|
| 6.00 | 43 38 33 31 **105** 211 212 213 214 214 |
| 6.08 | 33 30 **172** 211 212 214 214 214 216 218 |
| 6.15 | 39 **209** 212 213 214 214 214 217 218 221 |

No background column at any point - the seam stays covered.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

## Verification 22 - the fourth camera move was unreachable (2026-11-11 17:25)

`CAMS` holds four moves but the loop indexed `CAMS[j % 3]`, so the fourth never ran and every
reel cycled only three. Fixed to `CAMS[j % CAMS.length]`.

Proof on `examples/hemat.ecproj` - five scenes, five camera nulls:

```
cam1 scale: [104.0, 112.0]   move 0  push in
cam2 scale: [112.0, 104.0]   move 1  pull out
cam3 scale: [106.0, 112.0]   move 2  push in, crane up
cam4 scale: [112.0, 106.0]   move 3  pull out  <- previously unreachable
cam5 scale: [104.0, 112.0]   wraps to move 0
```

`reference/scenes.md` documented `j % 3` with three moves and stale amplitudes (100/106/110)
that no longer matched the code. Rewritten to the real four moves, the measured 104-112 % range,
and the two-null camera stack with shake and drift.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |

## Verification 23 - orbit move, and the camera had no slack at all (2026-11-11 18:10)

Adding the reference's last camera move, `orbit`, exposed a defect that predated it.

### The orbit
`cam.position` sweeps a 12 px circle, 47 keys, returning to centre:

```
14.57 (552.0, 960.0)  15.47 (540.8, 972.0)  16.47 (528.0, 960.0)  17.47 (540.8, 948.1)  18.37 (540.0, 960.0)
```

### The defect it found
The first orbit build blacked out the left 24 px. The cause was not the orbit:

- The engine fits each scene precomp to **exactly 100 % net coverage** — `S5_outro` layer scale
  `94.34 %` = `100/106`, cancelling the camera's `106 %`.
- So at scene start there is **zero slack**, and any camera offset exposes comp background.
- The 16 px shake added in Verification 20 therefore blacked out **all four edges** on every
  cut scene: at 2.79 (shake peak) L/R/T/B were all `0/0` flat, against `15/2` at 3.10.

Two wrong fixes were tried and measured before the real one:

| Attempt | Result |
|---|---|
| orbit on `anchorPoint` | exposed 7 px — anchor shifts in layer space, then the camera scale multiplies it |
| `camRoot` scale base 108 % | no effect: the engine refits the layer to `87.35 %` = `100/(108×1.06)`, eating the headroom |

### The fix
`bin/ecm.mjs` multiplies the fitted layer scale by `1.08` after `layers.add` — the last writer,
so the engine's fit cannot cancel it. Net coverage becomes 108 % at scene start: 43 px of
horizontal slack, 77 px vertical, against a 16 px shake and a 12 px orbit.

`SAFE` starts 90 px in, so the extra zoom never crops content; the build's own safe-area check
and the 51-case smoke suite both still pass.

### Edge test after the fix (2 px strips, mean/std; `0/0` = flat background)

| time | L | R | T | B |
|---|---|---|---|---|
| 2.79 shake peak | 15/1 | 15/1 | 15/1 | 14/1 |
| 3.10 settled | 15/2 | 15/2 | 14/2 | 14/2 |
| 14.70 orbit + shake | 184/66 | 212/8 | 208/2 | 194/2 |
| 15.47 orbit | 184/66 | 184/66 | 209/2 | 195/3 |
| 16.47 orbit | 184/67 | 183/67 | 210/2 | 195/3 |
| 17.47 orbit | 184/68 | 184/68 | 211/2 | 195/3 |

No flat-background edge anywhere. Scene 3 at 5.86/5.96 also reads `0/0`, but its frame centre
is 29/20 against 229 at 6.20 — that is the `dip` transition covering the whole frame, not
exposure, and `S3_bars` scale is static at 101.89 so the headroom was not overwritten.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

### Follow-up: the shake is visible, not dead motion

Scene 3 (`S3_bars`) starts at 6.1, not 5.74 — the dark frame at 5.86 is scene 2's own dark
background, and every scene here uses the default `cut` (no dip in this spec). The shake peaks
at 6.23 on a light, fully-visible frame:

| time | title left edge |
|---|---|
| 6.10 | 65 px |
| 6.22 | 78 px |

13 px of measured movement on the title — the shake reads. Edges at 6.10/6.22/6.40 are
`211/9 211/9 209/2 194/2`: content everywhere, no exposure.

## Verification 24 - a pull-out was still exposing (2026-11-11 18:45)

The 8 % headroom from Verification 23 was keyed off the scene's **first** scale. A pull-out ends
at its lowest scale, which is also where its pan is widest, so it ran out of coverage while the
camera was still moving.

`examples/all-scenes.json` scene 2 (`kinetic`, move 1 `112 → 104`, pan `540 → 504`):

| measurement | value |
|---|---|
| layer fit | `96.43 %` = `100/112 × 1.08` |
| net at scene end | `96.43 × 104/100` = **100.3 %** |
| slack at scene end | 1.6 px |
| pan at scene end | 36 px |
| black band at t=6.0 | **27 px right, 8 px top** |

### Fix
- Headroom now keys off the smallest scale: `fit × 1.07 × s0 / min(s0, s1)`, which holds net at
  107 % throughout — 38 px horizontal, 67 px vertical.
- The pan is capped to the slack it actually has:
  `cap = 540 × (netMin − 1) × 0.9` → 34 px.
- The two pull-out ranges were softened (`112 → 106` and `112 → 107`). At `112 → 104` the start
  crop would have been 88 px against a 90 px `SAFE` margin — content touching the frame edge.

Resulting keys on `examples/all-scenes.ecproj`:

```
cam1  pan 540→574 (34, capped)   scale 104→112
cam2  pan 540→506 (34, capped)   scale 112→106   layer fit 100.94 = 107/106
cam4  pan 540→566 (26)           scale 112→107
```

### Edge sweep, all-scenes (2 px strips, mean/std)

| t | L | R | T | B |
|---|---|---|---|---|
| 1.0 | 167/81 | 167/81 | 210/2 | 194/3 |
| 3.0 | 213/8 | 213/8 | 211/3 | 196/3 |
| 5.0 | 212/9 | 211/8 | 208/2 | 194/3 |
| 6.0 | 212/9 | 210/8 | 208/2 | 195/2 |
| 6.3 | 37/2 | 37/2 | 38/2 | 35/2 |
| 9.0 | 15/2 | 15/2 | 14/2 | 14/2 |
| 12.0 | 211/9 | 212/9 | 209/2 | 194/3 |
| 15.0 | 15/2 | 15/2 | 14/2 | 13/2 |
| 18.0 | 211/9 | 211/9 | 209/2 | 193/3 |
| 21.0 | 212/8 | 214/9 | 212/3 | 195/3 |

Black band at t=6.0: **0 px** on both edges. The dark readings at 6.3/9.0/15.0 are those scenes'
own backgrounds — the corner pixel at 10.0/13.0 is `srgb(200,44,30)`, the theme accent.

| Gate | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46/46 |
| `node scripts/smoke-layouts.mjs` | 51/51 |
| `check` x 3 examples | exit 0 each |

# effectcraft-motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken script collection with a skill that turns a `video.json` spec into a 9:16 motion-graphics/infographic MP4 via `effectcraft-cli` 0.22.0.

**Architecture:** `bin/ecm.mjs` (Node, zero deps) validates the spec, computes durations, and inlines spec + theme + `lib/core.jsx` + `lib/scenes.jsx` into ONE generated JSX file (the JSX sandbox cannot read other files). `effectcraft-cli script` builds a `.ecproj` with one precomp per scene sequenced in `Main`; ecm then renders a contact sheet or the final MP4.

**Tech Stack:** effectcraft-cli 0.22.0 JSX object model (ES2015+), Node 24 (`node:test`, `node:child_process`), ImageMagick `magick`, `ffprobe`.

**Spec:** `docs/superpowers/specs/2026-11-10-effectcraft-motion-design.md`

## Global Constraints

- Canvas 1080×1920, 30 fps; comp `Main`; scene precomps named `S<n>_<type>` (n 1-based).
- Safe area: x 90–940, y 250–1450. Content center x = 515.
- Text floors: body 48 px, label 36 px; still not fitting → throw `text too long`.
- Duration: `clamp(1.2 + 0.37·words + 0.25·dataItems, 2.5, 7) × durationScale`, rounded to whole frames; `duration` overrides (unscaled). `tenang` durationScale 1.2, others 1.
- Rhythm: entrance 0.4–0.6 s, 70 ms per-item stagger, ≥1.2 s hold after settle, 0.3 s exit (content opacity → 0), hard cut.
- Easing never linear on position/scale. Profiles (`KeyframeEase(0, influence)`): `snap` out 0.1 / in 90 · `smooth` 30 / 75 · `pop` 0.1 / 90 plus scale overshoot key at 112 % · `calm` 60 / 60.
- Micro-motion: each scene layer in `Main` drifts scale 100 → 103 over its duration (`calm`).
- One accent per scene: only `emphasis` / `highlight` gets the accent.
- Every error message about a scene starts `scene N (type): ` (N 1-based).
- Outputs next to the spec, same basename: `.ecproj`, `.sheet.png`, `.mp4` (or `spec.out`, relative to the spec dir). Overwritten each run.
- Render lock: `/tmp/ecm-render.lock` (mkdir); one render at a time.
- No new dependencies. Node scripts invoked as `node bin/ecm.mjs`.

## Review Focus

1. `emphasis` that does not occur in the scene text → expect a validation error, not a silently uncolored word. (Task 1 test)
2. Text containing `"`, `\`, newlines, `</script>`, U+2028 → expect the generated script to parse and the text to render verbatim. (Task 1 + Task 2 tests)
3. Text too long for the layout at the floor size → expect `scene N (type): text too long`, never overflow outside the safe area. (Task 3 test)
4. Spec in a directory with spaces, ecm run from a different cwd → outputs land next to the spec. (Task 2 test)
5. `bars` where every value is 0 → expect a validation error, not NaN bar heights. (Task 1 test)

---

## Verified engine idioms (spiked 2026-11-09; use these, don't guess)

```js
app.project.items.addComp(name, 1080, 1920, 1, durSec, 30)          // comp; comp.duration settable
comp.layers.add(precomp); L.startTime = t; L.outPoint = t + d         // sequencing
comp.layers.addSolid([r,g,b], "bg", 1080, 1920, 1)                    // colors are 0–1 floats
comp.layers.addText(str)  // "\r" = line break
  p = L.property("Source Text"); d = p.value; d.font = "Inter-ExtraBold" /* PostScript name */;
  d.fontSize; d.fillColor = [r,g,b]; d.justification = ParagraphJustification.LEFT_JUSTIFY|CENTER_JUSTIFY; p.setValue(d)
  L.sourceRectAtTime(t, false) -> {left, top, width, height}          // layer space; works for shape layers too
  p.expression = '...'   // Source Text expressions evaluate (ease(), regex replace OK)
L.property("Text").property("Animators").addProperty("ADBE Text Animator")
  .property("Properties").addProperty("ADBE Text Opacity" | "ADBE Text Position 3D" | "ADBE Text Fill Color")
  .property("Selectors").addProperty("ADBE Text Selector") -> Start, End, Offset;
  sel.property("Advanced").property("Units").setValue(2)              // 2 = index units (char indices)
L.property("Contents").addProperty("ADBE Vector Group").property("Contents").addProperty(
  "ADBE Vector Shape - Rect" (Size, Position, Roundness) | "ADBE Vector Shape - Ellipse" (Size) |
  "ADBE Vector Graphic - Fill" (Color) | "ADBE Vector Graphic - Stroke" (Color, Stroke Width) |
  "ADBE Vector Filter - Trim" (Start, End; ellipse path starts at 12 o'clock, clockwise))
prop.setValueAtTime(t, v); prop.valueAtTime(t, false); prop.setTemporalEaseAtKey(k, inArr, outArr)
  // ease array length: 1 for Position and scalars, 3 for Scale
L.property("Effects").addProperty("Drop Shadow") -> "Shadow Color","Opacity","Direction","Distance","Softness"
L.comment = "bg" | "decor"; L.remove(); new Function(...) works; throw -> CLI exit 1, stderr "file:line:col: message"
```

Pitfalls: an uninstalled font name is accepted silently and rendered as Inter (`d.font` still reads back the bad name). Detect by width: a probe string set in the font measures exactly the same width as the default font → missing.

Verified font PostScript names: `HelveticaNeue-CondensedBlack`, `HelveticaNeue-Medium`, `Inter-ExtraBold`, `Inter-Medium`, `JetBrainsMono-Medium`, `Montserrat-ExtraBold`, `Montserrat-SemiBold`, `DINCondensed-Bold`, `AvenirNextCondensed-DemiBold`, `AvenirNext-Medium`, `AvenirNext-Regular`, `AvenirNext-DemiBold`, `AvenirNext-Bold`, `PlayfairDisplayRoman-Bold`. (`PlayfairDisplay-Bold`, `Inter-Regular` do NOT resolve.)

---

### Task 1: Themes + spec validation + script assembly (pure Node)

**Files:**
- Delete: `scripts/` (all 22 files), `SKILLS.md`
- Create: `themes.json`, `bin/ecm.mjs`, `test/ecm.test.mjs`, `lib/core.jsx` (empty placeholder `// core`), `lib/scenes.jsx` (`var SCENES = {};`)
- Modify: `.gitignore` (add `*.build.jsx`), spec doc (see Step 7)

**Interfaces:**
- Produces (exported from `bin/ecm.mjs`):
  - `loadThemes() -> Record<id, Theme>` reads `themes.json` next to `bin/..`
  - `validate(spec, themes) -> string[]` (empty = valid)
  - `durationOf(scene, theme) -> number` seconds, multiple of 1/30
  - `buildScript(spec, theme, durs) -> string` full JSX source
  - `SCENE_TYPES = ["hook","kinetic","stat","bars","donut","steps","compare","quote","outro","custom"]`
- `Theme` shape (themes.json):
  `{label, align: "left"|"center", easing: "snap"|"smooth"|"pop"|"calm", durationScale, colors: {base, ink, accent, muted, data, marker?, sheet?}, fonts: {display, body, label, quote?}, motifs: string[]}`

- [ ] **Step 1: Write `themes.json`** with exactly these values (motif names are defined in Task 3):

| id | align | easing | base | ink | accent | muted | data | extra | display / body / label / quote | motifs |
|---|---|---|---|---|---|---|---|---|---|---|
| reel | left | snap | #f2efe8 | #111111 | #e63323 | #6e6a62 | #111111 | | HelveticaNeue-CondensedBlack / HelveticaNeue-Medium / HelveticaNeue-Medium | slab, square |
| pitch | left | smooth | #f6f5f1 | #16171c | #2b59ff | #9097a8 | #c9ccd6 | | Inter-ExtraBold / Inter-Medium / JetBrainsMono-Medium | lineLabel, thin |
| infopop | center | pop | #fff6e6 | #1d2340 | #ff8a3d | #1d2340 | #1fc2a7 | marker #ffd23f | Montserrat-ExtraBold / Montserrat-SemiBold / Montserrat-SemiBold | highlighter, outline, hardShadow |
| kinetik | left | snap | #0b1416 | #e6f4f1 | #ffb000 | #4d6461 | #4d6461 | | DINCondensed-Bold / AvenirNextCondensed-DemiBold / JetBrainsMono-Medium | underline, square |
| tenang | center | calm | #eef0e6 | #2f4a3a | #d9734e | #6f8f72 | #a9bfa5 | | AvenirNext-Medium / AvenirNext-Regular / AvenirNext-Regular / PlayfairDisplayRoman-Bold | glow |
| edukasi | center | pop | #d9b98c | #26355d | #f07a5a | #4a5578 | #2a9d8f | sheet #fbf6ea | AvenirNext-Bold / AvenirNext-DemiBold / AvenirNext-DemiBold | sheet, softShadow, tag |

`durationScale` 1.2 for tenang, 1 otherwise. `label` = satsetmotion label (Reel Tegas, Pitch Minimal, Infografis Pop, Kinetik HUD, Tenang Minimalis, Edukasi Kertas).

- [ ] **Step 2: Write failing tests** in `test/ecm.test.mjs` (`node:test`, `node:assert/strict`):

```js
const T = loadThemes(); const reel = T.reel, tenang = T.tenang;
test("themes: six ids", () => assert.deepEqual(Object.keys(T).sort(), ["edukasi","infopop","kinetik","pitch","reel","tenang"]));
test("duration: words", () => assert.equal(durationOf({type:"hook", text:"Gaji naik, tabungan tetap?"}, reel), 80/30));
test("duration: tenang scale", () => assert.equal(durationOf({type:"hook", text:"Gaji naik, tabungan tetap?"}, tenang), 96/30));
test("duration: items", () => assert.equal(durationOf({type:"steps", title:"Mulai dari sini", items:["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]}, reel), 147/30));
test("duration: clamp low/high/override", () => {
  assert.equal(durationOf({type:"hook", text:"Halo"}, reel), 2.5);
  assert.equal(durationOf({type:"quote", text:"kata ".repeat(40)}, reel), 7);
  assert.equal(durationOf({type:"hook", text:"Halo", duration:4}, tenang), 4);
});
const v = (scenes, theme = "reel") => validate({theme, scenes}, T);
test("valid example", () => assert.deepEqual(v([{type:"hook", text:"Hai", emphasis:"hai"}]), []));
test("errors", () => {
  assert.deepEqual(validate({theme:"nope", scenes:[]}, T), ["theme: unknown \"nope\" (reel, pitch, infopop, kinetik, tenang, edukasi)", "scenes: must be a non-empty array"]);
  assert.deepEqual(v([{type:"chart"}]), ["scene 1 (chart): type unknown"]);
  assert.deepEqual(v([{type:"hook"}]), ["scene 1 (hook): text required"]);
  assert.deepEqual(v([{type:"donut", value:120}]), ["scene 1 (donut): value must be 0–100"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:0},{label:"b",value:0}]}]), ["scene 1 (bars): items need at least one value > 0"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:1},{label:"b",value:2}], highlight:2}]), ["scene 1 (bars): highlight must be 0–1"]);
  assert.deepEqual(v([{type:"hook", text:"Gaji naik", emphasis:"turun"}]), ["scene 1 (hook): emphasis \"turun\" not found in text"]);
  assert.deepEqual(v([{type:"hook", text:"Hai", bg:"red"}]), ["scene 1 (hook): bg must be base|ink|accent"]);
});
test("script embeds hostile text safely", () => {
  const text = 'a "q" \\ b\n</script>\u2028end';
  const src = buildScript({theme:"reel", scenes:[{type:"hook", text}]}, reel, [3]);
  const line = src.split("\n")[0];                         // var SPEC = {...};
  assert.ok(!src.includes("\u2028"));
  assert.equal(new Function(line + " return SPEC;")().scenes[0].text, text);
});
```


- [ ] **Step 3: Run** `node --test test/` → FAIL (module not found).

- [ ] **Step 4: Implement `bin/ecm.mjs` exports.**
  - `validate`: rules (1-based scene index, all errors collected):
    hook/quote/outro `text` non-empty string · kinetic `lines` 1–6 non-empty strings · stat `value` finite number · bars `items` 2–6 of `{label: string, value: finite ≥ 0}`, at least one > 0, `highlight` integer in range · donut `value` 0–100 · steps `items` 1–5 non-empty strings · compare `left`/`right` each `{title: string, points: ≤4 strings}` · custom `jsx` string · optional `duration` 1–15 · optional `bg` ∈ base|ink|accent · `emphasis` must occur case-insensitively in the scene's main text (hook/quote/outro `text`, kinetic `lines` joined by space).
  - `durationOf`: words = whitespace tokens over all string fields of the scene except `type`, `bg`, `emphasis`, `jsx` (recurse into arrays/objects); dataItems = `items.length` (bars, steps) | `lines.length` (kinetic) | total `points` (compare) | 0.
  - `buildScript(spec, theme, durs)`: concatenates, in order: `var SPEC = <json>;\nvar THEME = <json>;\nvar DURS = <json>;\n` + `lib/core.jsx` + `lib/scenes.jsx` + `MAIN` (Task 2). JSON via `JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")` (regex literals written with `\u` escapes, never the raw characters).
  - CLI entry guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`; for now only `check <spec>`: prints errors to stderr and exits 1, or prints `scene  type  seconds` lines and total.

- [ ] **Step 5: Run** `node --test test/` → PASS.

- [ ] **Step 6: Delete** `scripts/` and `SKILLS.md`; add `*.build.jsx` to `.gitignore`.

- [ ] **Step 7: Correct the spec doc** where spikes disproved it: quote font `PlayfairDisplayRoman-Bold`; font preflight is a width probe inside the generated JSX (`text.fonts` lists families, not PostScript names); blank-frame check runs inside `ecm` (not only in smoke); item limits (kinetic ≤6 lines, bars 2–6, steps ≤5, compare ≤4 points); infopop accent `#ff8a3d` with marker `#ffd23f`; bars all-zero is a validation error.

- [ ] **Step 8: Commit** `feat: themes, spec validation, durations, script assembly`.

---

### Task 2: Build pipeline + core.jsx + `preview` (with `hook` stub and `custom`)

**Files:**
- Modify: `bin/ecm.mjs` (MAIN JSX, `preview` command), `lib/core.jsx`, `lib/scenes.jsx`
- Create: `test/smoke.sh`, `examples/hostile.json`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces (globals in `lib/core.jsx`, available to scenes and to `custom` code):
  - `SAFE = {x0:90, x1:940, y0:250, y1:1450}`, `CX = 515`
  - `rgb(hex) -> [r,g,b]`, `onColor(theme, bgHex) -> hex` (base or ink, higher WCAG contrast)
  - `bgFor(comp, theme, variant) -> {fill, text}`: adds bg solid (comment `bg`); `sheet` motif on `base` adds the cream sheet rect `[60,200,960,1300]` r 18 (comment `bg`)
  - `text(comp, str, o) -> {layer, x, y, w, h, size, lines}`; `o = {font, size, min, color, align, x, y, maxW, maxH, name}`; greedy word-wrap + shrink by 6 % steps until `w ≤ maxW && h ≤ maxH`; throws `text too long` at `min`; sets anchor so `(x, y)` is the block's top-left (`align:"left"`) or top-center (`"center"`)
  - `measure(str, font, size) -> width` (temp layer, removed)
  - `rect(comp, o) -> layer` `o = {x, y, w, h, fill, stroke?, strokeW?, radius?, origin: "center"|"bottom"|"left"|"topLeft", name, comment?}`; `(x,y)` is the origin point
  - `ellipse(comp, o)`, `ring(comp, o) -> {layer, trim}` (`o = {cx, cy, d, strokeW, color}`)
  - `animate(prop, t0, t1, v0, v1, easing)`; `pop` on Scale inserts overshoot `112 %` at `t0 + 0.7·(t1−t0)`
  - `revealText(layer, t0, dur, easing)` per-character opacity + 60 px rise via range selector Offset 0→100
  - `colorRange(layer, start, end, hex)` fill-color animator, index units
  - `assertFonts(theme)` throws `font <name> is not installed`
  - `exitAll(comp, dur)` opacity → 0 over `[dur−0.3, dur]` for every layer whose comment is not `bg`
  - `checkSafe(comp, t)` throws `<layer name> outside safe area` for any layer not commented `bg`/`decor` whose comp-space bounds at `t` exceed `SAFE` by > 2 px
- Scene builder contract: `SCENES[type](comp, theme, scene, dur) -> settleSec` (time the last element finishes entering).
- MAIN (in buildScript): `assertFonts(THEME)`; for each scene i: precomp `S<i+1>_<type>`, `bgFor`, call builder inside `try/catch` rethrowing `scene N (type): ` + message; `custom` = `new Function("comp","theme","scene","dur", scene.jsx)` (settle defaults to `0.6·dur`); then `checkSafe(comp, settle)`; enforce the hold: `need = ceilToFrame(settle + 1.5)`; if `need > dur`: explicit `scene.duration` → throw `duration too short, needs ≥ <need>s`, else `dur = need` and `comp.duration = dur`; then `exitAll(comp, dur)`. After all scenes: create `Main` (sum of final durs), place each precomp at its start, drift scale; finally `writeLn("ECM " + JSON.stringify({settle, durs}))` (final durations; ecm uses these for frame times and prints `total <sum>s`).
- `node bin/ecm.mjs preview <spec>`: validate → write `<base>.build.jsx` in `os.tmpdir()` → `effectcraft-cli script <tmp> --empty --save-as <specDir>/<base>.ecproj` → parse `ECM` line → per scene `render-frame --comp Main --time <start + min(settle+0.25, dur−0.35)> --max-side 480` → blank check (`magick <png> -colorspace gray -format "%[fx:standard_deviation]" info:` < 0.004 → `scene N (type): renders blank at <t>s`) → `magick montage -label "%t" … -tile 5x -geometry +8+8` → `<base>.sheet.png`; print sheet path. CLI errors: print the message after `file:line:col: `, exit 1. Always delete the tmp JSX.

- [ ] **Step 1: Write failing smoke** `test/smoke.sh` (bash, `set -euo pipefail`, runs from any cwd):
  1. `node --test "$ROOT/test/"`
  2. Copy `examples/hostile.json` (theme reel; scenes: `hook` with text `Kata "kutip" \ dan </script>`, `custom` drawing a 400×400 accent rect at CX,850 via `rect()`) into `$TMP/dir with space/`; run `cd / && node "$ROOT/bin/ecm.mjs" preview "$TMP/dir with space/hostile.json"`; assert exit 0 and `hostile.ecproj` + `hostile.sheet.png` exist there.
  3. Assert `effectcraft-cli get S1_hook text text/sourceText --json "<ecproj>"` contains the hook text verbatim (scene builders name their main text layer `text`).
  4. Failing cases, each asserting exit 1 and the exact stderr substring:
     custom jsx `assertFonts({fonts:{display:"NoSuchFont-Bold"}})` → `scene 1 (custom): font NoSuchFont-Bold is not installed`;
     custom jsx `return (;` → `scene 1 (custom): SyntaxError`;
     custom jsx that only returns 1 (bg only) → `scene 1 (custom): renders blank`;
     custom jsx placing `rect({x:1000,y:850,w:200,h:200,…})` → `scene 1 (custom): ` + `outside safe area`.
- [ ] **Step 2: Run** `bash test/smoke.sh` → FAIL (`preview` unknown).
- [ ] **Step 3: Implement** core.jsx, MAIN, `preview`, and a placeholder `SCENES.hook` that just calls `text()` + `revealText()` centered (Task 3 replaces it).
- [ ] **Step 4: Run** `bash test/smoke.sh` → PASS. Read `hostile.sheet.png` — text must be legible and inside the safe area.
- [ ] **Step 5: Commit** `feat: build pipeline, core helpers, preview + contact sheet`.

---

### Task 3: Text scenes — hook, kinetic, quote, outro + motifs

**Files:** Modify `lib/scenes.jsx`, `lib/core.jsx` (motif helpers); Create `examples/all-scenes.json` (text scenes now, extended in Tasks 4–5); extend `test/smoke.sh`.

**Interfaces:**
- Consumes: Task 2 core globals.
- Produces: `wordBox(res, word) -> {x,y,w,h}` comp-space box of `word` inside a `text()` result (line = which line contains it; line height = `h / lines`; x from `measure()` of the line prefix, line width for center alignment); `motif(theme, name) -> bool`; `title(comp, theme, scene, n) -> {bottom}` (used by every scene with `title`; `lineLabel` themes render `0n  TITLE` in label font 36, muted, with a 40 px line before it, at y 300; others display font start 84 min 56 at y 300).

Layout and motion (all inside SAFE; easing = theme's):

| scene | layout | motion |
|---|---|---|
| hook | display, start 150, min 72, block centered on y 820 | `revealText` 0.15 s → 0.75 s; emphasis motif after reveal |
| kinetic | one layer per line, same size for all (largest that fits every line; start 120, min 64), stacked from y 300 | line i enters at `0.15 + 0.35·i` (rise 60 px + fade, 0.45 s) |
| quote | `“` in accent, display 300 (decor) above; text in `fonts.quote ?? fonts.display`, start 96, min 56; `— source` label font, muted | text `revealText` over 0.9 s |
| outro | text display start 120 min 64, top-ish (center y 760); `cta` body 52 in pill (rect r = h/2, accent fill, `onColor` text) 80 px below | text reveal, then pill scales in (theme easing) |

Motifs (only when listed in the theme):
- `slab`: ink rect full bleed x 0–1080, height = text block h + 100, behind hook/outro/quote text (comment `decor`), slides from x −1080 over 0.4 s before the text reveal; text then uses `base` color.
- `underline`: accent bar 14 px under the emphasis `wordBox`, scale X 0 → 100 from its left edge, starting at reveal end.
- `highlighter`: rounded rect r 14, `marker` fill, 6 px ink stroke, rotation −2.3°, 18 px padding around emphasis `wordBox`, behind text (comment `decor`), scale X from center at reveal end. Emphasis text keeps ink color.
- `glow`: 3 accent ellipses (opacity 8/11/15 %, diameters 520/390/260) centered behind the emphasis or main block (comment `decor`), fade in over 1.2 s.
- Emphasis color = accent, except with `highlighter` (ink) or `bg: accent` (no recolor).

- [ ] **Step 1: Extend smoke**: build `all-scenes.json` for each of the 6 themes (node one-liner rewrites `theme` into `$TMP/all-<id>.json`), assert exit 0; failing case hook with 80-word text → `scene 1 (hook): text too long`.
- [ ] **Step 2: Run smoke** → FAIL.
- [ ] **Step 3: Implement** the four scenes + `wordBox`, `title`, motifs.
- [ ] **Step 4: Run smoke** → PASS; **read all 6 sheets**: emphasis visibly marked, nothing clipped, text on `ink`/`accent` bg readable. Fix and re-run until clean.
- [ ] **Step 5: Commit** `feat: text scenes and theme motifs`.

---

### Task 4: Data scenes — stat, bars, donut

**Files:** Modify `lib/scenes.jsx`, `lib/core.jsx` (`counterExpr`), `examples/all-scenes.json`, `test/smoke.sh`.

**Interfaces:**
- Produces: `counterExpr(t0, t1, value, prefix, suffix) -> string` Source Text expression: eased 0 → value, decimals = decimals of `value`, Indonesian format (thousands `.`, decimal `,`).

| scene | layout | motion |
|---|---|---|
| stat | value display start 300 min 120 (fitted on the final string), centered group on y 820; `label` body start 56 min 48, 40 px below; prefix/suffix inside the counter string | counter 0.2 → 1.4 s; value layer scales in (theme easing) |
| bars | after `title()`; baseline y 1250; max bar height = baseline − (content top + 70); gap 36; width `(850 − 36(n−1))/n`; value label (body 44, min 36) above each bar; category label (label font 40, min 36) under baseline at y 1270 | bars scale Y 0 → 100 from bottom, 0.5 s each, 70 ms stagger; value labels fade in as each bar settles |
| donut | ring center (515, 820), d 560, stroke 56; track = `data` color at 30 % opacity; progress = accent, trim End 0 → value; centered percent counter display start 150 min 96; `label` body under ring | trim + counter 0.2 → 1.4 s |

Bar colors: `highlight` → accent, others → `data`. Motifs: `outline` = 6 px ink stroke on bars/badges; `hardShadow` = Drop Shadow (ink, opacity 100, direction 135, distance 9, softness 0) on shapes and stat value; `softShadow` = (#2b2a28, opacity 16, distance 7, softness 12); `square` = radius 0, otherwise bars radius 10; `thin` (pitch) = bars without highlight get no fill and a 3 px ink stroke.

- [ ] **Step 1: Extend smoke**: add stat (`value: 1250000, prefix: "Rp "`), stat (`value: 2.5, suffix: " jt"`), bars (5 items, highlight 3), donut (72) to `all-scenes.json`; assert via `effectcraft-cli get S<n>_stat value text/sourceText --time <scene end − 0.4> --json` evaluated `Rp 1.250.000` and `2,5 jt`.
- [ ] **Step 2: Run smoke** → FAIL.
- [ ] **Step 3: Implement** the three scenes + `counterExpr` (name the value layer `value`).
- [ ] **Step 4: Run smoke** → PASS; read all 6 sheets (bars aligned to baseline, labels not overlapping, donut starts at 12 o'clock).
- [ ] **Step 5: Commit** `feat: data scenes (stat, bars, donut)`.

---

### Task 5: List scenes — steps, compare

**Files:** Modify `lib/scenes.jsx`, `examples/all-scenes.json`, `test/smoke.sh`.

| scene | layout | motion |
|---|---|---|
| steps | after `title()`; rows from content top, row height `min(200, available/n)`; badge (d 96) with number in display font + item text body start 60 min 48, maxW 850 − 140 | rows slide 60 px from left + fade, 0.45 s, 70 ms stagger; badge pops |
| compare | `left` card on top (y 300–820), "VS" ink circle (d 120, base text) at y 850, `right` card below (880–1400); card title display start 72 min 56, points body start 52 min 48 with `•` | left card from left, right from right 0.25 s later; points fade 70 ms stagger |

Card styles: left = no fill, 4 px ink stroke; right = accent fill with `onColor` text. Badge by motif: `square` → square badge; `tag` → accent rect rotated −4° with a 14 px ink pin dot at top center; else circle. `slab` (reel) steps: each row is an ink bar x 90–940 with base text and accent number.

- [ ] **Step 1: Extend smoke**: add steps (3 items), compare (3 points each); failing case steps item of 60 words → `scene 1 (steps): text too long`.
- [ ] **Step 2: Run smoke** → FAIL.
- [ ] **Step 3: Implement** both scenes.
- [ ] **Step 4: Run smoke** → PASS; read all 6 sheets.
- [ ] **Step 5: Commit** `feat: list scenes (steps, compare)`.

---

### Task 6: `render` command + lock + example

**Files:** Modify `bin/ecm.mjs`, `test/smoke.sh`; Create `examples/hemat.json` (the spec's example, theme `reel`).

**Interfaces:** `node bin/ecm.mjs render <spec>`: acquire lock (`mkdirSync("/tmp/ecm-render.lock")`; `EEXIST` → exit 1 `another render is running (remove /tmp/ecm-render.lock if not)`), run the preview build (project + sheet), then `effectcraft-cli render <ecproj> --comp Main --out <out> --format h264`; release lock in `finally` and on `SIGINT`/`SIGTERM`; print the MP4 path.

- [ ] **Step 1: Extend smoke**: render `examples/hemat.json` copy → `ffprobe` gives `1080,1920,30/1` and duration within 0.05 s of the `total` printed by `render`; lock dir absent afterwards. With `mkdir /tmp/ecm-render.lock` pre-created → exit 1 with `another render is running`; then remove it.
- [ ] **Step 2: Run smoke** → FAIL.
- [ ] **Step 3: Implement** `render`.
- [ ] **Step 4: Run smoke** → PASS; watch the MP4 frames at 3 points (ffmpeg extract) — motion, exits, hard cuts look right.
- [ ] **Step 5: Commit** `feat: serial render with lock`.

---

### Task 7: SKILL.md + references + install (writing-skills TDD)

**Files:** Create `SKILL.md`, `reference/scenes.md`, `reference/themes.md`, `reference/cli.md`; Modify `README.md`; outside repo: symlink `~/.claude/skills/effectcraft-motion`, edit description of `~/.claude/skills/clipper-motion/SKILL.md`.

- [ ] **Step 1: RED baseline.** Dispatch a Sonnet subagent WITHOUT the skill: "Buat video infografis 9:16 (5 scene, data tabungan) pakai effectcraft-cli. Output di /tmp/ecm-baseline. Render at most once." Record verbatim: wrong commands, missing easing, safe-area violations, font issues, parallel renders, time spent.
- [ ] **Step 2: Write `SKILL.md`** (≤500 words). Frontmatter `name: effectcraft-motion`; description (triggers only, ≤500 chars): Use when making vertical 9:16 motion graphics or infographics (numbers, charts, lists, kinetic text) with effectcraft-cli / EffectCraft, or a satsetmotion-style theme other than pitch kajian — for pitch-style kajian videos from opus-video-prompts use clipper-motion. Body: workflow (write spec → `check` → `preview` → read sheet → `render`), spec quick reference table, theme picker (one line each), rules (never hand-write raw CLI keyframes for these scene types; always read the sheet before render; one render at a time), common mistakes from Step 1. Link the three reference files.
- [ ] **Step 3: Write references**: `scenes.md` (every field, limits, the `custom` contract with core helper signatures from Task 2), `themes.md` (table from Task 1 + when to use), `cli.md` (verified idioms + pitfalls section from this plan, raw CLI commands for edits outside the pipeline). Rewrite `README.md` in Indonesian: what it is, install, quick start.
- [ ] **Step 4: GREEN.** Same subagent prompt WITH the skill installed (symlink `~/.claude/skills/effectcraft-motion` → repo). Pass = valid spec, sheet read before render, one render, MP4 produced, no failure from Step 1 repeated.
- [ ] **Step 5: REFACTOR.** Any new failure → add counter to `SKILL.md`, re-run Step 4.
- [ ] **Step 6:** Update `clipper-motion` description to end with: "Untuk infografis/data/angka atau gaya selain pitch via EffectCraft, pakai effectcraft-motion."
- [ ] **Step 7: Run** `bash test/smoke.sh` → PASS; `wc -w SKILL.md` ≤ 500.
- [ ] **Step 8: Commit** `docs: effectcraft-motion skill, references, README`.

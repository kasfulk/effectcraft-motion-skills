# CLI reference

`ecm.mjs` is a zero-dependency Node script. Run it from any working directory as `bin/ecm <command> <spec>`.

## Commands

### `check`

```sh
bin/ecm check examples/hemat.json
```

Validates the JSON without starting EffectCraft. It prints estimated seconds per scene, such as `1  hook  2.67`, followed by `total  13.33`. Validation errors print to stderr and the command exits 1. Exact validation messages include:

- `spec: must be an object`
- `theme: unknown "nope" (reel, pitch, infopop, kinetik, tenang, edukasi)`
- `out: must be a .mp4 path`
- `scenes: must be a non-empty array`
- `scene 1 (chart): type unknown`
- `scene 1 (hook): text required`
- `scene 1 (kinetic): lines must be 1–6 non-empty strings`
- `scene 1 (stat): value must be a number`
- `scene 1 (stat): value must be below 1e15`
- `scene 1 (stat): label must be a string`
- `scene 1 (bars): items must be 2–6 of {label, value ≥ 0}`
- `scene 1 (bars): values must be below 1e15`
- `scene 1 (bars): items need at least one value > 0`
- `scene 1 (bars): highlight must be 0–1`
- `scene 1 (donut): value must be 0–100`
- `scene 1 (steps): items must be 1–5 non-empty strings`
- `scene 1 (compare): left must be {title, points: up to 4 strings}`
- `scene 1 (custom): jsx required`
- `scene 1 (hook): duration must be 1–15`
- `scene 1 (hook): bg must be base|ink|accent`
- `scene 1 (hook): emphasis must be a non-empty string`
- `scene 1 (hook): emphasis "turun" not found in text`
- `scene 1 (kinetic): emphasis "x" not found in any line`

After the duration table, `check` prints craft lint lines, one per finding:

```text
WARN  C03 scenes[2] (bars): no highlight → add "highlight": 0 (largest value is Makanan)
```

Each line is `LEVEL  CODE scene: message → fix`. All findings are `WARN` (no `ERROR` levels exist yet). Warnings alone exit 0; with `--strict` any warning exits 2:

```sh
bin/ecm check spec.json --strict
```

### Craft lint

Rules C01–C10 as printed by `check` (see `examples/lint-bad.json`):

| code | rule | message | fix |
|---|---|---|---|
| C01 | first scene not hook/quote/stat (cold open) | `cold open (first scene is <type>)` | make `scenes[0]` `{"type":"hook","text":"..."}` or open with a quote/stat |
| C01 | last scene not outro | `no outro/cta, viewers get no next step` | make the last scene `{"type":"outro","text":"...","cta":"..."}` |
| C02 | fewer than 3 scenes | `<n> scenes` | merge or add scenes so there are 3–8 |
| C02 | more than 8 scenes | `<n> scenes` | cut to 8 scenes or fewer |
| C02 | estimated total under 12 s or over 60 s | `estimated total <n> s` | total under 12 s (is `<n>`); add a scene or lengthen text / total over 60 s (is `<n>`); cut scenes or shorten text |
| C03 | bars without `highlight` | `no highlight` | add `"highlight": <i>` (largest value is `<label>`) |
| C03 | highlight is not the largest value | `note: highlight <i> (<label>) is not the largest value` | set `"highlight": <i>` (largest value is `<label>`) |
| C03 | highlight points at the smallest value | `highlight <i> points at the smallest value (<label>)` | set `"highlight": <i>` (largest value is `<label>`) |
| C04 | hook over 9 words | `hook is <n> words` | rewrite `"text"` to 9 words or fewer |
| C04 | kinetic line over 4 words | `line <j> "<line>" is <n> words` | split or trim `lines[<j>]` to 4 words or fewer |
| C04 | steps item over 7 words | `step <j> "<item>" is <n> words` | split or trim `items[<j>]` to 7 words or fewer |
| C04 | quote over 24 words | `quote is <n> words` | trim `"text"` to 24 words or fewer |
| C04 | compare point over 6 words | `<left\|right> point <j> "<p>" is <n> words` | trim `<side>.points[<j>]` to 6 words or fewer |
| C04 | outro.cta over 5 words | `cta is <n> words` | trim `"cta"` to 5 words or fewer |
| C05 | hook/outro/quote without `emphasis` | `no emphasis word; pick the one word the scene is about` | add `"emphasis": "<one word from text>"` |
| C05 | emphasis over 3 words | `emphasis "<e>" is <n> words` | trim `"emphasis"` to 3 words or fewer |
| C06 | three consecutive scenes of the same type (not kinetic) | `three consecutive <type> scenes` | vary the scene types (e.g. insert a kinetic or steps scene) |
| C06 | three consecutive same `bg` when more than 4 scenes | `flat rhythm; three scenes on bg <bg>` | alternate bg base/ink/accent on the turn (set `"bg"` on `scenes[<j>]`) |
| C07 | more than 1 spec-level fx preset | `<n> spec-level fx presets` | keep at most 1 fx preset in spec `"fx"` (has `<list>`) |
| C07 | more than 1 fx preset on one scene | `<n> fx presets on one scene` | keep at most 1 fx preset in `"fx"` (has `<list>`) |
| C07 | glitch/rgbIn on a calm or smooth theme | `fx <f> fights the <easing> theme` | remove glitch/rgbIn or pick a snap/pop theme |
| C08 | stat without `label` | `stat without label` | add `"label": "<what the number is>"` |
| C08 | stat value over 100 with no prefix/suffix | `value <v> reads like a percentage over 100` | add `"suffix": "%"` or `"prefix": "Rp "` so the unit is clear |
| C08 | bars value over 100 | `bar value(s) over 100 (<labels>)` | rescale values (e.g. thousands) or make the unit part of each label |
| C08 | donut value with decimals | `donut value <v> has decimals` | round `"value"` to a whole number |
| C09 | explicit duration on a text scene over 2× the auto estimate | `explicit duration <d>s is more than 2x the <a>s estimate; long hold, viewers scroll` | remove `"duration"` or set it near `<a>` |
| C10 | ≥ 3 data scenes (stat/bars/donut) and no kinetic/steps/quote | `<n> data scenes: numbers without a line of meaning` | add a kinetic, steps, or quote scene that says what the numbers mean |

`scene` is `scenes[<i>] (<type>)` for scene findings, or `spec` for spec-level findings. Words are whitespace-split.

### `preview`

```sh
bin/ecm preview examples/hemat.json
```

Validates, builds the EffectCraft project, renders one frame per scene, checks for blank frames, and writes a contact sheet next to the spec. It deletes the old sheet first, then prints the sheet path. If effectcraft-cli or magick cannot start, the spawn error is printed (e.g. `spawnSync effectcraft-cli ENOENT`). Exact pipeline errors include `missing ECM output`, `scene 1 (hook): blank check failed: ...`, and `scene 1 (hook): renders blank at 2.5s`. Engine errors arrive as `file:line:col: message`; `ecm.mjs` strips the location and prints the message. Examples from the smoke cases include:

- `scene 1 (custom): font NoSuchFont-Bold is not installed`
- `scene 1 (custom): SyntaxError`
- `scene 1 (custom): renders blank`
- `scene 1 (custom): rect outside safe area`
- `scene 1 (steps): text too long`
- `scene 1 (hook): text too long`

The exact duration value depends on the returned settle time and is formatted as `duration too short, needs ≥ Ns`.

### `render`

```sh
bin/ecm render examples/hemat.json
```

Takes the render lock, runs the preview build and checks, writes the MP4, then prints `total  <seconds>` and the MP4 path. If the lock exists, it prints:

```text
another render is running (remove /tmp/ecm-render.lock if not)
```

If effectcraft-cli or magick cannot start, the spawn error is printed (e.g. `spawnSync effectcraft-cli ENOENT`). Other exact errors include the final engine error and `missing ECM output`. `total` is the final length (matches the MP4); the `out` directory is created if missing. A render always releases `/tmp/ecm-render.lock` on exit.

Every generated comp has motion blur on (`comp.motionBlur = true`, 180° shutter, 8 samples) and every layer has the motion-blur switch set, so fast moves — transitions, scale pops, camera drift — smear instead of stepping. 8 samples is the speed/quality tradeoff: 16 samples costs ~3.5x render time for a difference you cannot see at 1080x1920. There is no per-scene opt-out; a scene that must stay crisp needs its own `custom` JSX.

If the spec has an `audio` block (see [scenes.md](scenes.md)), the silent MP4 is post-muxed with ffmpeg in place (via a `.tmp.mp4` + rename): bed looped to full length with fade-in/out, sparse sfx delayed to their resolved times, mixed, loudness-normalized, and muxed with `-c:v copy`. `render` prints `audio: muxed N sfx + bed` or `audio: none` before the MP4 path; a mux failure prints `audio mux failed: ...` and exits 1.

### `new`

```sh
bin/ecm new reel spec.json
```

Writes a starter spec for the named theme. Creates a minimal spec with one `hook`, one `stat`, and one `outro` scene, then validates it. Prints the output path on success. The file is written to `out` or to `<theme>.json` in the current directory.

### `themes`

```sh
bin/ecm themes
bin/ecm themes --json
```

Prints one tab-separated line per theme: id, label, align, base, ink, accent, display font, motifs, fx. With `--json`, prints the whole `themes.json` object instead.

### `slides`

```sh
bin/ecm slides deck.json --out deck-slides/
```

Renders one PNG per slide at the template's size. See [templates.md](templates.md) for deck spec shape and field descriptions.

### `fonts`

```sh
bin/ecm fonts --list
bin/ecm fonts --check
bin/ecm fonts --install
```

`--list` prints the families in the manifest (`assets/fonts/fonts.json`) grouped by category.
`--check` verifies that every theme and deck template names a font that is actually installed,
and exits non-zero listing the missing ones. `--install` downloads any font the manifest lists
but the machine lacks — from the Google Fonts css2 API straight into the system font directory —
so the engine can resolve it. Nothing is bundled in the repo; already-installed fonts are
skipped.

Themes and templates must name a manifest PostScript name (`Anton-Regular`,
`PlayfairDisplay-Bold`), not a family name. A theme that names a system font such as
`HelveticaNeue-Medium` fails `--check` and refuses to render.

## Machine safety

Run only one EffectCraft engine process at a time. Prefix runs with:

```sh
bin/ecm check examples/hemat.json
bin/ecm preview examples/hemat.json
bin/ecm render examples/hemat.json
```

`preview` is not locked. Never run it while a render is in progress. Keep render and preview work sequential.

## Raw EffectCraft CLI idioms

These commands are useful for edits outside the pipeline. Verified on effectcraft-cli 0.22. Pass the project as `--project F.ecproj` or as a trailing `F.ecproj`. Layers can be given by name, by `#n` (stack index, where 1 is the top) or by id. Comps are named `S<n>_<type>`, plus `Main`.

```sh
C=effectcraft-cli; F=video.ecproj
$C get S1_hook text text/sourceText --json --project $F
$C get S2_stat value text/sourceText --time 2 --json $F   # expression: read the "evaluated" field
$C props S1_donut '#4' --flat $F                           # property paths of a layer
$C set S1_hook text transform/opacity 0 --time 0 --project $F --save
$C render-frame --project $F --comp Main --time 2.5 --max-side 480 --out frame.png
$C script FILE.jsx --empty --save-as $F                    # run AE-style JSX
```

The generated script uses PostScript font names from `assets/fonts/fonts.json` (e.g. `Inter-Regular`, `BebasNeue-Regular`, `PlayfairDisplay-Bold`, `JetBrainsMono-Regular`). Run `bin/ecm fonts --install` to download any missing font from Google Fonts into `~/Library/Fonts` (Linux: `~/.local/share/fonts`); fonts already installed are skipped. `preview`/`render` verify the theme's fonts against `effectcraft-cli exec text.fonts` and fail with `fonts not installed: ...` if one is missing.

## 3D model layers

Model layers come from `app.project.importFile(new ImportOptions(new File(path)))` followed by `comp.layers.add(item)`. The import returns an item whose `typeName` is `"3D Model"`; adding it to a comp automatically switches `comp.renderer` to `"ADBE Advanced 3d"`.

Lights are added with `comp.layers.addLight(name, point)` and their type is set via `light.lightType = <number>`:

- `4412` — Parallel (key light)
- `4415` — Ambient (fill light)

Intensity is a plain property: `light.property('Intensity').setValue(n)`.

**Pitfall:** `lightType` is a plain number, not a property object. Do not call `light.property('lightType')`; assign directly to `light.lightType`.

## Pitfalls (verified)

- Layer 1 is the top of the stack. `moveToEnd()` puts a layer behind the bg, where it is invisible, so use `a.moveAfter(ref)`.
- On shape layers, `L.property("Scale")` resolves to the vector group. Use `L.transform.*` instead.
- `setValueAtTime` returns no key index. Read `prop.numKeys` right after the call.
- Scale values are vec3. The Scale matchName is `ADBE Scale`.
- The text selector Units default is percent. `setValue(2)` switches it to index units.
- Unknown fonts silently fall back to the engine default (Inter). `preview`/`render` check the theme's fonts against `effectcraft-cli exec text.fonts` before building, so a missing font fails fast instead of rendering in the wrong face.
- The montage default label font may be missing; `ecm.mjs` picks a label font itself (Helvetica on macOS, DejaVu Sans on Linux) and drops `-font` if neither exists.
- `sourceRectAtTime` reports stroked shapes about 13 px wider per side.
- A static opacity is overwritten by any later keyed animation that starts from a hard-coded value.
- CLI errors appear as `file:line:col: message` on stderr.

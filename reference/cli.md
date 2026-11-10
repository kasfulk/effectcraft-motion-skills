# CLI reference

`ecm.mjs` is a zero-dependency Node script. Run it from any working directory as `node bin/ecm.mjs <command> <spec>`.

## Commands

### `check`

```sh
node bin/ecm.mjs check examples/hemat.json
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

### `preview`

```sh
node bin/ecm.mjs preview examples/hemat.json
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
node bin/ecm.mjs render examples/hemat.json
```

Takes the render lock, runs the preview build and checks, writes the MP4, then prints `total  <seconds>` and the MP4 path. If the lock exists, it prints:

```text
another render is running (remove /tmp/ecm-render.lock if not)
```

If effectcraft-cli or magick cannot start, the spawn error is printed (e.g. `spawnSync effectcraft-cli ENOENT`). Other exact errors include the final engine error and `missing ECM output`. `total` is the final length (matches the MP4); the `out` directory is created if missing. A render always releases `/tmp/ecm-render.lock` on exit.

If the spec has an `audio` block (see [scenes.md](scenes.md)), the silent MP4 is post-muxed with ffmpeg in place (via a `.tmp.mp4` + rename): bed looped to full length with fade-in/out, sparse sfx delayed to their resolved times, mixed, loudness-normalized, and muxed with `-c:v copy`. `render` prints `audio: muxed N sfx + bed` or `audio: none` before the MP4 path; a mux failure prints `audio mux failed: ...` and exits 1.

### `new`

```sh
node bin/ecm.mjs new reel spec.json
```

Writes a starter spec for the named theme. Creates a minimal spec with one `hook`, one `stat`, and one `outro` scene, then validates it. Prints the output path on success. The file is written to `out` or to `<theme>.json` in the current directory.

### `themes`

```sh
node bin/ecm.mjs themes
node bin/ecm.mjs themes --json
```

Prints one tab-separated line per theme: id, label, align, base, ink, accent, display font, motifs, fx. With `--json`, prints the whole `themes.json` object instead.

### `slides`

```sh
node bin/ecm.mjs slides deck.json --out deck-slides/
```

Renders one PNG per slide at the template's size. See [templates.md](templates.md) for deck spec shape and field descriptions.

## Machine safety

Run only one EffectCraft engine process at a time. Prefix runs with:

```sh
taskpolicy -b nice -n 19 node bin/ecm.mjs check examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs preview examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs render examples/hemat.json
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

The generated script uses PostScript font names, including `HelveticaNeue-CondensedBlack`, `HelveticaNeue-Medium`, `Inter-ExtraBold`, `Inter-Medium`, `JetBrainsMono-Medium`, `Montserrat-ExtraBold`, `Montserrat-SemiBold`, `DINCondensed-Bold`, `AvenirNextCondensed-DemiBold`, `AvenirNext-Medium`, `AvenirNext-Regular`, `AvenirNext-DemiBold`, `AvenirNext-Bold`, and `PlayfairDisplayRoman-Bold`. `PlayfairDisplay-Bold` and `Inter-Regular` do not resolve.

## Pitfalls (verified)

- Layer 1 is the top of the stack. `moveToEnd()` puts a layer behind the bg, where it is invisible, so use `a.moveAfter(ref)`.
- On shape layers, `L.property("Scale")` resolves to the vector group. Use `L.transform.*` instead.
- `setValueAtTime` returns no key index. Read `prop.numKeys` right after the call.
- Scale values are vec3. The Scale matchName is `ADBE Scale`.
- The text selector Units default is percent. `setValue(2)` switches it to index units.
- Unknown fonts silently fall back to the default. Detect this by comparing measured widths.
- The montage default label font is missing, so pass `-font /System/Library/Fonts/Helvetica.ttc`.
- `sourceRectAtTime` reports stroked shapes about 13 px wider per side.
- A static opacity is overwritten by any later keyed animation that starts from a hard-coded value.
- CLI errors appear as `file:line:col: message` on stderr.

# CLI reference

`ecm.mjs` is a zero-dependency Node script. Run it from any working directory as `node bin/ecm.mjs <command> <spec>`.

## Commands

### `check`

```sh
node bin/ecm.mjs check examples/hemat.json
```

Validates the JSON without starting EffectCraft. It prints one line per scene, such as `1  hook  2.67`, followed by `total  13.33`. Validation errors print to stderr and the command exits 1. Exact validation messages include:

- `spec: must be an object`
- `theme: unknown "nope" (reel, pitch, infopop, kinetik, tenang, edukasi)`
- `out: must be a .mp4 path`
- `scenes: must be a non-empty array`
- `scene 1 (chart): type unknown`
- `scene 1 (hook): text required`
- `scene 1 (kinetic): lines must be 1–6 non-empty strings`
- `scene 1 (stat): value must be a number`
- `scene 1 (stat): value must be below 1e15`
- `scene 1 (bars): items must be 2–6 of {label, value ≥ 0}`
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

### `preview`

```sh
node bin/ecm.mjs preview examples/hemat.json
```

Validates, builds the EffectCraft project, renders one frame per scene, checks for blank frames, and writes a contact sheet next to the spec. It prints the sheet path. Exact pipeline errors include `effectcraft-cli failed to start`, `missing ECM output`, `scene 1 (hook): blank check failed: ...`, and `scene 1 (hook): renders blank at 2.5s`. Generated engine errors retain the `file:line:col: message` format on stderr after the source location is removed from the displayed message. Examples from the smoke cases include:

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

Other exact errors include `effectcraft-cli failed to start`, the final engine error, and `missing ECM output`. A render always releases `/tmp/ecm-render.lock` on exit.

## Machine safety

Run only one EffectCraft engine process at a time. Prefix runs with:

```sh
taskpolicy -b nice -n 19 node bin/ecm.mjs check examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs preview examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs render examples/hemat.json
```

`preview` is not locked. Never run it while a render is in progress. Keep render and preview work sequential.

## Raw EffectCraft CLI idioms

These commands are useful for edits outside the pipeline. The project file is passed as the final argument where shown:

```sh
effectcraft-cli get S1_hook text text/sourceText --json project.ecproj
effectcraft-cli get S4_stat value text/sourceText --time 2 --json project.ecproj
# JSON expression reads include the evaluated field:
node -e 'process.stdout.write(JSON.parse(process.argv[1]).evaluated)' "$value"
effectcraft-cli props Main '#2' --flat
effectcraft-cli set Main '#2' transform/opacity 0 --time 0 project.ecproj --save
effectcraft-cli render-frame project.ecproj --time 2.5 --max-side 480 --out frame.png --json
effectcraft-cli script FILE.jsx --empty --save-as project.ecproj
```

The plan verifies that expression reads can be inspected through the JSON `evaluated` field. The generated script uses PostScript font names, including `HelveticaNeue-CondensedBlack`, `HelveticaNeue-Medium`, `Inter-ExtraBold`, `Inter-Medium`, `JetBrainsMono-Medium`, `Montserrat-ExtraBold`, `Montserrat-SemiBold`, `DINCondensed-Bold`, `AvenirNextCondensed-DemiBold`, `AvenirNext-Medium`, `AvenirNext-Regular`, `AvenirNext-DemiBold`, `AvenirNext-Bold`, and `PlayfairDisplayRoman-Bold`. `PlayfairDisplay-Bold` and `Inter-Regular` do not resolve.

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

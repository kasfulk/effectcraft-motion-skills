# Scene reference

## Spec-level fields

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `theme` | yes | string | Must name a key in `themes.json` | Unknown values produce `theme: unknown ...`. |
| `scenes` | yes | array | Non-empty array | Contains scene objects. |
| `transition` | no | string | `cut` (default), `fade`, `wipe`, `slide`, `dip`, `whip`, `fold`, `maskWipe`, `pageTurn`, `zoom`, `glitch`, `dipSeed`, `colorShift` | Default entrance transition for every scene after the first. Unknown values error. |
| `out` | no | string | Must be a `.mp4` path | Resolved relative to the spec file. Without it, output uses the spec basename plus `.mp4`. |

## Shared scene fields

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `type` | yes | string | One of `hook`, `kinetic`, `stat`, `bars`, `donut`, `steps`, `compare`, `quote`, `outro`, `counter`, `dotgrid`, `dial`, `orbit`, `cards`, `timeline`, `particles`, `zoom`, `model`, `custom` | Unknown values produce `type unknown`. |
| `title` | no | string | String when present | Used by scene layouts that support a title. |
| `bg` | no | string | `base`, `ink` or `accent` | Default is the theme base color. |
| `duration` | no | number | `1–15` | Seconds; explicit durations are not scaled. |
| `fx` | no | string array | Preset names from [fx.md](fx.md) | Also allowed at spec level; both lists apply. |
| `atmosphere` | no | string | `none`, `glow`, `grain`, `full` | Overrides the theme's `motion.atmosphere` for this scene. |
| `elements` | no | string array | Names from `flash`, `rays`, `fog`, `particles`, `cracks`, `lightning`, `fire`, `water` | Decorative elements layered over the scene. |
| `emphasis` | no | string | Non-empty string; occurs case-insensitively in main text | Applies to `hook`, `quote`, `outro`, and `kinetic` lines. |
| `layout` | no | string | Per type, see below | Overrides the theme's `layouts[type]`. Unknown values error and list the valid ones. |
| `transition` | no | string | `cut` (default), `fade`, `wipe`, `slide`, `dip`, `whip`, `fold`, `maskWipe`, `pageTurn`, `zoom`, `glitch`, `dipSeed`, `colorShift` | Entrance transition into this scene. Unknown values error. On the first scene it is accepted but ignored. |

Valid `layout` values, and the default when neither the scene nor the theme sets one:

| type | layouts | default |
|---|---|---|
| `hook` | `center`, `split`, `bottom` | `center` |
| `kinetic` | `slide`, `mask`, `stagger`, `morph`, `world` | `slide` |
| `quote` | `center`, `rule`, `card` | `center` |
| `stat` | `center`, `left`, `split`, `ring` | `center` |
| `bars` | `vertical`, `horizontal`, `race`, `lollipop` | `vertical` |
| `donut` | `ring`, `gauge`, `multi` | `ring` |
| `steps` | `list`, `timeline`, `cards` | `list` |
| `compare` | `stack`, `split` | `stack` |
| `outro` | `center`, `pill`, `handle` | `center` |

A scene's own `layout` always wins. Otherwise the first scene of a type uses the theme's
`layouts[type]` pin (or the default above), and each later scene of that same type rotates
one step through its layout list. A reel with three `stat` scenes gets three different
compositions instead of the same one three times.

## `hook`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `text` | yes | string | Non-empty string | Large headline. |

## `kinetic`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `lines` | yes | string array | `1–6` non-empty strings | Lines enter one by one. |
| `title` | no | string | String when present | Adds the scene title layout. |
| `emphasis` | no | string | Must occur within one line | Highlights matching text. |

## `stat`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite; `|value| < 1e15` | Counts up with `fmtID`. |
| `label` | no | string | String when present | Displayed below the value. |
| `prefix` | no | string | String when present | Prepended to the formatted value. |
| `suffix` | no | string | String when present | Appended to the formatted value. |

## `bars`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `items` | yes | object array | `2–6` of `{label, value ≥ 0}`; at least one value must be `> 0` | Bars use each item's value and label. |
| `items[].value` | yes | number | Finite, `≥ 0`, `< 1e15` | Determines bar height and displayed number. |
| `highlight` | no | integer | `0–<items.length>` | Highlighted bar gets the accent treatment. |
| `title` | no | string | String when present |  |

## `donut`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite, `0–100` | Percentage and trim-path amount. |
| `label` | no | string | String when present | Displayed below the ring. |

## `steps`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `items` | yes | string array | `1–5` non-empty strings | Numbered list with staggered entrance. |
| `title` | no | string | String when present |  |

## `compare`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `left` | yes | object | `{title, points: up to 4 strings}` | First comparison card. |
| `right` | yes | object | `{title, points: up to 4 strings}` | Second comparison card. |
| `left.title`, `right.title` | yes | string | A string | The validator does not require non-empty text. |
| `left.points`, `right.points` | yes | string array | Array, at most `4` strings | Points are rendered in the card. |

## `quote`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `text` | yes | string | Non-empty string | Quote text. |
| `source` | no | string | String when present | Optional attribution. |
| `emphasis` | no | string | See shared fields |  |
| `bg`, `duration`, `title` | no | string / number | See shared fields | `title` is accepted but not used by the quote builder. |

## `outro`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `text` | yes | string | Non-empty string | Closing line. |
| `cta` | no | string | String when present | Optional call to action. |
| `emphasis` | no | string | See shared fields |  |
| `bg`, `duration`, `title` | no | string / number | See shared fields | `title` is accepted but not used by the outro builder. |

## `counter`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite | Counts up from `from` (default `0`). |
| `prefix`, `suffix` | no | string | String when present | Wrapped around the formatted value. |
| `label` | no | string | String when present | Displayed below the value. |
| `from` | no | number | Finite | Starting value; default `0`. |
| `curve` | no | string | `ease` or `flicker` | Counting curve; default `ease`. |
| `race` | no | object | `{to, label?}` | Optional race bar under the counter. |

## `dotgrid`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `count` | yes | number | `1–200` | Number of lit dots. |
| `cols`, `rows` | no | number | `1–40` | Grid dimensions; builder clamps to `21×18`. |
| `order` | no | string | `row`, `wave`, `spiral` | Lighting order; default `row`. |
| `shape` | no | string | `dot`, `bead`, `square` | Dot shape; default `dot`. |
| `missing` | no | number array | Indices | Dots that stay dim. |
| `label` | no | string | String when present | Label above the grid. |

## `dial`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite | Needle value. |
| `max` | no | number | Finite | Scale maximum; default `24`. |
| `marks` | no | number | `2–60` | Tick count; default `12` for `clock`, `24` otherwise. |
| `labels` | no | string array | Up to `marks` | Tick labels. |
| `label` | no | string | String when present | Caption below the dial. |
| `kind` | no | string | `clock`, `gauge`, `sun` | Dial style; default `gauge`. |

## `orbit`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `rings` | yes | object array | `1–5` of `{r, count 1–12, speed}` | Orbiting rings. |
| `centre` | no | string | `dot`, `word`, `none` | Centre element; default `dot`. |
| `centreText` | no | string | String when present | Text when `centre` is `word`. |
| `tilt` | no | number | `0–1` | Vertical squash of the orbit ellipse; default `0.55`. |
| `settleAt` | no | number | Seconds | When the orbit settles. |

## `cards`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `cards` | yes | object array | `1–9` of `{text, sub?}` | Card contents. |
| `cols` | no | number | `1–3` | Grid columns; default `3`. |
| `order` | no | string | `row`, `random` | Entrance order; default `row`. |
| `flip` | no | boolean | — | Flip-in entrance. |
| `checks` | no | number array | Card indices | Draw a check mark on those cards. |
| `stagger` | no | number | Seconds | Delay between cards. |

## `timeline`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `span` | yes | object | `{start, end, unit}` | Axis range and unit label. |
| `events` | yes | object array | `1–8` of `{at: 0–1, label}` | Events along the axis. |
| `runner` | no | string | `light`, `none` | Animate a runner along the axis. |
| `fillTo` | no | number | `0–1` | Fill the axis to this fraction. |

## `particles`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `count` | no | number | `1–120` | Particle count; default `120`. |
| `target` | no | string | `circle`, `word`, `none` | What the particles gather into. |
| `text` | no | string | String when present | Word when `target` is `word`. |
| `gatherAt` | no | number | Seconds | Gather start. |
| `scatterAt` | no | number | Seconds | Scatter start. |
| `drift` | no | number | Pixels | Idle drift. |

## `zoom`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `levels` | yes | object array | `1–5` of `{label, kind, n}` | Zoom levels. |
| `levels[].kind` | yes | string | `dot`, `grid`, `rings` | Level graphic. |
| `levels[].n` | no | number | Finite | Element count for `grid`/`rings`. |
| `speed` | no | number | `0.2–3` | Level speed; default `1`. |
| `holdAt` | no | number | Seconds | Hold per level; default `0.8`. |

## `model`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `src` | yes | string | `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx` | Bare name resolves to `assets/3d/<name>`; a path with `/` resolves relative to the spec. |
| `scale` | no | number | `1–400` | Uniform percent; default `55` frames a unit-sized model. |
| `spin` | no | number | `-1440–1440` | Total degrees of Y rotation over the scene, eased; default `0`. `360` is one turn per scene. |
| `tilt` | no | number | `-90–90` | Static X rotation; default `-22`. |
| `position` | no | number pair | Comp pixels | Default `[540, 960]`. |
| `light` | no | number | `0–2000` | Parallel key intensity; default `100`. |
| `fill` | no | number | `0–2000` | Ambient fill intensity; default `25`. |

The comp switches to Advanced 3D for the whole scene. Model colour travels inside the file
(`baseColorFactor`), so recolouring means re-exporting. Full detail: [3d.md](3d.md).

## `custom`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `jsx` | yes | string | Non-empty string | Function body receiving `(comp, theme, scene, dur)`. Return its settle time. If the return value is not a number, the default is `0.6 * dur`. |

Example from `examples/hostile.json`:

```js
rect(comp, {x:CX, y:850, w:400, h:400, fill:theme.colors.accent, radius:24});
```

### Custom helpers

The generated JSX exposes these core signatures:

```js
function text(comp, str, o)
function rect(comp, o)
function ellipse(comp, o)
function ring(comp, o)
function animate(prop, t0, t1, v0, v1, easing)
function revealText(layer, t0, dur, easing)
function colorRange(layer, start, end, hex)
function fmtID(value, decimals)
function counterExpr(t0, t1, value, prefix, suffix)
function onColor(theme, bgHex)
var SAFE = {x0:90, x1:940, y0:250, y1:1450}
var CX = 515
```

`text` fits and wraps text. `rect` creates a rectangle. `ellipse` creates a circle. `ring` creates a stroked ellipse and trim-path handle. `animate` adds eased keyframes; the `pop` easing adds a squash-and-stretch key on scale - the moving axis overshoots 12 % and, when it is the only axis moving, the perpendicular one dips 6 %. `revealText` reveals text by selector offset, with each word rising 76 px and overshooting 9 px past the baseline before it settles. `colorRange` applies a text fill-color range. `fmtID` formats numbers with Indonesian separators. `counterExpr` returns a live counting Source Text expression. `onColor` chooses the higher-contrast base or ink color. `SAFE` defines content bounds, and `CX` is the content center.

Content must stay inside `SAFE` (`x 90–940`, `y 250–1450`). Layers with comment `bg` or `decor` are exempt. A `text` call that still does not fit at its minimum size throws `text too long`.

## Transitions

By default scenes cut hard. A spec-level `transition` sets the default entrance for every scene after the first; a scene-level `transition` overrides it for that scene.

| value | length | behavior |
|---|---|---|
| `cut` | — | Hard cut (default; current behavior). |
| `fade` | 0.35 s | Crossfade: the incoming scene fades in over the outgoing one. |
| `wipe` | 0.4 s | Directional `Linear Wipe` of the incoming scene; angle follows `theme.align` (left: 0°, center: 90°). |
| `slide` | 0.45 s | Incoming scene slides in — from the right on `left` themes, from the bottom on `center` themes. |
| `dip` | 0.4 s | Dip through a solid of `theme.colors.ink` across the cut. |
| `whip` | 0.55 s | Whip pan: both scenes slide a full frame width with a horizontal directional blur that exists only while they move. |
| `fold` | 0.9 s | Fold the outgoing scene away like a panel. |
| `maskWipe` | 0.9 s | Mask-based wipe with a soft edge. |
| `pageTurn` | 1.0 s | Page-turn reveal. |
| `zoom` | 0.7 s | Zoom through the cut. |
| `glitch` | 0.7 s | RGB-split glitch cut. |
| `dipSeed` | 1.0 s | Dip through a seed/ink shape. |
| `colorShift` | 1.4 s | Colour-shift crossfade. |

Lengths are fixed and not user-tunable.

```json
{
  "theme": "reel",
  "transition": "fade",
  "scenes": [
    {"type": "hook", "text": "Ubah cara melihat uang"},
    {"type": "stat", "value": 72, "suffix": "%"},
    {"type": "outro", "text": "Mulai hari ini.", "transition": "dip"}
## Audio

Optional `audio` block at spec level. Audio is never imported into the EffectCraft project: `render` renders the silent video, then muxes the mix with ffmpeg into the final MP4. Without `audio`, output is unchanged.

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `audio.bed` | one of bed/sfx | string | Resolvable name | Name under `assets/sfx/beds` (no extension) or a path relative to the spec. Looped to the video length. |
| `audio.bedGain` | no | number | `-40–0` dB | Default `-20`. |
| `audio.sfx` | one of bed/sfx | array | At most 12 | Sparse sound effects. |
| `audio.sfx[].name` | yes | string | Resolvable name | First existing of `assets/sfx/<name>.{wav,m4a,mp3,ogg}`, `assets/sfx/beds/<name>.{...}`, else a path relative to the spec. |
| `audio.sfx[].at` | one of at/scene | number | `0–total` seconds | Absolute time. |
| `audio.sfx[].scene` | one of at/scene | integer | `1–scenes.length` | Plays at that scene's start; mutually exclusive with `at`. |
| `audio.sfx[].gain` | no | number | `-40–0` dB | Default `-6`. |

Resolution errors name the path: `audio.sfx[0]: cannot find "nope" (...)`. Craft rules: two sfx closer than 0.5 s → `audio.sfx[3] overlaps audio.sfx[2] (0.5 s minimum)`; average density above one sfx per 2.5 s → `audio.sfx: too dense (...)`; `at` past the end → `audio.sfx[0]: at 99s is past the end (13.33s)`.

Mix: bed looped with `-stream_loop -1 -t <total>`, volume `bedGain`, 0.3 s fade-in, 0.8 s fade-out; each sfx delayed via `adelay` to its resolved time and gained; `amix` then a single-pass `loudnorm=I=-18:TP=-1.5:LRA=11`; muxed with `-c:v copy -c:a aac -b:a 160k -shortest` onto the untouched video stream. `check` prints the resolved audio plan (bed name + duration, each sfx with resolved time) after the scene table. `render` prints `audio: muxed N sfx + bed` or `audio: none`.

Example (`examples/hemat-audio.json`):

```json
"audio": {
  "bed": "rain",
  "bedGain": -24,
  "sfx": [
    {"at": 0.2, "name": "impactBell_heavy_000", "gain": -10},
    {"scene": 2, "name": "keypress-001", "gain": -8},
    {"scene": 4, "name": "chips-collide-1"}
  ]
}
```

### Duration and overlap

Scene start times and the total video length are unchanged: a transition overlaps the outgoing scene instead of adding time. The incoming scene's precomp layer starts its transition length early, and that scene's precomp is built `transition length` longer than its nominal duration so the layer never outlives its own content — otherwise the tail renders black. The outgoing layer's outPoint is extended by the same amount, so `check`, the printed `total`, and the rendered MP4 all still agree. Required holds (`settle + 1.5 s`) and `duration too short` errors are unaffected — the overlap is taken from time that was already there, never from the hold. The outgoing scene's content fade-out (`exitAll`) spans the whole extended comp, so the incoming layer crossfades over live content instead of over an empty background.

### Camera

Every scene layer in `Main` gets a slow camera move across its whole span, so no frame is locked. The move cycles by scene index so two shots in a row never move the same way:

| `j % 5` | Move |
|---|---|
| 0 | push in `104% → 112%`, drift right to `(574, 936)` |
| 1 | pull out `112% → 106%`, drift left to `(506, 984)` |
| 2 | push in `106% → 112%`, crane up to `(540, 912)` |
| 3 | pull out `112% → 107%`, drift right to `(566, 960)` |
| 4 | orbit the centre on a 12 px circle |

The pan is capped to the slack the move actually has, so a pull-out cannot outrun its own
coverage: `cap = 540 × (netMin − 1) × 0.9`, which is 34 px at the 107 % floor (96 % of true slack).

6% is the floor for a **push-in**: below that the move is invisible on a phone. A pull-out cannot
go that deep — the shallower the end scale, the smaller the pan slack the move has to offer, so
the pull-outs above sit at 5.7 % and 4.7 % with their pans capped. The move scales the precomp, so content must stay inside `SAFE` — at 112% the frame crops 58 px horizontally and 103 px vertically, and the drift stays inside that margin.

The camera is two nulls, one property per level, so nothing overwrites anything:

| level | carries |
|---|---|
| `camRoot` | the impact shake (position) and the drift breath (scale) |
| `cam` | the slow pan and push above |
| scene layer | its transition, plus the `1.07 × s0 / min(s0, s1)` headroom |

**Shake** fires on `cut` and `dip` entrances only: 16 px on x and 9.6 px on y, decaying to rest in 0.33 s, peaking 0.10 s after the cut so it lands on content rather than on the incoming scene's empty first frames. Transitions that already carry motion (`whip`, `fold`, `zoom`, the wipes) get none.

**Drift** is a 1.5 % breath over a 2.4 s period on `camRoot`'s scale. It never goes below 100 %: during a whip the two scenes have different `camRoot`s, and a scene scaled under 100 % would leave a gap at the seam.

**Orbit** sweeps the camera's `position` around a 12 px circle, so the world circles the frame centre and returns to it.

### Headroom

The engine fits each scene precomp to exactly 100 % net coverage, which leaves no slack at all: with `cam` at 106 % and the layer auto-fitted to `100/106`, a 16 px shake blacked out all four edges and a 12 px orbit did the same.

`bin/ecm.mjs` therefore multiplies the fitted layer scale by `1.07 * s0 / min(s0, s1)` after `layers.add`. Keying off the **smallest** scale matters: a pull-out ends at its lowest coverage, which is also where its pan is widest. A flat 1.08 left a `112 → 104` pull-out at 100.3 % net at the end, and its 36 px pan opened a 27 px black band down the right edge.

Budget the slack before adding another camera offset:

```
slack = 1080 * (1 - 1 / (netScale / 100)) / 2
```

107 % is 35 px horizontally and 63 px vertically — not `540 × (net − 1)` (38 px), which overstates
the margin because the visible window shrinks by the reciprocal, not by the delta. The pan cap
`(netMin − 1) × 0.9 × 540` = 34 px is therefore 96 % of true slack, not 90 %. `SAFE` starts 90 px in, so the extra zoom never crops content.

## Duration and hold

Without an explicit `duration`, `durationOf` computes `1.2 + 0.37 * words + 0.25 * dataItems`, clamps it to `2.5–7`, multiplies by the theme `durationScale`, and rounds to whole frames at 30 fps. Words include string fields except `type`, `bg`, `emphasis`, and `jsx`; `dataItems` is `items.length` for `bars` and `steps`, `lines.length` for `kinetic`, and the total point count for `compare`.

The generated scene builder returns its settle time. The pipeline requires `settle + 1.5 s`, rounded up to a frame. If an explicit duration is too short, it throws `duration too short, needs ≥ Ns`. An automatic duration is extended to the required hold instead. `check` prints the estimate before this extension; `render` prints the final total, which matches the MP4.

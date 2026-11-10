# Scene reference

## Spec-level fields

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `theme` | yes | string | Must name a key in `themes.json` | Unknown values produce `theme: unknown ...`. |
| `scenes` | yes | array | Non-empty array | Contains scene objects. |
| `out` | no | string | Must be a `.mp4` path | Resolved relative to the spec file. Without it, output uses the spec basename plus `.mp4`. |

## Shared scene fields

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `type` | yes | string | One of `hook`, `kinetic`, `stat`, `bars`, `donut`, `steps`, `compare`, `quote`, `outro`, `custom` | Unknown values produce `type unknown`. |
| `title` | no | string | String when present | Used by scene layouts that support a title. |
| `bg` | no | string | `base`, `ink` or `accent` | Default is the theme base color. |
| `duration` | no | number | `1–15` | Seconds; explicit durations are not scaled. |
| `fx` | no | string array | Preset names from [fx.md](fx.md) | Also allowed at spec level; both lists apply. |
| `emphasis` | no | string | Non-empty string; occurs case-insensitively in main text | Applies to `hook`, `quote`, `outro`, and `kinetic` lines. |

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

`text` fits and wraps text. `rect` creates a rectangle. `ellipse` creates a circle. `ring` creates a stroked ellipse and trim-path handle. `animate` adds eased keyframes. `revealText` reveals text by selector offset. `colorRange` applies a text fill-color range. `fmtID` formats numbers with Indonesian separators. `counterExpr` returns a live counting Source Text expression. `onColor` chooses the higher-contrast base or ink color. `SAFE` defines content bounds, and `CX` is the content center.

Content must stay inside `SAFE` (`x 90–940`, `y 250–1450`). Layers with comment `bg` or `decor` are exempt. A `text` call that still does not fit at its minimum size throws `text too long`.

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

## Duration and hold

Without an explicit `duration`, `durationOf` computes `1.2 + 0.37 * words + 0.25 * dataItems`, clamps it to `2.5–7`, multiplies by the theme `durationScale`, and rounds to whole frames at 30 fps. Words include string fields except `type`, `bg`, `emphasis`, and `jsx`; `dataItems` is `items.length` for `bars` and `steps`, `lines.length` for `kinetic`, and the total point count for `compare`.

The generated scene builder returns its settle time. The pipeline requires `settle + 1.5 s`, rounded up to a frame. If an explicit duration is too short, it throws `duration too short, needs ≥ Ns`. An automatic duration is extended to the required hold instead. `check` prints the estimate before this extension; `render` prints the final total, which matches the MP4.

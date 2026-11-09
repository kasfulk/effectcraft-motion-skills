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
| `title` | no | string | No validation limit | Used by scene layouts that support a title. |
| `bg` | no | string | `base`, `ink` or `accent` | Default is the theme base color. |
| `duration` | no | number | `1–15` | Seconds; explicit durations are not scaled. |
| `emphasis` | no | string | Non-empty string; occurs case-insensitively in main text | Applies to `hook`, `quote`, `outro`, and `kinetic` lines. |

## `hook`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `text` | yes | string | Non-empty string | Large headline. |

## `kinetic`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `lines` | yes | string array | `1–6` non-empty strings | Lines enter one by one. |
| `title` | no | string | No validation limit | Adds the scene title layout. |
| `emphasis` | no | string | Must occur in the joined lines | Highlights matching text. |

## `stat`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite; `|value| < 1e15` | Counts up with `fmtID`. |
| `label` | no | string | No validation limit | Displayed below the value. |
| `prefix` | no | string | No validation limit | Prepended to the formatted value. |
| `suffix` | no | string | No validation limit | Appended to the formatted value. |

## `bars`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `items` | yes | object array | `2–6` of `{label, value ≥ 0}`; at least one value must be `> 0` | Bars use each item's value and label. |
| `items[].value` | yes | number | Finite and `≥ 0` | Determines bar height and displayed number. |
| `highlight` | no | integer | `0–<items.length>` | Highlighted bar gets the accent treatment. |
| `title` | no | string | No validation limit |  |

## `donut`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `value` | yes | number | Finite, `0–100` | Percentage and trim-path amount. |
| `label` | no | string | No validation limit | Displayed below the ring. |

## `steps`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `items` | yes | string array | `1–5` non-empty strings | Numbered list with staggered entrance. |
| `title` | no | string | No validation limit |  |

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
| `source` | no | string | No validation limit | Optional attribution. |
| `emphasis` | no | string | See shared fields |  |
| `bg`, `duration`, `title` | no | string / number | See shared fields | `title` is accepted but not used by the quote builder. |

## `outro`

| field | required? | type | limits | notes |
|---|---|---|---|---|
| `text` | yes | string | Non-empty string | Closing line. |
| `cta` | no | string | No validation limit | Optional call to action. |
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

## Duration and hold

Without an explicit `duration`, `durationOf` computes `1.2 + 0.37 * words + 0.25 * dataItems`, clamps it to `2.5–7`, multiplies by the theme `durationScale`, and rounds to whole frames at 30 fps. Words include string fields except `type`, `bg`, `emphasis`, and `jsx`; `dataItems` is `items.length` for `bars` and `steps`, `lines.length` for `kinetic`, and the total point count for `compare`.

The generated scene builder returns its settle time. The pipeline requires `settle + 1.5 s`, rounded up to a frame. If an explicit duration is too short, it throws `duration too short, needs ≥ Ns`. An automatic duration is extended to the required hold instead.

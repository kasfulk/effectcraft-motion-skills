# Effect presets (`fx`)

`fx` is an array of preset names. Put it at spec level (every scene) or per scene; both lists apply. Order does not matter. Presets use the theme colors, so they follow the theme.

```json
{"theme":"kinetik","fx":["grain","vignette"],"scenes":[
  {"type":"hook","text":"Gaji naik, tabungan tetap?","fx":["grid","rgbIn"]},
  {"type":"stat","value":72,"suffix":"%","fx":["liquid","glow"]}]}
```

| preset | layer | engine effect | look | cost (ms/frame, 1080×1920) |
|---|---|---|---|---|
| `grid` | background | Grid, Anchor expression | thin `muted` grid drifting diagonally | 45 |
| `liquid` | background | 4-Color Gradient + Turbulent Displace | slow `accent`/`muted` color blobs | 115 |
| `paper` | background | Fractal Noise, Overlay 12% | paper texture | 250 uncached, cached after frame 1 |
| `grain` | adjustment | Noise 5%, mono | film grain over the whole scene | not measured |
| `vignette` | adjustment | Vignette 35 | darker corners | not measured |
| `glow` | hero text | Glow, A&B = `accent` | accent halo around the hero text | 5 |
| `rgbIn` | hero text | VR Chromatic Aberrations | RGB split that settles to 0 in 0.5 s | 2 |
| `blurIn` | hero text | Gaussian Blur | blur 40→0 in 0.5 s | not measured |
| `sweep` | copy of hero text | Light Sweep, Cutout | `accent` shine crosses the letters after they settle | 30 |
| `float` | hero text | position expression | ±6 px sine bob | 0 |
| `glitch` | adjustment | VR Digital Glitch | glitch burst for the first 0.45 s | not measured |

Hero text = layers named `text`, `value`, `title`, `line1`–`line6`. Scenes without them (`bars`, `steps`, `donut`, `compare`) only get background and overlay presets.

## Rules

- **Two or three presets per scene.** One background + one text effect is usually enough.
- **Mind render time.** The full five-scene demo with every preset rendered in 200 s; SKILL.md quotes about 1 min without `fx`. `liquid` and `paper` cost the most.
- **Tested on `kinetik` only.** On a light theme, preview first: `glow` and `liquid` use `accent`/`muted` and may wash out on a pale base.
- **Read the sheet.** Entrance presets (`rgbIn`, `blurIn`, `glitch`) are finished by the sheet frame. Check them with `effectcraft-cli render-frame --comp Main --time <scene start + 0.3>`.

## Port map from effectcraft-skills-repository

The downloaded repo (`~/Downloads/effectcraft-skills-repository`) calls `add_effect`, `set_property` and `add_keyframe`, which effectcraft-cli 0.23 does not have, and AE effect names. Its recipes map to the engine like this:

| repo name | engine name (`addProperty`) | used by |
|---|---|---|
| FourColorGradient | `4-Color Gradient` | `liquid` |
| TurbulenceDisplace | `Turbulent Displace` | `liquid` |
| Grid | `Grid` | `grid` |
| FractalNoise + Tint | `Fractal Noise` | `paper` |
| Noise | `Noise` | `grain` |
| Glow | `Glow` (`VR Glow` is a different effect) | `glow` |
| RGBSplit / ShiftChannels | `VR Chromatic Aberrations` | `rgbIn` |
| CCLightSweep | `Light Sweep` | `sweep` |
| Ramp | `Gradient Ramp` | — |
| Particular | `Particle Emitter 2D` / `Particle Playground` | — |
| TextAnimator, TrimPaths, ShapeRepeater | shape/text properties, not effects (`ADBE Text Animator`, `ADBE Vector Filter - Trim`, `ADBE Vector Filter - Repeater`) | `revealText`, `ring` in core.jsx |

List every engine effect and its parameters: `effectcraft-cli exec effect.list --params '{"filter":"blur"}' --json`. In JSX, set a parameter by its display name: `layer.property('Effects').addProperty('Glow').property('Glow Radius').setValue(28)`.

## Verified pitfalls

- `Echo` on an adjustment layer leaves no trail. Put it on the moving layer itself.
- `Light Sweep` with reception `Add`/`Composite` paints a beam across the whole frame. `Cutout` keeps the light inside the glyphs but removes the rest, so `sweep` puts it on a duplicate layer.
- Grid and 4-Color Gradient default to blend mode `None`, which replaces the layer with the effect output (the background color disappears). Set `Blending Mode` to 2 (`Normal`) to draw over it.
- Popup values in JSX are one-based (`Glow Colors` 2 = `A & B Colors`). `effect.list` options are zero-based.

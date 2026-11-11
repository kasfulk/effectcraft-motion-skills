# Free asset sources

Where to get fonts, SVG, 3D models, effects and sound that this skill can **actually ingest**.
Free only — nothing here needs a card. The license column is what you honour when the asset ships
inside a video, not decoration.

## What the engine can take

Verified 2026-11-11 against `effectcraft-cli`:

| asset | ingest path | proof |
|---|---|---|
| Font | installed as a system font, PostScript name declared in `assets/fonts/fonts.json`; `bin/ecm fonts --install` downloads **Google Fonts only** | `bin/ecm fonts --install`, `exec text.fonts` |
| SVG | `edit.pasteSvg` → one **editable vector shape layer** (no raster) | `exec edit.pasteSvg` → `{"layer":2,"skipped":[]}`; `props` → `vectors:yes source:none` |
| 3D model | `.glb`/`.gltf` only, through a `model` scene | [3d.md](3d.md) |
| Effect preset | `.ecpreset` via `anim.applyPreset`; 68 built-in via `anim.applyBuiltinPreset`; `.aep` via `file.importAep`; Lottie via `file.importLottie` | `exec anim.builtinPresets` → 68 |
| Sound | file under `assets/sfx/` or `assets/sfx/beds/`, referenced by bare name | [sound.md](sound.md) |

**Not ingestible, no matter how free:** `.ffx` (the engine has no ffx handler — `exec anim.applyPreset`
only lists `.ecpreset`), and AE effect **plugins** (Optical Flares, Trapcode, Sapphire, Deep Glow).
308 stock effects is the hard ceiling: `exec effect.list --json`.

## Fonts

`fonts --install` only knows the Google Fonts css2 API. Anything else is manual:

```bash
curl -L -o ~/Downloads/Gilroy-Bold.ttf "https://…"          # any foundry
cp ~/Downloads/Gilroy-Bold.ttf ~/Library/Fonts/              # Linux: ~/.local/share/fonts
```

then one entry in `assets/fonts/fonts.json`:

```json
"Gilroy-Bold": {"family": "Gilroy", "style": "Bold", "weight": 700,
                "category": "display", "file": "Gilroy-Bold.ttf"}
```

The key is the **PostScript name**, and that is what the spec uses: `"font_head":"Gilroy-Bold"`.
Confirm the name the engine sees with `effectcraft-cli exec text.fonts --json` before writing it.
87 families are declared today.

| Source | Library | License | How it lands here |
|---|---|---|---|
| [fonts.google.com](https://fonts.google.com) | ~1,900 families, the whole manifest | OFL 1.1 / Apache 2.0 per family | automatic: `bin/ecm fonts --install` |
| [fontshare.com](https://www.fontshare.com) | 100+ display and text families from Indian Type Foundry | ITF Free Font License — free tier, read the page's commercial clause before shipping | download ttf → install → manifest entry |
| [fontsource.org](https://fontsource.org) | packaging of Google + other open fonts, browsable per family | inherits upstream | download the ttf from the family page, then the same manual install |
| [fonts.bunny.net](https://fonts.bunny.net) | Google Fonts mirror, no Google request | same as upstream | drop-in replacement for the css2 download |
| [theleagueofmoveabletype.com](https://www.theleagueofmoveabletype.com) | ~30 curated classics | OFL | manual |
| [velvetyne.fr](https://velvetyne.fr) | experimental display and editorial faces | per-font free license — open the font page | manual |

Free-tier caveat: display families that "feel premium" are often the ones with a license that
forbids embedding in video. Read the font page, not the download button.

## SVG, icons, illustration

`edit.pasteSvg` takes raw SVG markup and returns the new layer id plus a `skipped` array. **Read
`skipped`** — unsupported elements (filters, patterns, some gradient syntax) are dropped silently
from the layer. One SVG becomes one shape layer; every path inside it becomes a shape, so a 300-path
illustration is a render-cost mistake, not an asset.

```bash
effectcraft-cli exec edit.pasteSvg --params '{"svg":"<svg …>…</svg>","name":"ornament","comp":"Main"}'
```

| Source | Library | License | Notes |
|---|---|---|---|
| [iconify.design](https://iconify.design) | 200k+ icons across 150+ sets, copy-ready SVG | per set, mostly MIT/Apache/CC-BY | the default first stop; one set per video keeps stroke weight consistent |
| [lucide.dev](https://lucide.dev) | ~1,600 stroke icons | ISC | matches the thin-line look the `pitch`/`tenang` themes want |
| [tabler.io/icons](https://tabler.io/icons) | ~5,900 icons, two weights | MIT | good coverage of UI and finance glyphs |
| [heroicons.com](https://heroicons.com) | ~1,300 icons, outline/solid | MIT | solid variants read better at 1080 than outline |
| [svgrepo.com](https://www.svgrepo.com) | 500k+ vectors, filter by license | mixed CC0 / CC-BY / MIT | filter to CC0 before downloading |
| [openclipart.org](https://openclipart.org) | 160k+ public-domain drawings | CC0 | crude but genuinely free; good for texture and props |
| [undraw.co](https://undraw.co) | recolorable illustrations | unDraw license, commercial, no attribution | recolor before export; ship as PNG-free vector only for simple ones |
| [storyset.com](https://storyset.com) | character and scene illustrations | free with attribution | attribution line must be visible — put it on the outro |
| [flaticon.com](https://www.flaticon.com) | ~16M icons | free **with** attribution | skip when any other row works; the credit line is ugly in a reel |

## 3D models

Canonical table lives in [3d-sources.md](3d-sources.md) — do not duplicate it. One thing that file
does not say: **Google Poly shut down in 2021**; [poly.pizza](https://poly.pizza) is the community
successor and the reason "a library like Google, but for 3D" has an answer here at all.

## Effects and motion presets

Two free layers already exist inside the engine, and they beat every download below:

- `exec anim.builtinPresets` — 68 presets: 23 Transitions, 23 Backgrounds (Aurora Veil, Water
  Caustics, Bokeh Drift, Hex Mosaic, Spotlight Floor…), 22 Behaviors. Both an id and a display name
  are accepted, and `layers` removes the "select a layer first" refusal that a bare command hits —
  selection is not saved with the project, so a reopened `.ecproj` always needs `layers`
  (verified: `{"preset":"Bokeh Drift","layers":[1]}` → `{"effects":[27,35,…],"skipped":[]}`).
- `exec effect.list --json` — all 308 stock effects with parameter metadata.

| Source | Library | License | Usable here? |
|---|---|---|---|
| [lottiefiles.com](https://lottiefiles.com) | hundreds of thousands of AE-authored animations as JSON | per asset; filter to free-for-commercial | **yes** — `file.importLottie`, the only external animation format that comes in clean |
| [mixkit.co](https://mixkit.co/free-after-effects-templates/) | free AE templates | Mixkit Free License, commercial | only if the project uses stock effects — `file.importAep --params '{"dryRun":true}'` reports what would be lost |
| [motionarray.com](https://motionarray.com) | free section, account required | per item | same `.aep` route, same plugin risk |
| [aejuice.com](https://aejuice.com/free) | free preset and transition packs | check the pack page | **no** — ships `.ffx` and plugin panels |
| [videocopilot.net](https://www.videocopilot.net) | free tutorials, presets, plugins | free | **no** — the free downloads are plugins (Optical Flares, Saber) |
| [rocketstock.com](https://www.rocketstock.com/free-after-effects-templates/) | free AE presets | free pack license | **no** — `.ffx` |

Saving your own: select the properties, `exec anim.savePreset --params '{"path":"./my.ecpreset"}'`,
reuse with `anim.applyPreset`. That is the working substitute for the `.ffx` habit.

## Sound FX and beds

Local palette and placement rules: [sound.md](sound.md). This table is where to get files the
shipped palette lacks.

| Source | Library | License | Notes |
|---|---|---|---|
| [freesound.org](https://freesound.org) | 600k+ field recordings and foley | CC0 / CC-BY per file — read the file | account needed to download; the only source worth the effort for a specific real-world hit |
| [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) | tens of thousands, organised by mood | Pixabay Content License, no attribution | fastest free route; quality varies |
| [mixkit.co/free-sound-effects](https://mixkit.co/free-sound-effects/) | curated hits, whooshes, UI | Mixkit Free License | clean, on-brand for reels |
| [zapsplat.com](https://www.zapsplat.com) | 150k+ | free **with** attribution, account | attribution line required |
| [sonniss.com/gameaudiogdc](https://sonniss.com/gameaudiogdc) | GDC bundles, tens of GB, royalty-free | royalty-free | overkill per video, unbeatable for building a personal palette |
| [freepd.com](https://freepd.com) | public-domain music for beds | CC0 | fills the bed gap `assets/sfx/beds/` does not cover |
| [bensound.com](https://www.bensound.com) | music beds | free tier requires attribution | read the tier table before shipping |
| [sound-effects.bbcrewind.co.uk](https://sound-effects.bbcrewind.co.uk) | 33k BBC archive recordings | **RemArc: personal, education, research only — not commercial** | do not put these in a client reel |

## Where the file goes, and the one rule

- Sound: `assets/sfx/<name>.ogg|wav|m4a` or `assets/sfx/beds/<name>.ogg`; the spec references the
  bare name.
- 3D: `assets/3d/<name>.glb`; the spec references the bare name.
- SVG: no file needed — paste the markup into a `custom` scene or a build step.
- Fonts: system font directory, plus the manifest entry.

Every asset committed under `assets/` gets a line in [../assets/LICENSES.md](../assets/LICENSES.md)
recording source, license and whether attribution is required. Never ship an asset whose license page
you did not open — "free download" is not a license.

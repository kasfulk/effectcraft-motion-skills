---
scope: effectcraft-motion-skills
session: 2026-11-11-234744-effectcraft-motion-skills
stage: COMPLETE
status: DONE
updated: 2026-11-11 23:52
completed: [intake, brainstorm, plan, coding, testing, verification]
current: []
next: []
---

# Free asset sources: fonts, SVG, 3D, effects, sound

Request: "tambahkan semua situs pencarian asset, baik itu fonts, SVG, 3D models, Effect, dan sound FX
tambahkan semua yang memungkinkan di project ini" → refined by the user to free sources only.

Classification: **SMALL** (documentation only, no production code, no behaviour change).

## Stage record

| Stage | Status | Why |
|---|---|---|
| BRAINSTORM | SKIPPED | scope fixed by the user: one reference doc, free sources only |
| PLAN | DONE (inline) | 5 domains; consolidate into `reference/assets.md`, cross-link instead of duplicating `3d-sources.md`/`sound.md` |
| DEEP_RESEARCH | SKIPPED | no external technical uncertainty; engine capabilities verified by command, not by reading |
| CODE_PLAN | DONE (inline) | one new file + three one-line wirings (SKILL.md, README.md, assets/LICENSES.md) |
| CODING | DONE | `reference/assets.md` written |
| CODE_REVIEW | SKIPPED | docs only; reviewed inline against verified engine output |
| TESTING | DONE | every ingest path executed, see below |
| VERIFICATION | DONE | links resolve, commands run |

## Engine facts verified this session

| Claim in the doc | Command | Result |
|---|---|---|
| SVG becomes an editable vector shape layer | `exec edit.pasteSvg` | `{"layer":2,"skipped":[]}`, then `props` → `vectors:yes source:none` |
| 68 built-in presets | `exec anim.builtinPresets` | 68 = 23 Transitions + 23 Backgrounds + 22 Behaviors |
| Named preset applies with explicit layers | `exec anim.applyBuiltinPreset --params '{"preset":"Bokeh Drift","layers":[1]}'` | `{"effects":[27,35,48,61,74,87,100],"preset":"bokehDrift","skipped":[]}` |
| `.ffx` is not supported | `exec commands --json` filtered for `ffx` | no match; only `.ecpreset`, `.aep`, `.lottie` appear |
| Lottie import exists | `exec commands --json` | `file.importLottie`, `enabled:true` |
| 308 stock effects | `exec effect.list --json` | 308 across 26 categories |
| `text.fonts` exists | `exec text.fonts --json` | `count:460` |
| 87 font families declared | `assets/fonts/fonts.json` | 87 keys |

## Link verification

27 candidate hosts probed with `curl -sIL`. Live: all except `aevideo.net` (DNS failure, dropped).
`kenney.nl`, `rocketstock.com`, `motionarray.com`, `flaticon.com`, `pixabay.com`, `zapsplat.com`,
`sonniss.com` answer 403 and `svgrepo.com` 429 to `curl` — Cloudflare bot blocking, not dead sites;
not listed in the doc as broken.

Relative links inside `reference/assets.md` all resolve: `3d.md`, `3d-sources.md`, `sound.md`,
`../assets/LICENSES.md`.

## Files touched

- `reference/assets.md` — new (fonts 6 rows, SVG 9 rows, 3D pointer, effects 6 rows, sound 8 rows)
- `SKILL.md:72` — link added to the Fields line
- `README.md:57` — link added to the reference list
- `assets/LICENSES.md` — sourcing pointer for new files

## Deliberate non-scope

- No new code in `lib/` or `bin/`; no site is fetched at build time.
- 3D tables stay in `reference/3d-sources.md`; duplicating them would create two sources of truth.
- Assets themselves are not downloaded — only the sources they come from are documented.

## Honesty pass after the first draft

- Fontshare's license page is client-rendered (691 bytes to curl), so its commercial clause could not
  be verified here. The cell was softened to "read the page's commercial clause" instead of asserting
  "commercial OK".
- Fontsource entry dropped the `bun add` route — downloading the ttf from the family page is the same
  manual install as any foundry, and one less toolchain.
- The `layers` requirement on `anim.applyBuiltinPreset` now states the reason: selection is not saved
  with the project, so it never survives a reopen.

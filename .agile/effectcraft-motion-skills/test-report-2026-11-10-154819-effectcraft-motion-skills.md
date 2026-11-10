# Test report — templates & themes port

## Unit tests
```
$ node --test test/ecm.test.mjs
ℹ tests 22
ℹ pass 22
ℹ fail 0
```
Covers: scene validation, duration estimation, theme resolution, template inheritance (template colours reach the theme, spec `colors` win), unknown template/theme errors, theme-level `fx` validation, deck validation (missing/unknown template, empty slides, missing text, emphasis match/mismatch/empty), `SLIDE_SIZES`, `buildSlidesScript` injection.

## Theme coverage (engine)
```
$ bash /tmp/ecm-port/cover.sh
checked=64 failed=0
```
All 64 ported themes build the 10-scene spec and produce a contact sheet.

## Deck renders (engine)
| deck | template | size | result |
|---|---|---|---|
| `SLIDES-DEMO.json` | `themed` | 1080×1440 | 3 PNGs, std-dev 0.112 / 0.085 / 0.083 |
| `d-plain.json` | `plain` | 1080×1440 | 2 PNGs |
| `d-graphic.json` | `graphic` | 1080×1350 | 2 PNGs |
| `emph.json` | `themed` | 1080×1440 | emphasis in accent, verified visually |

## Smoke suite
`test/smoke.sh` — extended with a deck render and an emphasis-mismatch failure case. Runs the full pipeline serially: unit tests, preview in a path with spaces, layer text round-trip, untitled-bars title absence, 6 scene themes, counter formatting, too-long text errors, compare/steps/donut opacity, custom-JSX failure modes, deck render, render lock, invalid specs, and a real MP4 probed at 1080×1920 @30 fps.

```
SMOKE_STATUS=0
```

## Typecheck / lint
No TypeScript or linter in this project. Syntax is checked by `node --check` on the generated JSX and by the engine build itself (a parse error surfaces as `scene N (type): SyntaxError`).

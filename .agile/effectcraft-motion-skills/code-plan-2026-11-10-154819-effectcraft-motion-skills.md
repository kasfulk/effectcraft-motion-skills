# Code plan — port templates & themes

## Files created
| File | Purpose |
|---|---|
| `templates.json` | 3 deck templates: `plain`, `themed`, `graphic` |
| `lib/slides.jsx` | `SLIDES.draw` — one slide per comp, three looks, three sizes |
| `reference/templates.md` | deck spec shape, template fields, sizes, carousel→spec mapping |

## Files modified
| File | Change |
|---|---|
| `themes.json` | 6 → 70 themes (64 ported from `references/styles/`) |
| `bin/ecm.mjs` | `loadTemplates`, `resolveTheme`, `validateDeck`, `buildSlidesScript`, `SLIDES_MAIN`, `slides()`, `themes()`, `new()`; `emphasis` validation |
| `lib/core.jsx` | `emphasisIndex`, `wordBox` moved here (slides build = core + slides + fx) |
| `lib/scenes.jsx` | drops the two moved helpers |
| `reference/themes.md` | 70-row table |
| `reference/cli.md` | `themes`, `slides`, `new` sections |
| `README.md`, `SKILL.md` | deck path, 70 themes, templates |
| `test/ecm.test.mjs` | 22 tests incl. deck validation, `SLIDE_SIZES`, `buildSlidesScript` |
| `test/smoke.sh` | real deck render + emphasis-mismatch failure |

## Data flow
```
deck.json ──validateDeck──> templates.json[template] ──resolveTheme──> theme
          └─> buildSlidesScript(SPEC, TPL, THEME, SIZE) ──> effectcraft-cli script --empty
              └─> P1..Pn comps (3 s each) + Main stack (1 s each)
                  └─> render-frame --comp P<i> --time 1.8 ──> NN.png
```
Video path unchanged: `buildScript` → `S<n>_<type>` comps → `Main` → `render`.

## Implementation sequence
1. Port themes into `themes.json`; verify each renders `all-scenes.json`.
2. Add `templates.json` + `loadTemplates`/`validateDeck`.
3. Add `lib/slides.jsx`; move shared helpers to `core.jsx`.
4. Add `slides()`; render `P<i>` at 1.8 s (reveal ends 1.05 s, fade starts 2.7 s).
5. `resolveTheme` template inheritance for video specs.
6. Docs + tests.

## Architectural decisions
- Deck validation is separate from `validate()`: a deck has `slides`, a video has `scenes`; `theme` stays required in `validate()` and is defaulted from `tpl.style` only in `validateDeck`.
- `drawing` is metadata: the source contract means per-topic art, which the renderer cannot synthesize.
- Bottom band layout: text block ends at `H-240`; `source` (left) and page number (right) share `H-196`; `handle` centred at `H-144`.
- Muted text uses `onColor(theme, tpl.bg)` so dark templates stay legible.

## Regression areas
- `preview`/`render`/`check` semantics and error strings (smoke test pins them).
- `Main` comp naming and layer order (smoke test reads `S1_hook`, `S1_bars`, `S1_donut` by index).
- `assertFonts` — every ported theme must use installed fonts.

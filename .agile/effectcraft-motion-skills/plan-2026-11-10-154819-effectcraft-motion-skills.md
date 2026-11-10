# Plan — port templates & themes

## Task 1 — themes.json gains 64 ported themes
- Objective: one theme per `../reel-skill-chat/references/styles/*.md` (plus the style-prompts that have a distinct palette), id = file basename.
- Files: `themes.json`.
- Fields per theme: `label` (title from the md), `align`, `easing`, `durationScale`, `colors{base,ink,accent,muted,data}`, `fonts{display,body,label}`, `motifs`, `fx`.
- Acceptance: `themes` prints 70 ids; `themes --json` round-trips; JSON parses.

## Task 2 — templates.json + deck spec
- Objective: the 3 carousel templates from `references/carousel/templates.md` as `templates.json` (`plain`, `themed`, `graphic`).
- Files: `templates.json` (new), `bin/ecm.mjs` (`loadTemplates`, `validateDeck`, `slides`, `themes`, `new`).
- Acceptance: unknown template/theme produce the documented error strings; deck without `template` errors.

## Task 3 — lib/slides.jsx renderer
- Objective: draw one slide per comp for the three looks at three sizes.
- Files: `lib/slides.jsx` (new), `lib/core.jsx` (move `emphasisIndex`, `wordBox` here so the slides build gets them).
- Acceptance: `slides` writes `01.png…`; each non-blank (`std_dev > 0.004`); text complete, no clipped glyphs.

## Task 4 — template inheritance for video specs
- Objective: `template` in a video spec overrides theme colours/fonts; spec-level `colors`/`fonts` still win.
- Files: `bin/ecm.mjs` (`resolveTheme`).
- Acceptance: `resolveTheme(T["editorial-spread"], {template:"themed"})` yields template colours; adding `colors.base` wins.

## Task 5 — docs & tests
- Objective: document 70 themes, 3 templates, deck spec and the `themes`/`slides`/`new` commands; test the new surface.
- Files: `reference/themes.md`, `reference/templates.md` (new), `reference/cli.md`, `README.md`, `SKILL.md`, `test/ecm.test.mjs`, `test/smoke.sh`.
- Acceptance: doc tables list every json id; `node --test` green; smoke test green.

## Risks
- Non-installed fonts (source recipes use Google/AI-illustrator fonts) — every theme must use fonts already proven installed, else `assertFonts` throws at build.
- Dark themes with light `base` overrides can produce low-contrast text; resolved with `onColor`.
- Deck capture time must sit inside the reveal-complete hold, else frames render mid-typewriter.

## Dependencies
Task 1 → Task 4 (resolveTheme reads theme fields); Task 2 → Task 3; Task 5 after 1–4.

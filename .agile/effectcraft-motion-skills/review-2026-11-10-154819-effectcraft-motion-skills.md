# Review — templates & themes port

## Verdict: PASS

### Correctness
- 70 themes: 6 originals untouched plus 64 ported. Every one renders `all-scenes.json` (10 scenes, all types) — `checked=64 failed=0`.
- Deck path renders one PNG per slide from `P<i>` comps at 1.8 s. Earlier defects found by reading the images and fixed:
  - `Main` is only `n` seconds (1 s per slide), so `--time i+0.6` on `Main` ran past the comp → blank slide 3. Now renders `P<i+1>` at a fixed 1.8 s.
  - `0.6 s` also fell inside `revealText` (0.15→1.05), so text rendered mid-reveal ("…dibaca / sa"). 1.8 s is inside the hold.
  - `source` and `handle` overlapped at the bottom. Split into two rows.
  - `graphic` look: `lead` centred at `safe.x0` clipped off the left edge. Now `W/2` when `align === 'center'`.
  - `graphic` look: `source`/`handle`/page number used `theme.colors.muted` (near-black) on the dark `#10151c` ground — invisible. Now `onColor(theme, tpl.bg)`.
- `emphasis` renders via `colorRange` in accent; validated as a substring of `text` so a typo fails loudly instead of silently rendering plain text.

### Architecture fit
- Video spec path (`validate`, `buildScript`, `preview`, `render`, `check`) is untouched; deck validation is a separate `validateDeck`. `theme` remains required in `validate`, so existing specs keep their contract.
- `emphasisIndex`/`wordBox` moved to `lib/core.jsx` because the slides build concatenates core + slides + fx; `scenes.jsx` no longer defines them (single definition, both consumers).

### Maintainability
- `templates.json` mirrors `themes.json`: data, not code. Adding a template is a JSON edit.
- `drawing` is documented as carried-but-inert rather than silently ignored; it means per-topic art, which no renderer can synthesize.

### Security / performance
- No new I/O, no shell interpolation (spawnSync with argv arrays), paths derived from `dirname`/`basename`. No injection surface added.
- Render still serial with the lock; deck renders are one `render-frame` per slide.

### Test coverage
- 22 unit tests, all pass. Deck validation (missing/unknown template, empty slides, missing text, emphasis match/mismatch/empty), `SLIDE_SIZES`, `buildSlidesScript` injection, template colour inheritance.
- Smoke test extended with a real deck render (2 PNGs, 1080x1440) and an emphasis-mismatch failure.

### Regressions
None observed. Full smoke suite exits 0, including the render + ffprobe duration assertions.

### Scope
Confined to the port: themes, templates, deck renderer, docs, tests. No drive-by refactors beyond moving two shared helpers.

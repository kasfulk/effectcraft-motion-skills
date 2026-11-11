# Code review — effectcraft-motion-skills

Session: 2026-11-11-010129-effectcraft-motion-skills
Verdict: **PASS**

## Scope reviewed

- `scripts/remap-theme-fonts.mjs` (new): maps all 70 themes to bundled OFL fonts.
- `themes.json`: 70 themes remapped.
- `bin/ecm.mjs`: `checkFonts` added; `assertFonts(THEME)` calls removed from generated scripts.
- `lib/core.jsx`: orphaned `assertFonts` removed.
- `lib/scenes-extra.jsx`: zoom label fade-out.
- `reference/scenes.md`, `reference/themes.md`, `reference/cli.md`, `SKILL.md`: docs updated.

## Findings

| Area | Finding | Severity | Action |
|---|---|---|---|
| Correctness | `checkFonts` normalizes manifest `family`/`style` by splitting on `,` and taking the first part; matches `text.fonts` output for all 70 themes (spot-checked Inter, Montserrat, Barlow Condensed, Oswald, Space Grotesk, Poppins, Syne, Teko, Rubik, Amiri, Reem Kufi). | — | None |
| Correctness | `assertFonts` width sentinel was unreliable because the engine's fallback font is Inter, which is now a theme font. Removed; Node-side `text.fonts` check replaces it. | — | Done |
| Performance | `checkFonts` runs one `effectcraft-cli exec text.fonts --json` per preview/render (~0.3 s), cached in `FONT_LIST`. | Low | Acceptable |
| Scope | No unrelated refactors; docs match validator limits. | — | None |
| Risk | If the engine renames a family/style, `checkFonts` may false-positive. It fails fast with the exact missing font and the install command, so the failure is actionable. | Low | Documented in `reference/cli.md` |

## Verdict

PASS. No blocking issues.

---

# Review 2 — scene library (2026-11-11 10:41)

Verdict: **CHANGES_REQUIRED** → all four blockers fixed, re-verified. Final: **PASS**.

## Scope

`lib/motion.jsx`, `lib/atmosphere.jsx`, `lib/elements.jsx`, `lib/transitions.jsx`,
`lib/scenes-extra.jsx` (new), `lib/scenes.jsx`, `bin/ecm.mjs`, `themes.json`,
`reference/{scenes,themes}.md`, `test/ecm.test.mjs`.

## Blockers found and fixed

| # | Finding | Fix |
|---|---|---|
| 1 | `ATMOSPHERE.apply` ran before the scene builder, so the vignette/grain adjustment layers sat *below* the content and only tinted the background. | Split into `apply` (glow, under content) and `overlay` (vignette/grain, called after content in MAIN). |
| 2 | `inWorld` used `line.x` (the left edge) as the layer position, but `text()` anchors at the box centre — every `kinetic/world` line 3 landed at `-54..234` and failed `checkSafe`. | `lineX = line.x + sourceRectAtTime().width / 2` for non-centre alignment. |
| 3 | `dotgrid` spiral never advanced `c0` and broke mid-ring: 3×3 emitted `[0,1,2,5,8,7,6,3,3]`, 8 unique for 9 dots; the default grid produced 164 unique for 200. | Rewrote the walk to emit each cell once, then slice to `litCount`; reveal timing divides by `litCount`. |
| 4 | `textMorph` added target words with `comp.layers.addText(word)` (engine default face/size/colour) and resolved their boxes against the *source* lines, so most target words never rendered. | `setText(wordLayer, word, res.font, size, color, res.align)` plus per-line box metrics. |

## Should-fix, also fixed

- `themes.json`: 42 themes declared `compare: "table"`; no such branch exists, so they silently
  rendered as `stack`. Normalized to `"stack"`.
- `lib/elements.jsx`: `#fff`/`#000` produced NaN colours (`rgb()` parses six digits only);
  `fill:'none'` on a shape layer; `colorRange` called on a shape layer. All removed/fixed.
- `lib/transitions.jsx`: fold/pageTurn/colorShift layer ordering put shadows and tints on the
  wrong side of the incoming scene.
- `lib/elements.jsx`: `fire`/`rays`/`water` died after 0.5–2 s, leaving the rest of the scene
  empty. Each now staggers across the scene duration; `particles`/`rays` use the theme accent so
  they are visible on light themes.
- `reference/scenes.md` / `reference/themes.md`: eight scene types and the `elements` field were
  undocumented; `dial.max`, `dial.marks`, `orbit.tilt` defaults were wrong; the layouts table
  listed two themes when all 70 carry layouts.

## Accepted as-is

- Markers and badges enter at `[70,70]` scale without an opacity ramp. Deliberate pop-in on
  already-visible content; adding a ramp would change the feel without fixing a defect.

## Evidence

- `node --test test/ecm.test.mjs` → 46/46 pass.
- `node scripts/smoke-layouts.mjs` → 50/50 cases build (38 layouts + 12 transitions).
- `node bin/ecm.mjs check examples/hemat.json --strict` → exit 0.
- `node bin/ecm.mjs render examples/all-scenes.json` → 39.8 s h264 MP4, exit 0.
- Frames inspected: `kinetic/world` (in-frame), `dotgrid` spiral (9 lit), `kinetic/morph`
  (target word in theme face at the source position), `fire`/`rays`/`water`/`particles` at 2.2 s
  (visible), `stat` with vignette overlay (text not washed out).

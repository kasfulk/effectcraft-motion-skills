scope: effectcraft-motion-skills
session: 2026-11-11-010129-effectcraft-motion-skills
stage: COMPLETE
status: PASS
updated: 2026-11-11 10:58
classification: STANDARD
completed: [brainstorm, plan, coding, code_review, testing, verification, bugfix_transition_anchor_shift, retest, bugfix_comp_overlap_black_tail, retest2, gradient_background, retest3, atmosphere_variation, retest4, glow_spread, retest5, motion_threshold_fixes, retest6, varied_camera_moves, retest7, dotgrid_header_fix, particles_hold_fix, retest8, compare_split_centering, retest9, particles_scatter_fix, retest10, transition_black_dip_fix, retest11, zoom_grid_count_fix, zoom_pullback_fix, retest12, timeline_runner_fix, retest13, orbit_speed_fix, retest14, counter_from_fix, retest15, dotgrid_order_fix, retest16, particles_dead_vars, retest17, ring_name_comment_fix, retest18, dead_import_removal, retest19, stat_from_fix, cards_order_fix, donut_color_fix, compare_split_anim, motion_dead_var, scenes_dead_vars, retest20, slides_dead_params, retest21, hook_split_composition, cards_centering, retest22, layer_name_collisions, retest23, donut_ring_names, all_examples_verified, retest24, motion_blur_enabled, retest25, example_lint_fixes, retest26, motion_blur_enabled, retest23, example_spec_lint_fixes, retest24, final_render_evidence]
current: []
next: []
skipped:
  - DEEP_RESEARCH: no external uncertainty; source is local ../reel-skill-chat
  - LARGE: single repo, no worktree needed; parallel slices via subagents
shares_scope_with: effectcraft-motion-skills

## Review and ship — 2026-11-11 10:41–11:00

Trigger: user asked to review the project and, if OK, commit and push.

Second review pass over the scene-library work (six new lib modules, eight new scene types,
twelve transitions, 70 remapped themes) found four blockers; all fixed and re-verified:

1. `ATMOSPHERE.apply` added vignette/grain *before* scene content, so adjustment layers tinted
   only the background. Split into `apply` (glow, stays under content) and `overlay`
   (vignette/grain, now called after content in MAIN).
2. `inWorld` positioned left-aligned text by its left edge at a centre anchor, pushing line 3 of
   every `kinetic/world` scene off-frame (`-54..234` at x=90). Now offsets by
   `sourceRectAtTime().width / 2` for non-centre alignment.
3. `dotgrid` spiral never advanced the left column bound and broke mid-ring: 3×3 emitted
   `[0,1,2,5,8,7,6,3,3]` (8 unique for 9 dots). Fixed; 3×3 → 9 unique, 21×18 → 378 unique.
4. `textMorph` added target words with engine default face/size/colour and looked them up in
   the *source* lines, so most target words never appeared. Now `setText(...)` with the source
   metrics and per-line boxes.

Also fixed / changed:

- `themes.json`: 42 themes declared `compare: "table"`, which had no branch and silently fell
  through to `stack`. Normalized to `"stack"` so the data matches the code.
- `reference/scenes.md`: added the eight missing scene types and the `elements` field; corrected
  `dial.max` (100 → 24), `dial.marks` default, `orbit.tilt` (degrees → 0–1 squash, default 0.55).
- `reference/themes.md`: replaced the two-theme layouts table with the real key/value matrix.
- `ElementsTransitions` subagent: `#fff`/`#000` → six-digit hex (`rgb()` only parses 6 digits and
  produced NaN colours), `fill:'none'` on a shape layer, `colorRange` on a shape layer, and
  transition layer ordering for fold/pageTurn/colorShift.
- `lib/elements.jsx`: `fire`, `rays`, `water` faded out after 0.5–2 s and were invisible for the
  rest of the scene. Each now staggers its particles across the scene duration (`{dur}` passed
  from MAIN). `particles`/`rays` switched from white to `theme.colors.accent` so they are visible
  on light themes.
- `test/ecm.test.mjs`: restored a MAIN-level `dip` solid assertion that only checked the
  transition module.
- `scripts/smoke-layouts.mjs` (new): builds one spec per scene layout (38) plus per transition
  (12) — 50 cases, all build.

Verification: `node --test test/ecm.test.mjs` 46/46; `scripts/smoke-layouts.mjs` 50/50;
`node bin/ecm.mjs check examples/hemat.json --strict` exit 0; `render examples/all-scenes.json`
produced a 39.8 s h264 MP4.

Accepted as-is: markers/badges entering at `[70,70]` without an opacity ramp — deliberate pop-in
on already-visible content, not a correctness issue.

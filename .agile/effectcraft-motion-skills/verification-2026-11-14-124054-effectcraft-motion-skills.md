scope: effectcraft-motion-skills
session: 2026-11-14-124054-effectcraft-motion-skills
intake: STANDARD (audit findings → fixes)
stage: VERIFICATION
status: PASS
updated: 2026-11-14 13:05
completed: [audit, coding, code_review, testing, verification]
current: []
next: []

## Changes
- reference/sound.md: sfx.scene doc 0-based → 1-based; example renumbered; checklist scene ref fixed
- reference/raea.md + bin/ecm-raea-bridge.mjs: `ecm-raea-bridge.m` → `.mjs`
- reference/cli.md: stale theme error sample; lint table extended C01–C15
- reference/themes.md: motion.stagger marked advisory; motion.transition documented as spec-level default
- SKILL.md: renumbered procedure (0,1..5), prerequisites + PLATFORM-NOTES link, workflow.md link
- README.md: workflow.md link, smoke-layouts.mjs, motion-gallery.json reference
- package.json: added test:layouts, lint scripts
- .github/workflows/test.yml: layout smoke + example check + themes/templates validation
- bin/ecm.mjs buildScript: theme.motion.transition becomes spec-level default (spec.transition wins)
- test/ecm.test.mjs: new test for theme default transition + override

## Skipped
- BRAINSTORM/PLAN approval: user said continue with proposed order
- DEEP_RESEARCH: no external uncertainty
- templates `drawing` cover art, `preview --out`, themes.json cosmetic nits: deferred (design decisions)

## Verification (executed)
- `node --test test/*.test.mjs` → 57/57 pass
- `npm run lint` → exit 0 (all examples check clean)
- `npm run test:layouts` → 51/51 cases build
- `bash test/smoke.sh` → SMOKE_EXIT=0 (full pass incl. two real renders + audio mux; ~20 min serial)
- `bin/ecm preview` on kinetik spec without transition → SPEC line carries `"transition":"zoom"` (theme default); spec `transition:"fade"` overrides
- C12 lint verified: fires on theme-default monotony (kinetik/zoom), spec override respected
- grep sweep: no remaining `"scene": 0` or `raea-bridge.m` (non-.mjs) in docs; SKILL.md:22 cross-ref fixed to "(step 1)"; all 70 theme motion.transition values valid

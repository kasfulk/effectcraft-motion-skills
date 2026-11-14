scope: effectcraft-motion-skills
session: 2026-11-14-124054-effectcraft-motion-skills
intake: STANDARD (audit findings → fixes)
stage: CODING
status: IN_PROGRESS
updated: 2026-11-14 12:40
completed: [audit]
current: [coding]
next: [code_review, testing, verification]

## Audit (read-only, 3 subagents) — key findings
- sound.md documents sfx.scene 0-based; code is 1-based (bin/ecm.mjs:222,242)
- raea.md + bridge usage say `ecm-raea-bridge.m` (file is .mjs)
- theme motion.stagger / motion.transition dead data
- cli.md lint table stops at C10; stale theme error sample
- SKILL.md: no prerequisites/troubleshooting, broken step numbering, workflow.md orphaned
- CI runs only `npm test`; no smoke/layout/check steps

## Slices
- A docs fixes; B CI + npm scripts; C wire theme motion.stagger/transition (TDD)

## Review fixes (post-advisory)
- CI: smoke-layouts step guarded `continue-on-error` (shells out to effectcraft-cli, absent on runners — verified: exit 1 without CLI); `check` steps safe (pure validation, verified exit 0 without CLI)
- package.json `test:layouts` skips with message when effectcraft-cli absent (verified in minimal env)
- bin/ecm.mjs lint(): C12 now uses specDefault = spec.transition ?? theme.motion.transition ?? "cut" (mirrors buildScript); verified C12 fires on theme-default monotony
- test/ecm.test.mjs: strict-exit clean spec pinned transition:"cut" (reel default glitch would warn)
- SKILL.md:22: stale "(step 3)" cross-ref → "(step 1)"
- All 70 theme motion.transition values validated against TRANSITIONS (none invalid)

## Skipped
- BRAINSTORM/PLAN approval: user said "continue" after audit list with proposed order
- DEEP_RESEARCH: no external uncertainty
- Deferred (not done, needs design decision): templates `drawing` cover art, `preview --out`, themes.json cosmetic nits

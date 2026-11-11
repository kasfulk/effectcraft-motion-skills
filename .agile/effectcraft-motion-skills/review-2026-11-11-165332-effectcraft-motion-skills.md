scope: effectcraft-motion-skills
session: 2026-11-11-165332-effectcraft-motion-skills
stage: CODE_REVIEW
verdict: PASS
updated: 2026-11-11 17:58

## Scope reviewed
`529ba31` — `model` scene type, `lib/glb.mjs` + `assets/3d/*.glb`, `lib/scenes-3d.jsx`,
`bin/ecm.mjs` wiring, `lib/core.jsx` guards, docs, tests.

## Correctness
- Path resolution mirrors `resolveSfxFile` (two-step: `assets/3d/` then spec-relative) and fails
  loudly at build time instead of reaching `new File(undefined)`. PASS.
- `resolveModelFile` verifies existence on both branches; `buildScript` throws
  `cannot find "src" (looked in assets/3d and next to the spec)`. PASS.
- Validation bounds are finite-number checks, not truthiness, so `0` remains a legal
  `light`/`fill`/`tilt` value. PASS.
- `checkSafe` and `exitAll` now skip 3D and property-less layers. These affect **every** scene,
  not only `model`: verified by `node --test` (55 pass) and by previewing a 5-scene mixed spec
  (hook / 3 × model / outro) with `fade`, `wipe` and `zoom` transitions — no crash, sheet produced.
  The guard is additive: layers that were measured before still are (shape, solid and text layers
  expose `sourceRectAtTime`, observed directly: `3 bg threeDLayer=boolean:false srcRect=function`).
- `animate` on `rotationY` is scalar-safe (existing scenes already animate scalar opacity). PASS.

## Architecture fit
Uses the established split: builder in `lib/`, wiring and validation in `bin/ecm.mjs`, path
resolution beside its SFX twin. No new dependency, no new abstraction, no config surface
beyond the documented fields. PASS.

## Maintainability
`lib/glb.mjs` is ~200 lines, no deps, one CLI entry; primitives are committed as 1–30 KB binaries
so a spec works out of the box. Tests pin container layout, index bounds, unit normals and
degenerate-triangle ratio — the invariants an engine silently tolerates but renders wrong. PASS.

## Performance
Five GLBs total 57 KB; writer is O(vertices). Render cost is the engine's. PASS.

## Security / input validation
Spec-supplied `src` is a path. It is resolved, existence-checked and restricted to five
extensions; no shell interpolation, no remote fetch at build or render time. PASS.

## Test coverage
55 unit tests (6 new for the scene type, 3 for the writer), plus `test/smoke.sh` as the
end-to-end gate. Blank-frame guard in `preview()` covers the fade-in edge (it samples past
`settle`). PASS.

## Regressions
Only `lib/core.jsx` touches shared code, and only by adding skip conditions. `bash test/smoke.sh`
passed EXIT=0 before the rebase; post-rebase unit suite and previews pass. PASS.

## Scope
No speculative fields (no `unitScale`, no material overrides, no animation presets), no
drive-by refactors. Docs updated where the field list is authoritative (`scenes.md`, `3d.md`). PASS.

## Findings closed during review
1. Missing-file path was silent → now throws with the searched locations.
2. Light layers crashed `checkSafe`/`exitAll` → guarded; `comment='decor'` set on lights too.
3. `reference/3d.md` claimed an unlit model is a flat silhouette, contradicting the measured
   behaviour (unlit still renders at 62–75 tones) → reworded.
4. `fade` was prose-only → added to both field tables and verified with `fade:false`.

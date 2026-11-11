scope: effectcraft-motion-skills
session: 2026-11-11-165332-effectcraft-motion-skills
stage: VERIFICATION
updated: 2026-11-11 17:40

## Acceptance criteria → evidence

| Criterion | Command | Observed |
|---|---|---|
| `model` scene type accepted by the spec schema | `node bin/ecm.mjs check /tmp/acc/spec.json` | `1 hook 3.07 / 2 model 2.50 / 3 model 2.50` — no errors |
| Bare name resolves to `assets/3d/` | same run, scene 2 `"src":"torus.glb"` | resolved and built |
| Spec-relative path resolves next to the spec | same run, scene 3 `"src":"../acc/cube.glb"` | resolved and built |
| End-to-end build + contact sheet | `node bin/ecm.mjs preview /tmp/acc/spec.json` | `/tmp/acc/spec.sheet.png` written, exit 0 |
| Model actually renders shaded, not a silhouette | `render-frame` + tone count on `S2_model`/`S3_model` | 150 and 162 distinct tones over 12 329 / 34 524 model pixels |
| `light`/`fill` are wired, not decorative | same spec with `light:0, fill:0` vs defaults | unlit 75/62 tones vs lit 146/145 tones |
| `spin` animates | `render-frame --time 0.8` vs `--time 2.0` | frame hashes differ in both comps (2967757570→2688687916, 4012479971→834105121) |
| Shipped primitives are real geometry | numeric silhouette gate over all five | fill 0.769–0.900 of bbox, 23–118 tone levels each |
| Unit suite | `node --test test/*.test.mjs` | 55 pass, 0 fail |
| Project smoke suite | `bash test/smoke.sh` | EXIT=0, 67.1 s |
| Skill payload still under the 200-file zip cap | `git ls-files | wc -l` | 109 tracked + 8 new = 117 |

## Failures found and fixed during verification

1. `checkSafe()` in `lib/core.jsx` measured every layer with `sourceRectAtTime` + `transform.scale`.
   A light layer has `scale = null` and no `sourceRectAtTime` (probe: `1 key threeDLayer=undefined scale=NULL srcRect=undefined`),
   so any comp containing lights threw `TypeError: cannot convert 'null' or 'undefined' to object`.
   Fixed by skipping layers with `threeDLayer` or without a `sourceRectAtTime` function.
2. `exitAll()` faded `transform.opacity` on every non-bg layer. A light has no opacity property, so the
   same TypeError escaped the per-scene try block and killed the build after the scenes were assembled.
   Fixed by skipping layers without `transform.opacity`.
3. `ModelScene` had removed the key/fill rig after mis-attributing failure (1) to `addLight`. Bisecting the
   generated script (`build.jsx:158:180`) proved `addLight` works; the rig was restored and now sets
   `comment = 'decor'` so the layer is exempt from both checks.

## Commands run (verbatim, latest)

```
$ node --test test/*.test.mjs
ℹ tests 55  ℹ pass 55  ℹ fail 0

$ bash test/smoke.sh
scene 1 (steps): text too long      # expected negative assertion inside the script
EXIT=0

$ node bin/ecm.mjs preview /tmp/acc/spec.json
/tmp/acc/spec.sheet.png             # exit 0
```

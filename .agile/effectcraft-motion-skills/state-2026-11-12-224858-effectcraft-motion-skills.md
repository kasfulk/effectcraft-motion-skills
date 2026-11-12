---
scope: effectcraft-motion-skills
session: 2026-11-12-224858-effectcraft-motion-skills
stage: VERIFICATION
status: DONE
updated: 2026-11-12 22:52
completed: [intake, recon, probe, doc]
current: []
next: []
skipped:
  BRAINSTORM: "question was factual (does tool X fit the ingest contract), not a design decision"
  PLAN: "one documentation slice, no code path"
  DEEP_RESEARCH: "answered by probing the installed engine, not by literature"
  CODE_PLAN: "no code"
  CODING: "docs only"
  CODE_REVIEW: "single doc section, self-reviewed against engine output"
  TESTING: "engine probes below are the test"
  VERIFICATION: "commands recorded here"
---

# 2026-11-12 — do OpenToonz / Friction / SVG.js / Synfig / Pencil2D fit this pipeline?

Classification: SMALL (documentation).

## Probes against effectcraft-cli 0.23.0 (executed)

1. `exec edit.pasteSvg` on an SVG with `<animateTransform>`, `<animate>`, `<text>` →
   `{"layer":3630,"skipped":["text"]}`; `props` on the layer → 78 properties, **0 keyed**.
   Conclusion: SVG motion is flattened; text is dropped.
2. `exec file.import {"paths":["f0001.png"],"sequence":true,"frameRate":3}` on 3 stills →
   item `f[0001-0003].png`, type `Image Sequence`, duration `1.0` s. Without `frameRate` the same run is
   `0.1` s at the project's 30 fps (observed in the JSX variant).
3. `ImportOptions` + `io.sequence = true` in JSX → item `f[0001-0003].png`. `io.frameRate` is ignored.
4. `exec file.importLottie` on a hand-built 5.7.4 JSON → comp, 1 layer, **empty render** (no warning).
   On `lottie-web`'s real `adrock` sample → 29-layer, 13.07 s comp; rendered md5 differs at 0, 0.5, 1 s.
5. `exec layer.addItem {"item":3733}` → layer 3734, footage draws frame 0 correctly.

Not verified: the exact `synfig` CLI flags — every docs URL 404'd (`wiki.synfig.org/Doc:Command_Line`,
`synfig-docs-dev.readthedocs.io`, `doc/src/cli.md`), so the doc names the binary and points at
`synfig --help` instead of risking a wrong command.

## Outcome

`reference/assets.md` gains "2D animation toolkits": three ingest doors (static SVG, Lottie, baked
frames), a per-tool verdict, and one verified row in "What the engine can take". SKILL.md and README
point at it. No runtime code.

Correction that changed the recommendation: **Synfig 1.4.0+ exports Lottie** (Plugins ▸ Export to
Lottie; bones not supported), so its motion can arrive as vector instead of baked frames — and
**Glaxnimate** saves Lottie natively, which makes it the best authoring front-end here even though it
was not one of the five asked about. Friction has no Lottie route.

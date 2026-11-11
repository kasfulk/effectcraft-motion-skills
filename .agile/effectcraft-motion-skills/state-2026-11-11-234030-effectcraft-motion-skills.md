---
scope: effectcraft-motion-skills
session: 2026-11-11-234030-effectcraft-motion-skills
stage: VERIFICATION
status: PASS
updated: 2026-11-11 23:40
completed: [intake, brainstorm, plan, coding, verification]
current: []
next: []
skipped:
  - DEEP_RESEARCH: no open technical question beyond one empirical claim, resolved by render
  - CODE_PLAN: docs-only change, no code path touched
  - CODE_REVIEW: reference prose, no executable change
  - TESTING: no test surface; verification render below
---

# request

Add a free-only 3D asset source reference, and settle whether textured GLBs render.

# classification

SMALL — documentation + one corrected factual claim. No production code.

# work

- `reference/3d-sources.md` — new: free sources only (poly.pizza, kenney, quaternius, poly haven,
  ambientCG, Khronos sample assets, Sketchfab CC filter), where files go, post-import checks,
  license discipline.
- `reference/3d.md` — corrected the "colour lives in `baseColorFactor`" claim; added sources link.
- `SKILL.md` — index line now links the sources doc.

# verification

Textured vs flat GLB, same geometry, one `bin/ecm preview` each:

```
engine  effectcraft-cli script ... box.build.jsx --empty --save-as /tmp/ecm-tex-test/box.ecproj
/tmp/ecm-tex-test/box.sheet.png
engine  effectcraft-cli script ... boxflat.build.jsx --empty --save-as /tmp/ecm-tex-test/boxflat.ecproj
/tmp/ecm-tex-test/boxflat.sheet.png
```

Distinct grey tones in each sheet (`magick -colorspace gray -format %k`):

```
box: 6610 tones        # Khronos BoxTextured.glb — baseColorTexture
boxflat: 568 tones     # same GLB, texture stripped, baseColorFactor white
```

Verdict: `baseColorTexture` renders; `baseColorFactor` alone renders one flat tone. Temp test
files removed.

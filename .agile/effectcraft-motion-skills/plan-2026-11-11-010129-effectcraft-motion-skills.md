# Plan: effectcraft-motion — motion variety + workflow extraction

## Diagnosis
- Render already uses effectcraft-cli: bin/ecm.mjs:693 `effectcraft-cli render --project ... --comp Main --out ... --format h264`; preview uses `script` + `render-frame`; slides uses `script` + `render-frame`.
- Repetition root cause: 9 scene types, one hardcoded composition each, no `layout` field.
- Motion vocabulary thin: 11 fx presets, 5 transitions, no type-motion, no elements, no atmosphere, themes change color/font only.
- Gap vs ../reel-skill-chat: 15 screens, 8 elements, 10 transitions, 4 type-motion, atmosphere, palettes, pacing, sound design.

## Target architecture
- New lib files, build order: core -> fx -> motion -> elements -> atmosphere -> transitions -> scenes -> scenes-extra -> slides.
- Contracts: MOTION.apply/maskReveal/wordStagger/textMorph/inWorld; ELEMENTS.apply/flash/rays/fog/particles/cracks/lightning/fire/water; ATMOSPHERE.apply; TRANSITIONS.apply/fold/maskWipe/pageTurn/zoom/glitch/dipSeed/colorShift; SCENES_EXTRA[type].
- Layout resolution: scene.layout -> theme.layouts[type] -> DEFAULT_LAYOUT[type] (current composition).
- 31 layout variants across 9 existing types.
- 8 new scene types: counter, dotgrid, dial, orbit, cards, timeline, particles, zoom.
- Theme motion profile: motion {energy, stagger, transition, atmosphere}; optional layouts.
- Craft lint C11-C15: layout repetition, transition monotony, no atmosphere, >7 words per line, no chart scene.
- reference/workflow.md: extracted reel chain adapted to spec -> effectcraft-cli.

## Slices
Wave 1 (parallel): MotionPrimitives, SceneLayouts, SceneTypes, Transitions, ThemeMotion, WorkflowExtract.
Wave 2: bin/ecm.mjs wiring (register libs, merge SCENES_EXTRA, transition dispatcher, validate layout + 8 types, lint C11-C15, sfx pan, print engine command).
Wave 3: docs (SKILL.md, reference/scenes.md, fx.md, craft.md, review.md, sound.md), examples/motion-gallery.json, tests.
Wave 4: verification.

## Verification matrix
1. which effectcraft-cli -> path
2. node bin/ecm.mjs check examples/all-scenes.json --strict -> exit 0
3. node bin/ecm.mjs check examples/motion-gallery.json --strict -> exit 0
4. taskpolicy -b nice -n 19 node bin/ecm.mjs preview examples/motion-gallery.json -> sheet png
5. Read sheet -> every panel distinct, legible, not blank
6. taskpolicy -b nice -n 19 node bin/ecm.mjs render examples/motion-gallery.json -> mp4 + engine log
7. ffprobe -> 1080x1920, 30/1, duration > 0
8. node --test test/ecm.test.mjs -> pass
9. bash test/smoke.sh -> pass

## Risks
- Engine lacks track matte / 3D -> fallback to core primitives.
- Layer count -> cap dotgrid 200, particles 120.
- Render lock -> serial only.
- Backwards compat -> default layout = current composition.
- Tests asserting old scene list -> update only for new behavior.

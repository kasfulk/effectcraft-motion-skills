# raea bridge — scenes beyond the 19 types

`raea` ([raea.io](https://raea.io)) is a separate render engine that takes React/TypeScript
compositions. When a scene needs something the 19 built-in types cannot express — a map, a
physics simulation, a game overlay, anything procedural — render that one scene with raea
and embed the result as footage.

## When to reach for it

- The visual is **not** one of: hook, kinetic, stat, bars, donut, steps, compare, quote,
  outro, counter, dotgrid, dial, orbit, cards, timeline, particles, zoom, model.
- `custom` + the core helpers ([scenes.md](scenes.md)) genuinely cannot build it — try them
  first; they are cheaper and theme-aware.
- The user asked for something raea-specific (a playable element, a 3D world raea is better
  at, an existing `.tsx` they already have).

## The loop

```sh
# 1. write the scene as a raea composition (1080×1920, 30 fps)
raea render scene.tsx -o scene.mp4 --width 1080 --height 1920 --fps 30

# 2. import it into an effectcraft project as a footage layer
bin/ecm-raea-bridge.m scene.tsx --out scene.mp4 --dur 3 --comp Bridge --project out.ecproj
```

`ecm-raea-bridge.m` does both steps: renders the `.tsx` via `raea`, then creates a one-scene
`.ecproj` whose only layer is the rendered MP4. Embed it in a full spec by importing that
project as footage (see [assets.md](assets.md)) or by pointing the bridge's `--project` at
the spec's own `.ecproj` after `ecm preview` has created it.

## Rules

1. **raea is an escape hatch, not a default.** A spec that could be built with the 19 types
   must be. The validator, `check`, and the contact-sheet loop only see spec scenes — a
   bridge-rendered scene has no lint coverage, so review its frames by hand.
2. **One engine process at a time still applies.** Never run `raea render` while an
   `ecm preview`/`render` is running; run them serially like everything else.
3. **Caption from a neighbouring scene.** Like `model` scenes, a bridged scene renders no
   spec text — put titles and labels in a hook/kinetic/outro scene beside it.
4. **raea is optional.** Every skill feature except this bridge works without it installed;
   the bridge errors with `raea not on PATH` if it is missing.

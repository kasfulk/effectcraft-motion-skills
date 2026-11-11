# Free 3D model sources

Only sources that hand you glTF/GLB directly (or export it), under a license you can use in
commercial work. CC0 first: no credit line to track. CC-BY is usable, but the credit goes in
the video description or the spec's `source`/`outro` text.

| Source | Library | Format | License | Best for |
|---|---|---|---|---|
| [poly.pizza](https://poly.pizza) | thousands of low-poly props, characters, food, tech | one-click **GLB**, no login | CC0 + CC-BY mix — check the model page | default first stop; single objects |
| [kenney.nl](https://kenney.nl/assets) | cohesive kits: props, towers, furniture, characters, UI blocks | GLB/GLTF in most kits | CC0 | one consistent set for a whole video |
| [quaternius.com](https://quaternius.com) | hundreds of low-poly packs, incl. animated characters | FBX / OBJ / **GLTF** | CC0 | characters, nature, buildings |
| [polyhaven.com/models](https://polyhaven.com/models) | realistic PBR props, furniture, nature, scanned food | **GLTF** / FBX / USD / blend | CC0 | realistic hero object |
| [ambientcg.com](https://ambientcg.com) | PBR textures and HDRIs (no models) | jpg/png/hdr | CC0 | material detail, lit background |
| [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | reference models (`BoxTextured`, `DamagedHelmet`, `Avocado`) | GLB | per-model, mostly CC0/CC-BY | regression checks for this scene type |
| [sketchfab.com](https://sketchfab.com) | ~1M models, anything exists | GLB on many | mixed — filter *Downloadable* + CC | last resort for an object the others lack |

Paid, listed only so you know what they cost you: KitBash3D, CGTrader, TurboSquid, Greyscalegorilla.
They ship FBX/OBJ, so every asset needs a Blender pass (File ▸ Export ▸ glTF 2.0 Binary). The free
set above skips that step entirely.

## Where the file goes

- **One-off** — no install needed: put the `.glb` beside the spec, use `"src": "./prop.glb"`. A
  `src` containing `/` resolves relative to the spec file.
- **Reused** — `assets/3d/<name>.glb`, then `"src": "<name>"` (bare name gets `.glb` appended).
- **Never overwrite the five shipped primitives** (`cube`, `sphere`, `torus`, `cylinder`, `plane`).
  `lib/glb.mjs` generates them and `test/glb.test.mjs` pins their structure; add new names instead.
- Record the license of anything committed under `assets/3d/` in `assets/LICENSES.md`.

## Checks after an import

Run `$E preview spec.json` and read the sheet; all of these show up there.

- **Texture vs flat colour.** `baseColorTexture` renders (verified 2026-11-11: Khronos
  `BoxTextured.glb` shows its texture through `preview`, while the same GLB with only
  `baseColorFactor` renders as one flat tone). Nothing recolours a model from the spec — to change
  colour, edit the material in Blender, re-export, or regenerate a primitive with
  `node lib/glb.mjs torus out.glb --color "#FFD166"`.
- **Scale.** `geometryOptions/unitScale` is 480, so a 1-unit model needs `scale` ≈ 55 to read at
  frame scale; published assets vary wildly (0.01 or 1000 units), so tune `scale` per file. Start
  at 55 and adjust once.
- **Metallic.** `metallicFactor` > 0 with no environment map renders near-black. Author assets at
  `metallicFactor: 0` (or `metalness` 0 in Blender) — the scene adds only a key and a fill light.
- **Polycount.** Keep under ~50k triangles. Scanned/photogrammetry meshes slow the engine and
  rarely read better at 1080×1920 than a clean low-poly equivalent.
- **Multiple parts.** A `model` scene animates the whole layer (spin/tilt/scale), not sub-objects.
  An asset whose parts must move independently is a bake job, not a `model` scene — see
  [3d.md](3d.md) ▸ *When to prefer this over baking*.

## License discipline

CC0 needs nothing. CC-BY needs attribution where a viewer can find it: a `source` line on the
outro, or the caption you ship with the video. Never ship an asset whose license page you did not
open — "free download" is not a license.

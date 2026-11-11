# Test report — effectcraft-motion-skills

Session: 2026-11-11-010129-effectcraft-motion-skills

## Commands and results

| # | Command | Result |
|---|---|---|
| 1 | `node scripts/remap-theme-fonts.mjs` | `70 themes remapped to bundled fonts` |
| 2 | `node bin/ecm.mjs check examples/hemat.json --strict` | exit 0; warnings C05/C06 only, no `ERR` |
| 3 | `node bin/ecm.mjs check examples/motion-gallery.json` | exit 0; warnings C05/C06 only |
| 4 | `node bin/ecm.mjs preview examples/hemat.json` | `examples/hemat.sheet.png`; 5 panels legible |
| 5 | `node bin/ecm.mjs preview examples/motion-gallery.json` | `examples/motion-gallery.sheet.png`; 16 panels |
| 6 | `effectcraft-cli render-frame --project examples/motion-gallery.ecproj --comp S3_dotgrid --time 1.5` | 1080×1920 frame, dots + label correct |
| 7 | `effectcraft-cli render-frame --project examples/motion-gallery.ecproj --comp S4_bars --time 1.5` | 1080×1920 frame, horizontal bars correct |
| 8 | `effectcraft-cli render-frame --project examples/motion-gallery.ecproj --comp S10_zoom --time 1.5` | 1080×1920 frame, only `Kota` label |
| 9 | `effectcraft-cli render-frame --project examples/motion-gallery.ecproj --comp S11_stat --time 1.5` | 1080×1920 frame, ring + 58% correct |
| 10 | `magick compare -metric AE /tmp/S10_zoom.png /tmp/S10_zoom2.png null:` | `1078.08` differing pixels (label fix) |
| 11 | `node bin/ecm.mjs render examples/hemat.json` | `examples/hemat.mp4` 34,277,914 bytes, total 18.37 s, `audio: none` |
| 12 | `grep -rn assertFonts lib bin` | no matches |

## Notes

- `check --strict` treats craft warnings as failure; plain `check` exits 0. No validation errors.
- The montage samples just after the transition; `fold`/`maskWipe` panels can look dark in the sheet while the scene is correct at mid-scene time (verified with `render-frame`).

---

# Test run 2 — scene library (2026-11-11 10:58)

| Command | Result |
|---|---|
| `node --test test/ecm.test.mjs` | 46 tests, 46 pass, 0 fail (897 ms) |
| `node scripts/smoke-layouts.mjs` | 50/50 cases build (38 layout cases + 12 transition cases) |
| `node bin/ecm.mjs check examples/hemat.json --strict` | exit 0, no errors |
| `node bin/ecm.mjs check examples/all-scenes.json` | exit 0, one WARN C02 (10 scenes > 8, intentional gallery) |
| `node bin/ecm.mjs render examples/all-scenes.json` | exit 0, 39.83 s h264 MP4, 95.9 s wall |
| `node bin/ecm.mjs themes --suggest examples/hemat.json` | 4 themes + "type your own" |

`scripts/smoke-layouts.mjs` is new: the unit tests exercise spec validation, not the generated
JSX, so a broken layout branch (like `kinetic/world` before the `inWorld` fix) could ship
unnoticed. The script builds one spec per layout and per transition and fails on the first
non-zero exit.

# Verification — templates & themes port

Every criterion below is backed by an executed command.

## 1. All 64 ported themes render the full 10-scene spec
```
$ bash /tmp/ecm-port/cover.sh
checked=64 failed=0
```
Each iteration sets `theme` on `examples/all-scenes.json` (hook, kinetic, stat, bars, donut, steps, compare, quote, outro, custom) and runs `ecm.mjs preview`, requiring exit 0 and a sheet.

## 2. Theme inventory matches docs
```
$ node -e 'console.log(Object.keys(require("./themes.json")).length)'
70
$ # doc rows vs json ids
json 70 doc rows 79
missing from docs: []
in docs not json: ['slab','square','thin','highlighter','outline','underline','glow','sheet','tag']
```
The 9 extras are motif names from the separate motif table, not themes. No theme is undocumented.

## 3. Theme schema completeness
```
$ node -e '... union of keys / incomplete / no style ...'
union of keys: label, align, easing, durationScale, colors, fonts, motifs, style, fx
incomplete: []
no style (scene themes): [ 'reel', 'pitch', 'infopop', 'kinetik', 'tenang', 'edukasi' ]
```
Every theme has `label`, `colors.base/ink`, `fonts.display/body`. Only the 6 originals lack `style` (they are scene themes, not deck styles).

## 4. Deck renders one PNG per slide at the template ratio
```
$ node bin/ecm.mjs slides /tmp/ecm-port/d-plain.json --out /tmp/ecm-port/d-plain
/tmp/ecm-port/d-plain
$ node bin/ecm.mjs slides /tmp/ecm-port/d-graphic.json --out /tmp/ecm-port/d-graphic
/tmp/ecm-port/d-graphic
$ magick identify ...
/tmp/ecm-port/d-plain/01.png 1080x1440
/tmp/ecm-port/d-plain/02.png 1080x1440
/tmp/ecm-port/d-graphic/01.png 1080x1350
/tmp/ecm-port/d-graphic/02.png 1080x1350
```
`3:4` → 1080×1440, `4:5` → 1080×1350. Visual inspection of `themed`, `plain`, and `graphic` slides confirms complete text, accent emphasis, and legible source/handle.

## 5. Deck capture sits inside the hold (earlier bug proven fixed)
Before: slide 1 read "Tiga hal yang membuat carousel ini dibaca / sa" (mid-reveal) and slide 3 rendered blank (time 2.6 s past a 3 s `Main`). After rendering `P<i>` at 1.8 s, all three PNGs are non-blank with complete text:
```
$ node bin/ecm.mjs slides /tmp/ecm-port/SLIDES-DEMO.json --out /tmp/ecm-port/deck-out
/tmp/ecm-port/deck-out
/tmp/ecm-port/deck-out/01.png 1080x1440 1.35962MiB
/tmp/ecm-port/deck-out/02.png 1080x1440 1.33432MiB
/tmp/ecm-port/deck-out/03.png 1080x1440 1.32819MiB
```

## 6. Emphasis validation
```
$ node -e '... validateDeck with emphasis ...'
bad emphasis: ["slide 1: emphasis not found in text"]
good emphasis: []
empty emphasis: ["slide 1: emphasis must be a non-empty string"]
```

## 7. Unit tests
```
$ node --test test/ecm.test.mjs
ℹ tests 22
ℹ pass 22
ℹ fail 0
```

## 8. Example specs still validate
```
$ node bin/ecm.mjs check examples/all-scenes.json   → total  39.83
$ node bin/ecm.mjs check examples/hemat.json        → total  18.37
$ node bin/ecm.mjs check examples/hostile.json      → total   5.57
```

## 9. Full smoke suite (engine, serial, incl. MP4 render)
See `smoke.log` result below — the suite covers preview/render/check error strings, contact sheets for the 6 scene themes, counter formatting, donut/stat label absence, safe-area enforcement, deck render, and a real MP4 probed at 1080×1920 @30 fps with duration equal to the reported total.

```
$ taskpolicy -b nice -n 19 bash test/smoke.sh
SMOKE_STATUS=0
```

## 10. Template fields validated (follow-up)

```
$ node -e '... validateDeck with a bad template ...'
["template \"plain\": size must be one of 3:4, 4:5, 1:1","template \"plain\": drawing must be cover, every, some, or empty"]
[]
$ node --test test/ecm.test.mjs
ℹ tests 22
ℹ pass 22
ℹ fail 0
```
`size` and `drawing` were previously accepted-but-unvalidated; both now fail loudly on a typo instead of silently falling back to `3:4` / no drawing.

## 11. Themed deck re-verified after the contrast patch
`node bin/ecm.mjs slides /tmp/ecm-port/emph.json` re-rendered after the `onColor` change; the PNG shows full text, accent emphasis on "sampai habis.", legible `source`/`handle`, and the paper motif intact — the light-background look did not regress.

## 12. Native macOS CI status
None — the project has no CI. The gate is `test/smoke.sh`, which requires `effectcraft-cli`, `magick`, `ffmpeg`, and macOS app fonts.

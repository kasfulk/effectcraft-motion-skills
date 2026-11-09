# Task 5 report — list scenes

## Implemented
- Added `steps` scene builder with optional title-aware layout, capped row height, vertically centered body text, motif-specific badges, slab bars, shadows, staggered slide/fade entrances, and badge pops.
- Added `compare` scene builder with inset left outline card, accent/ink right card, readable card text, staggered point fades, and a last-created VS pop badge.
- Extended ellipse construction to support fill-only, stroke-only, and fill-plus-stroke shapes required by thin/outline badges.
- Added the required steps/compare fixtures and smoke coverage, including the 60-word steps failure and an `bg:"ink"` compare preview.

## RED/GREEN evidence
- RED: smoke extension produced `scene 1 (steps): text too long` before scene implementation.
- GREEN: `taskpolicy -b nice -n 19 bash test/smoke.sh` passed: 9 tests, 0 failures; expected failure assertions included steps, hook, custom-font, syntax, blank, safe-area, and text-overflow cases.
- `git diff --check` passed.

## Visual check
- reel: steps use square ink slab bars with red numbers; item text is centered within each row and rows do not overlap. Compare left stroke is visible, right text is readable, and VS sits over the card boundary.
- pitch: steps use outlined circular badges and centered rows; no overlap. Compare left stroke is visible, blue right-card text is readable, and VS is on top.
- infopop: steps use orange filled circular badges with dark numbers; rows are centered and separated. Compare outline/filled cards are readable and VS is on top.
- kinetik: steps use square amber badges with readable light text; rows do not overlap. Compare left stroke is visible, right card text is readable, and VS is on top.
- tenang: steps use coral filled circular badges with dark text; rows are vertically centered without overlap. Compare left stroke and right text remain readable, with VS on top.
- edukasi: steps use rotated coral tag badges with pin dots; rows remain separated and centered. Compare left stroke is visible, right card text is readable, and VS overlays the card boundary.

## Concerns
- No remaining concerns observed in smoke or required visual sheets.

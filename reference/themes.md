# Themes

Each theme supplies `base`, `ink`, `accent`, fonts, alignment, easing, duration scale, and motifs. Scene `bg` chooses `base`, `ink`, or `accent`; text uses the higher-contrast base or ink color for the selected background.

| name | bg / ink / accent | fonts | align | motifs | when to use it |
|---|---|---|---|---|---|
| `reel` | `#f2efe8` / `#111111` / `#e63323` | display `HelveticaNeue-CondensedBlack`; body and label `HelveticaNeue-Medium` | left | `slab`, `square` | Bold news, finance, and direct social-video statements. |
| `pitch` | `#f6f5f1` / `#16171c` / `#2b59ff` | display `Inter-ExtraBold`; body `Inter-Medium`; label `JetBrainsMono-Medium` | left | `lineLabel`, `thin` | Calm pitch decks and kajian-style lineLabel layouts. |
| `infopop` | `#fff6e6` / `#1d2340` / `#ff8a3d` | display `Montserrat-ExtraBold`; body and label `Montserrat-SemiBold` | center | `highlighter`, `outline`, `hardShadow` | Centered, playful infographic content with strong outlined emphasis. |
| `kinetik` | `#0b1416` / `#e6f4f1` / `#ffb000` | display `DINCondensed-Bold`; body `AvenirNextCondensed-DemiBold`; label `JetBrainsMono-Medium` | left | `underline`, `square` | Dark HUD-like kinetic typography and stacked phrases. |
| `tenang` | `#eef0e6` / `#2f4a3a` / `#d9734e` | display `AvenirNext-Medium`; body and label `AvenirNext-Regular`; quote `PlayfairDisplayRoman-Bold` | center | `glow` | Quiet reflective content with spacious centered composition. `durationScale` is 1.2. |
| `edukasi` | `#d9b98c` / `#26355d` / `#f07a5a` | display `AvenirNext-Bold`; body and label `AvenirNext-DemiBold` | center | `sheet`, `softShadow`, `tag` | Paper-like educational explainers with tactile cards and labels. |

## Motifs

| motif | visual effect |
|---|---|
| `slab` | A large ink rectangle slides in behind content. |
| `square` | Uses square corners or square badges rather than rounded shapes. |
| `lineLabel` | Adds a thin line and numbered label above content. |
| `thin` | Uses thinner strokes and outline-style bars or badges. |
| `highlighter` | Places a tilted marker rectangle behind emphasized text. |
| `outline` | Uses ink strokes instead of filled shapes for selected elements. |
| `hardShadow` | Adds a sharp, offset ink drop shadow with zero softness. |
| `underline` | Colors the emphasized range and draws an accent underline. |
| `glow` | Adds layered, low-opacity accent ellipses behind the focal content. |
| `sheet` | Adds a cream sheet rectangle on the base background. |
| `softShadow` | Adds a low-opacity, softened dark drop shadow. |
| `tag` | Makes step badges into paper-tag shapes with a small pin. |

# Templates

`templates.json` holds three deck templates for the `slides` renderer (`lib/slides.jsx`). A deck spec is its own spec shape, validated separately from video specs: `slides` is legal there, `scenes` is not.

## Deck templates

| template | look | size | bg / ink / accent | fonts | extras |
|---|---|---|---|---|---|
| `plain` | plain | `3:4` | `#f2efe8` / `#111111` / `#e63323` | head `Anton-Regular`; body `SpaceGrotesk-Medium` | style `reel` |
| `themed` | themed | `3:4` | `#f4f1ea` / `#1d1914` / `#7a1f2b` | head `PlayfairDisplay-Bold`; body `InstrumentSerif-Regular` | `progress: true`; style `editorial-spread` |
| `graphic` | graphic | `4:5` | `#10151c` / `#f4f1ea` / `#e8b04a` | head `Montserrat-ExtraBold`; body `Inter-Regular` | `progress: false`, `drawing: "cover"`; style `infopop` |

Fields: `look`, `size`, `bg`, `ink`, `accent`, `font_head`, `font_body`, `handle`, `progress`, `drawing`, `style`.

`size` must be one of the keys in `SLIDE_SIZES`; `drawing` must be `cover`, `every`, `some`, or empty. Both are validated, so a typo fails instead of silently falling back to `3:4`.

## Deck-level overrides

A deck spec may set `handle` (string) to override the template's watermark handle for this run — e.g. `"handle": "@yourbrand"`. It replaces `@yourpage` on every slide. Other template fields (`bg`, `ink`, `accent`, fonts, `progress`, `size`) are template-only and cannot be overridden from a deck.

## `template` in a video spec

A video spec may also name a template:

```json
{ "theme": "reel", "template": "themed", "out": "deck.mp4", "scenes": [ ... ] }
```

The template supplies `bg`, `ink`, `accent`, `font_head`→display, `font_body`→body under the theme. Spec-level `colors` and `fonts` overrides still merge on top.

## Deck spec shape

A deck spec has its own top-level shape: `template` (required), `theme` (optional, defaults to the template's `style`), `out` (optional output dir), `slides` (required array of `{text, lead?, source?, emphasis?}`). It is not a video spec.

`emphasis` must be a substring of `text` (case-insensitive); it renders in the template's `accent` colour. A mismatch fails validation rather than silently rendering plain text.

```json
{
  "theme": "reel",
  "template": "themed",
  "out": "deck",
  "slides": [
    { "text": "Title here", "lead": "Lead-in label", "source": "source line" },
    { "text": "Second slide", "emphasis": "Second" }
  ]
}
```

## `slides` command

```sh
node bin/ecm.mjs slides deck.json [--out <dir>]
```

Renders one PNG per slide at the template's size. Without `--out`, writes next to the spec.

## Sizes

`SLIDE_SIZES` in `lib/slides.jsx`:

| ratio | width × height |
|---|---|
| `3:4` | 1080 × 1440 |
| `4:5` | 1080 × 1350 |
| `1:1` | 1080 × 1080 |

## Carousel → spec mapping

| template field | meaning in a deck spec |
|---|---|
| `look` | Layout variant: `plain`, `themed` (page number + lead/source), `graphic` (accent band + panel) |
| `size` | Slide canvas: `3:4`, `4:5`, or `1:1` — deck-only |
| `bg` | Background fill colour, overrides theme `base` |
| `ink` | Primary text colour, overrides theme `ink` |
| `accent` | Accent colour for underlines, bands, highlights, overrides theme `accent` |
| `font_head` | Display font for plain-look slides; `font_head`→display in themed/graphic looks |
| `font_body` | Body font for slide text, overrides theme `body` |
| `progress` | Deck-only: when `true`, renders a thin accent bar across the top edge, width proportional to `page / total`; the `n / total` page number is part of the `themed` look and appears regardless of `progress` |
| `drawing` | Deck-only field, validated as `cover`, `every`, `some`, or empty; the renderer draws no cover art (the template never keeps drawings — new art is authored per carousel) |
| `style` | Theme slug whose motifs, colours, and fonts form the base layer under the template overrides |

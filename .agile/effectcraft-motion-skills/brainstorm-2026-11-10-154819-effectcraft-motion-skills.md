# Brainstorm — port templates & themes from reel-skill-chat

## Problem
`effectcraft-motion` ships 6 themes and no deck renderer. `../reel-skill-chat/references/` defines 64 style recipes (`styles/*.md`, `style-prompts/*.md`) and 3 carousel templates (`carousel/templates.md`). Users of that skill cannot reuse their looks here.

## Requirements
1. Every style in `references/styles/` available as an `ecm` theme usable by spec `theme` field.
2. Every template in `references/carousel/templates.md` available as a deck template with `slides` renderer.
3. Existing 6 themes unchanged in behaviour; existing video pipeline unchanged.
4. Themes/templates discoverable (`themes` command, docs tables).

## Constraints
- Only `themes.json` keys are theme ids; `lib/*.jsx` is ExtendScript-style, no modern JS.
- A theme must supply only fields the renderer reads: `label, align, easing, durationScale, colors{base,ink,accent,muted,data,...}, fonts{display,body,label}, motifs, fx`.
- Templates need a separate spec shape (`slides`) — a deck is not a video spec.
- One engine process at a time.

## Decisions
- Each `styles/<id>.md` becomes a theme whose id is the filename, carrying the file's palette, fonts, easing, motifs and fx. The style's "how to draw" prose is not portable to scene code, so it collapses to the fields the renderer honours; documented as such.
- `template` is legal in both spec shapes. In a video spec it contributes colours/fonts under the theme; in a deck spec it also fixes `look`, `size`, `progress`, `drawing`, `handle`.
- `drawing` (`cover|every|some`) is carried and validated but not rendered: the source contract means "draw topic-specific art per carousel", which no renderer can synthesize. Deck art stays with the user.
- Deck comps: one `P<n>` comp per slide (3 s each) plus a `Main` stack (1 s each). Reels render `Main`; decks render `P<n>` at 1.8 s so the reveal completes.

## Acceptance criteria
- `node bin/ecm.mjs check` passes on all examples.
- `themes` lists 70 ids; every id in `themes.json` renders the 10-scene `all-scenes.json` without error.
- `slides` writes one PNG per slide at the template's ratio.
- `emphasis` renders in accent; an emphasis absent from `text` fails validation.
- Existing video output unchanged: smoke test passes end to end.

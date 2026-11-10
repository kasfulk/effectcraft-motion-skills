# Review: cold-reader scoring, the fix card, the scope check

Ported from reel-skill-chat `references/review.md`. Adapted to this skill's contact sheet: `preview` writes `X.sheet.png`, one settled frame per scene (frame at scene settle + 0.25 s). You cannot hear the video from a sheet and you cannot see motion — score what a sheet can prove, and say when it cannot.

Why this exists: a maker scores their own work about 2 points high (measured in the source repo). The score that counts comes from a reader who saw none of the work.

## The cold read

**Rules**

- Fresh reviewer each round, seeing only the sheet and the spec text. No chat history, no rationale, no earlier scores.
- Tell the reviewer what is locked: the theme, the copy the user approved, the source text, the scene types. Otherwise it spends its three problems on things nobody can change.
- One cold read per round. Never add reviewers to chase a number.
- Report the reader's scores marked `cold reader`. If you also score, mark yours `self`. Never report a score the reader did not give.
- When reader and user disagree, the user wins on taste; the reader wins only on "can a stranger follow it".

### Scoring rubric (1–10, bar is 8)

Scale: 10 = "I would send this to someone" · 7 = "good, I would watch it" · 5 = "fine and forgettable" · below 5 = a stranger swipes past. A kind score is useless; a harsh score not tied to something visible is useless too.

| Lens | Score 8+ means | Exact questions to ask of the sheet |
|---|---|---|
| **Message** | Frame 1 alone states the premise | Cover every panel except the first: can you still say what the video is about? Does the hook panel have ≤ 9 words? Is one word emphasized, and is it the pivot of the story? |
| **Hierarchy** | The eye lands where the story is, in every panel | In each panel: what do you see FIRST? (Say it before looking for it.) Is it the number, the highlight bar, or the emphasized word? If it is a decoration or a label, the panel failed. |
| **Data honesty** | Every number is the claim | Is there a `bars` panel without a highlighted bar? Does the highlighted bar match the hook's promise? Is any number unsourced? |
| **Flow / pacing** | The sheet reads as one story left to right | Cover the sheet, reveal panels one by one: does each panel add something new, or repeat the last? Two adjacent panels that say the same thing = cut one. Do the word counts fit the limits (kinetic line ≤ 4, step ≤ 7)? |
| **Consistency** | One look throughout | Are all panels recognizably the same theme (bg, font, one accent)? Does any panel look like a different video? Does `bg` alternate without whiplash? |
| **Phone viewer** | Legible at a glance, muted | Squint at each panel: is the hero text readable when the panel is thumbnail-sized? Is contrast dark-on-light or light-on-dark, never muddy? |
| **Ending** | The last panel earns a share | Does the outro say one thing ≤ 8 words and one ask ≤ 5 words? Would the payoff disappoint the hook's tease? |

**Verdict:** PASS only if every lens is 8+. Otherwise RETURN with the three worst problems, each as: panel number, what is wrong, likely cause in the spec, and a fix you can check on the next sheet.

## The "describe what you saw" template

A weak model must report observations before judgments, or it drifts to "looks good". Write these 6 lines for every review, before any score:

```
1. PANELS: <N> panels, types in order: hook, stat, bars, ...
2. FIRST THING SEEN per panel: 1:<word/shape>, 2:<...>, 3:<...>
3. HERO TEXT per panel, quoted: 1:"...", 2:"..."
4. ACCENT appears in panels: <numbers>, on: <what>
5. ODD/UNREADABLE: <panel n: exact defect, e.g. "label overlaps bar 3", "text too small to read at 50%">
6. ONE SENTENCE: this video says <...> and asks <...>.
```

Line 5 must name at least one candidate defect before scoring; an empty line 5 means the reviewer did not look. If line 6 cannot be written, the video failed Message regardless of other scores.

## The fix card

Write one before every fix to something the user or a reviewer has seen. A note is a symptom, not a spec; find the cause (which spec field produces it) before touching the JSON.

```
NOTE         <the user's words or the reviewer's problem, quoted>
CAUSE        <the spec mechanism: which field/scene makes it look that way>
SCOPE        <scene index(es) only>
KEEP         <what must not change: theme, other scenes' copy, timing, audio>
NOW          <what the current sheet shows inside SCOPE>
TARGET       <what the next sheet's frame will show, in checkable words>
NOT ALLOWED  <ways to fake it: change theme, add fx, add scenes, rewrite approved copy>
PROOF        <the new sheet: SCOPE panels changed, all other panels pixel-identical layout>
```

Rules:

- Several notes = one card each, fixed one at a time. Fix structure (scene order, scene type, data) before surface (bg, fx, emphasis).
- A card is not permission to render; preview first, and re-read the new sheet before the one render.
- If the fix needs a change the user already approved (copy, theme), ask first in one line: what changes and why.

## The scope check

Proves a fix changed only its SCOPE.

1. Keep the old sheet (`mv X.sheet.png X.sheet.before.png` or copy it) before editing the spec.
2. Edit the spec with the Edit tool (never `sed -i`).
3. Re-`preview`.
4. Compare the two sheets: every panel OUTSIDE SCOPE must be pixel-identical in layout (same text, same position, same colors). Any panel outside SCOPE that changed = the fix leaked; find what else your edit touched.

When it cannot pass: a fix that changes total duration (adding/removing a scene, changing word counts of a shared field) shifts later panels' timing, not their content — compare layouts, not timing, and say so on the card.

Sheet limits to remember while reviewing: the sheet shows each scene at settle + 0.25 s, so entrance fx (`rgbIn`, `blurIn`, `glitch`) are already finished — check them with `effectcraft-cli render-frame` if they matter (fx.md). The sheet cannot show motion quality, audio sync, or transitions; score those as "cannot verify from sheet", never as pass.

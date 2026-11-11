# Workflow: idea to MP4

Ported from the reel-skill-chat chain (idea, script, storyboard, build, review, deliver) and adapted to this skill's spec model: a JSON spec becomes a 1080x1920 30 fps MP4 through `bin/ecm.mjs` and effectcraft-cli. Follow this file top to bottom. Every gate must pass before the next step starts.

Set once:

```bash
E=~/.claude/skills/effectcraft-motion/bin/ecm.mjs
```

## The chain

```text
0 theme (4 suggested + type your own)
1 idea
2 script (copy, lines, per-beat intent)
3 storyboard / beat sheet (the spec: scenes, types, text, audio)
4 write spec, check --strict
5 preview, read every sheet panel
6 fix loop
7 cold review, score against review.md
8 render
9 report
```

### 0. Theme

Ask before anything else. Run `node $E themes --suggest <draft spec or nothing>` and show the 4 recommended themes as numbered options, each with its label and motion character (`energy/transition`), then a fifth option: "5. type your own theme id". The user may name any of the 70 from `node $E themes`.

Gate: the theme id is chosen and written into the spec. If the user is time-pressed or says "langsung", take option 1 and say which theme you used. After the beat sheet (step 3), re-run `node $E themes --suggest video.json` and confirm or update the pick.

### 1. Idea

Pick one topic and one question that pulls the whole video. One idea per video; the reel-skill-chat rule stands: two reels in a row should not tell the same story. If the user gave several topics, pick one and say which.

Gate: you can state the video in one sentence: "this video says X and asks Y".

### 2. Script

Write the copy first, as a list of lines, one idea per line, in the voice the user asked for. Full warm sentences, no jargon, no em dashes. Number each line. Mark which line is the hook (line 1, at most 9 words), which is the payoff, and which is the closing ask.

Rules that come from the source skill:

- One idea per line. If a line has two ideas, split it.
- No two lines may say the same thing. If two lines land the same point, merge them.
- The payoff must match the hook's tease exactly.
- Ending: one line that asks for a comment (one word the viewer would say anyway), and that is it.

Gate: the script reads as a story told to one person, and every line has a role.

### 3. Storyboard / beat sheet

Turn the script into beats: which line(s) share one scene, what scene type acts each beat out, and what changes from beat to beat. One beat = one idea. Two beats saying the same thing is a script bug, go back to step 2.

Pick the story shape and hook formula from [craft.md](craft.md) before writing the spec. Budget: 3 to 8 scenes, 20 to 45 s total.

A data video (the request contains numbers, statistics, comparisons, or charts) must contain at least one chart scene: `stat`, `bars` or `donut`. A kinetic text list is not a chart. If no data is available, go to "Time-pressed, no data" at the bottom.

Write the beat sheet in the reply, one line per scene:

```text
1 hook    "Gaji naik, tabungan tetap?"
2 stat    72% -- pekerja belum punya dana darurat
3 bars    Tabungan per bulan (highlight = Feb)
4 steps   Mulai dari sini (3 items)
5 outro   "Simpan video ini." / "Follow untuk tips lain"
```

Gate: the user sees the beat sheet and the message is still one sentence; for a data video at least one scene is `stat`/`bars`/`donut`.

### 4. Write the spec, check --strict

Map the beat sheet to a spec JSON. Field reference: [scenes.md](scenes.md), sound: [sound.md](sound.md), themes: [themes.md](themes.md), effects: [fx.md](fx.md). Start from a template with `node $E new <theme>` only if you need a skeleton; writing the JSON by hand is the norm.

Run the spec checklist in [craft.md](craft.md), then:

```bash
node $E check video.json --strict
```

Gate: `check --strict` exits 0. A failing check names the scene and the fix; apply the fix in the spec, re-run, until clean. `check` passing means the shape is legal, not that the content is right.

### 5. Preview, read every panel

```bash
taskpolicy -b nice -n 19 node $E preview video.json
```

`preview` writes `<basename>.sheet.png` next to the spec: one settled frame per scene, frame at scene settle + 0.25 s. Read the whole sheet with the Read tool. Every panel. Not 2 or 3.

Gate: every panel legible at phone size; no blank or lopsided panel; no two panels saying the same thing; every number matches the user's data; the theme/handle is what the user asked for.

### 6. Fix loop

For each defect on the sheet, use the fix table in SKILL.md ("Fix table") or the fix card in [review.md](review.md): find the spec field that causes it, edit only that field, re-run step 4 and step 5. Any spec edit invalidates the old sheet; re-preview and re-read before the next gate.

Gate: a fresh sheet reads clean.

### 7. Cold review

Score the sheet against [review.md](review.md): the "describe what you saw" six lines, then the rubric lenses. Bar is 8 on every lens.

Below 8 on any lens:

- Message or Flow below 8: back to step 2 or 3, the story order or line content is the problem, not the styling.
- Hierarchy or Data honesty below 8: fix the spec field (highlight, emphasis, value) in the fix loop, step 6.
- Consistency or Phone viewer below 8: theme or text length; cut words or switch the scene type, not just the colors.
- Ending below 8: rewrite the outro line and cta.

Write a fix card (review.md) before each fix. One card per problem, fix one at a time. Re-preview after each card and re-score. Do not add scenes to hide a weak one; cut instead.

Gate: every lens 8 or more, or the user explicitly accepts a below-8 lens and names it.

### 8. Render

```bash
taskpolicy -b nice -n 19 node $E render video.json
```

`render` re-runs preview inside itself and writes the MP4 to `spec.out` or `<basename>.mp4` next to the spec; with an `audio` block it muxes bed + sfx. One engine job at a time, never parallel, never backgrounded.

Carousels (deck specs): `taskpolicy -b nice -n 19 node $E slides deck.json` (add `--out <dir>` to change the output folder). There is no `check` for decks; validation runs inside `slides`. Read slide `01.png` and verify handle, source line and overflow before reporting.

Gate: the command prints the MP4 path and `total <seconds>`, and for carousels the first slide PNG is read and clean.

### 9. Report

Say in the reply: the MP4 path, the total duration, the story shape and theme chosen, and whether any number in the video came from a labelled illustration. If the user did not give data and you went number-free, say which path you took ("number-free scenes" or "labelled illustration") in one line.

## Pacing rules

- Each line of text stays on screen at least 0.2 s per word plus 0.7 s. The engine computes this: omit `duration`, auto timing is `1.2 + 0.37*words + 0.25*dataItems`, clamped 2.5 to 7 s, scaled by the theme. Set `duration` only when a hold is the point (outro 4 to 5 s, count-up stat at least 4 s).
- One idea per beat. One scene, one point. Two beats saying the same thing is a cut, not a repeat.
- Something new every scene: a new number, a turn, a new picture. A scene that only restates the previous one is deleted.
- A data video needs at least one chart scene (`stat`, `bars`, `donut`).
- Word budgets (linted by `check`, codes C04/C05): hook at most 9 words, kinetic line at most 4, step item at most 7, compare point at most 6, quote at most 24, cta at most 5, emphasis at most 3 words.

## Sound rules

The `audio` block, full rules and asset list in [sound.md](sound.md):

- Bed gain: `bedGain` around -20 dB; the bed is felt, not heard. One bed per video.
- Pan follows x. When a sound is tied to a moving element at horizontal position x, its pan is `(x - 540) / 540 * 0.7`: left-side events pan left, right-side events pan right, scaled to 0.7 so nothing reaches full stereo. The spec has no per-event pan field; apply the rule by choosing where the sfx lands in time (left-side entrance -> early `at`, right-side highlight -> the settle moment), and say the mapping in the report.
- Silence before the turn: one gap of 1 to 1.5 s with no sfx right before the payoff scene; the first sound after the gap lands on the turn.
- Weight matches the theme: soft themes (tenang, dreamy-aura, gold-vine) get only soft assets; intense themes may use the heavy hit once, on the payoff.

## What does not port from reel-skill-chat

- **HTML pages**: the source builds each reel as a hand-written `index.html` with `frame(t)`. Here the spec JSON is the page; the engine builds the JSX. Writing HTML or raw JSX defeats the spec model (SKILL.md rule 1).
- **Browser capture**: the source previews and scores with headless Chromium stills and clips. Here `preview` renders settled frames with effectcraft-cli into one sheet; motion cannot be judged from a sheet, so review.md scores only what a sheet can prove.
- **Voiceover**: the source supports ElevenLabs takes timed to beats. The spec has no voice track; the `audio` block is bed plus sfx only. Do not offer a voice line.
- **Obsidian boards**: the source keeps ideas, taste and ledger in an Obsidian vault. There is no vault here; state lives in the spec file, the sheet and the MP4 next to it.
- **Instagram posting**: the source posts and pulls 48 h stats. Nothing in this skill touches a social account; delivery stops at the MP4 and the report line.

## Time-pressed, no data

When the user is time-pressed (said "langsung", "render now", or set a deadline) and gave no data: do not stop to ask. One of two paths, then say which one in the report:

1. **Number-free scenes**: `hook`, `kinetic`, `steps`, `compare`, `quote`, `outro` only. The message must still hold without a chart; a compare or steps scene carries the structure.
2. **Labelled illustration**: a chart scene whose `title` says it is an illustration, e.g. `{"type":"bars","title":"Ilustrasi: setoran Rp100rb/bln, 6%/thun","items":[{"label":"Umur 25","value":100},{"label":"Umur 35","value":58}],"highlight":1}`. Assumptions go in the label, not silently in the values.

If the user is not time-pressed and gave no data: ask once for the numbers, or offer the illustration path with the assumption named.

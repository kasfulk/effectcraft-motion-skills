# Craft: story shapes, pacing and visual discipline

Ported from reel-skill-chat `references/story-shapes.md`, `references/hooks.json`, `references/rules.md`, `references/ideas.md`. Everything below maps onto this skill's scene types (`hook`, `kinetic` 1–6 lines, `stat`, `bars` 2–6, `donut` 0–100, `steps` 1–5, `compare`, `quote`, `outro`, `custom`) and theme system.

## Pick one story shape

One question must pull the whole reel; a list of separate facts does not hold. Pick a shape, do not invent a sequence per scene. Two reels in a row should not use the same shape.

| # | Shape | When to use | Scene sequence (word budget per scene) |
|---|---|---|---|
| 1 | **Question → evidence → answer** | Topic people search for | hook ≤ 9 words (the question) → kinetic 3–4 lines ≤ 4 words each (evidence) → quote (the answer, `source`) → outro |
| 2 | **Myth, source, cost** | A wrong belief people really hold | hook (the myth, quoted) → compare (myth vs source) → steps ≤ 4 × ≤ 7 words (what it costs / the fix) → outro |
| 3 | **Countdown, best last** | A real list from the source (never a count the source does not give) | hook ("3 hal sebelum Jumat") → steps or bars with `highlight` on the strongest item → stat (the one number that lands) → outro |
| 4 | **Open loop** | The answer is genuinely surprising | hook teases ("di akhir kamu tahu kenapa") → stat or donut (partial clues) → kinetic (build) → quote or stat (the payoff, must match the tease exactly) → outro |
| 5 | **Before / process / after** | Change over time | compare (before/after) → steps ≤ 5 × ≤ 7 words (the process) → quote (why it works) → outro |
| 6 | **Fail, try again, win** | Sabr, persistence, tawbah | hook → bars over attempts (`highlight` = the win) → quote (source after the win, never before) → outro |
| 7 | **Small act, big reward** | Do-along content with a solid source | hook (tiny act + exact reward) → stat (the reward as a number, only if the source gives one) → steps (how to do it now) → outro (`cta` = do it / comment) |
| 8 | **One word opened up** | An Arabic word worth a reel | hook (the word) → kinetic 3 lines (root, where it appears, what it changes) → quote (the ayah/hadith + `source`) → outro |
| 9 | **Read the neighbours** | A verse people quote alone | hook (the famous line) → kinetic (what comes before) → quote (the verse itself) → kinetic (what comes after) → steps 3 items (the pattern) → outro |
| 10 | **Answer first, then why** | Headline is easy, reason is not | stat or hook = the answer in the first 2 s → bars/steps/compare (the why) → outro |

Budget rule of thumb: 3–8 scenes, total 20–45 s. `check` prints the estimate; if it is outside 20–45 s, cut scenes before stretching durations.

## Hook formulas

From hooks.json (23 shapes; the 12 most useful here). On-screen hook ≤ 9 words. Every hook must be true to the source word for word; the hook is the highest-risk line. Never a riddle, a scare, a guilt hook, or another page's hook line.

| Formula | Indonesian example (≤ 9 words) | Trap |
|---|---|---|
| Direct address with a stake | "Kalau shalatmu kerasa kosong, tonton ini." | A situation so broad it names nobody. |
| Surprise fact from the source | "Al-Qur'an mengulang satu kalimat dua kali berurutan." | Strange only because a word was left out. |
| The strongest line first | "Allah tidak membebani di luar kesanggupanmu." | Famous but flat to a stranger. |
| Contrast pair | "Bukan harta. Bukan pangkat. Nabi ﷺ sebut yang lain." | Contrasting with something the source never mentions. |
| A real question the source settles | "\"Kalau dosanya sama, masih diampuni?\"" | A puzzle about who/what = riddle hook. |
| Honest count | "5 amal sebelum Jumat. Nomor 4 sering ditinggal." | A count the source does not give, or N > 7. |
| Small act, big reward | "Satu kalimat setelah wudu. Pintu-pintu langit terbuka." | Rounding the reward up, or a weak hadith. |
| Time or place anchor | "Setiap habis shalat, jangan tinggalkan doa ini." | An "every"/"always" the source does not say. |
| Permission or relief | "Tidak perlu khusyuk dulu untuk berdoa. Cukup minta." | Removing the weight and putting nothing in its place. |
| Common mistake, gently | "Kebanyakan kita baca ayat ini sendirian. Ayat sebelumnya mengubah maknanya." | "Kamu salah" with no softening = guilt hook. |
| Do it now | "Berhenti. Ucapkan SubhanAllah sekali bersamaku." | Asking for the act before the viewer knows why. |
| The checked number | "70 sahabat gugur di Uhud." | A number from a blog, not the primary text. |

Write 3 hooks from 3 different formulas, pick the one truest to the source and best matching scene 2's visual. Say why in one line.

## Pacing as hard limits

| Limit | Value | Check |
|---|---|---|
| Scenes | 3–8 | Count `scenes` |
| Hook words | ≤ 9 | Count words in scene 1 `text` |
| Kinetic line | ≤ 4 words | Longest line in `lines` |
| Step item | ≤ 7 words | Longest item in `steps` |
| Total duration | 20–45 s | `check` estimate |
| Something new per scene | every scene adds info or a turn | Read the sheet left to right: does each frame say something new? |

**When to set explicit `duration`:** omit `duration` by default (auto = `1.2 + 0.37*words + 0.25*dataItems`, clamp 2.5–7 s, × `theme.durationScale`). Set it explicitly only when (a) a `stat`/`donut` must hold for a count-up read (≥ 4 s), (b) the final `outro` should hold like a screenshot (4–5 s), or (c) `check` shows a scene racing past its own settle. Explicit durations are not scaled by the theme.

## Visual discipline

| Rule | Why | How |
|---|---|---|
| One accent color | The theme's `accent` means something each time it appears | Never override `colors.accent` mid-spec; the ported themes each carry one deliberate accent |
| One emphasis word per text scene | Two accents = no accent | `emphasis` on hook/quote/outro/kinetic: exactly one word, the story's pivot |
| `bars.highlight` = the story number | The highlighted bar is the claim | If no single bar carries the story, the bars scene is decoration; cut it or re-pick `highlight` |
| bg alternation | Two identical frames in a row read as a freeze | Pattern: hook `base` → data scenes `base` → quote `ink` → outro `accent` or `base`. Use `ink` once, mid-video, for the turn; `accent` at most once, at the payoff |
| fx budget | fx costs render time and attention | ≤ 1 spec-level fx + ≤ 1 extra per scene. Prefer theme defaults (ported themes already ship fx); add at most one more |
| Theme fit | The theme is the look; do not fight it | `reel`/`swiss-grid-poster` news+numbers · `kinetik`/`pixel-quest` high-energy · `tenang`/`dreamy-aura` soft reflective · `edukasi`/`chalkboard-lesson` lesson · `manuscript-page`/`gold-vine` direct quotes · `blueprint`/`isometric-pastel` steps and structure. See [themes.md](themes.md) |
| Data honesty | Never invent numbers | Only values from the user or a cited source; no numbers → use hook/kinetic/steps/compare and say so |
| Contrast | Readable with sound off | First frame of the sheet must state the premise alone; every frame must pass a squint test (dark text on light bg or inverse) |

## Endings

- The payoff must match the hook's tease exactly; a loud start with a small answer loses the next viewer.
- `outro.text` = one payoff line ≤ 8 words; `outro.cta` ≤ 5 words, one ask only.
- The comment ask beats "follow": pick the word the viewer would say anyway at the end (did the act → "Alhamdulillah"; learned a word → the word itself; a hope → "Ameen"). Change it from reel to reel.
- Hold the outro long enough to screenshot (duration 4–5 s).

## Islamic content (only when the request is Islamic)

Verified present in reel-skill-chat `rules.md`; apply when relevant, skip otherwise:

- Hadith: sahih or hasan only, Bukhari/Muslim first; never da'if or fabricated; a companion's words are never shown as the Prophet's ﷺ. Grading goes in `source`.
- Every number and absolute ("only", "never", "every") checked against the primary text (sunnah.com / quran.com), not memory.
- No prophet drawn, in any form (this skill draws no figures anyway; keep it that way in `custom` JSX).
- Qur'an Arabic on screen is never read by a computer voice; a `quote` scene with the verse held to read is the safe equivalent here.
- A made-up story (parable) is allowed only if every lesson rests on a checked text and it claims nothing the text does not say.

## Spec checklist before preview

Run this list against the JSON before `preview`:

1. One theme picked; no `colors` override unless the user asked.
2. 3–8 scenes; total 20–45 s per `check`.
3. Scene 1 is `hook`, ≤ 9 words, from a formula above.
4. Scene 2 delivers on the hook within the first 5 s (no long preamble).
5. One `emphasis` word per text scene, and it is the story's pivot.
6. Every `bars` scene has `highlight` on the story number.
7. No invented values; every `value`/`item` traces to the user or a cited source.
8. `bg` alternates; `ink` or `accent` used at most once each, at the turn / payoff.
9. fx: theme defaults + at most one spec-level + one per scene; no `liquid`+`paper` together.
10. Last scene is `outro` with `text` ≤ 8 words and `cta` ≤ 5 words.
11. `transition` per scene only where the story turns (see scenes.md); default `fade` at spec level, `cut` is fine between fast scenes.
12. `audio` follows [sound.md](sound.md): sparse, one moment at a time, bed ≈ -20 dB.

Then `preview`, read the whole sheet with [review.md](review.md), fix the spec, and only then `render`.

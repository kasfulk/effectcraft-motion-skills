# Verification — 2026-11-11-145725

Issue: Claude Desktop rejects the skill zip — "Zip contains too many files (maximum 200)".

## Payload size

| Check | Command | Result |
|---|---|---|
| Tracked files before | `git ls-files \| wc -l` | **265** |
| Tracked files after | `git ls-files \| wc -l` | **108** (107 + this session's state file) |
| Working tree, excluding `.git` | `find . -path ./.git -prune -o -type f -print \| wc -l` | **123** |
| Claude Desktop cap | — | 200 |

If the uploader also counts `.git` (951 files), zip without it:
`zip -r effectcraft-motion.zip . -x '.git/*'`.

## Fonts served by URL, not bundled

`assets/fonts/` now holds only `fonts.json` (87 PostScript-name → `{family, style, weight, category, file}` entries).

```
$ node bin/ecm.mjs fonts
87 known fonts in .../assets/fonts — run --install to download them
```

Download path proven by deleting an installed font and reinstalling:

```
$ rm ~/Library/Fonts/Anton-400.ttf
$ node bin/ecm.mjs fonts --install
downloaded 1 of 87 fonts to /Users/kasjfulkurniawan/Library/Fonts (0 failed)
exit=0
$ ls -l ~/Library/Fonts/Anton-400.ttf
-rw-r--r--  130324 Nov 11 14:59 Anton-400.ttf
$ fc-scan --format '%{postscriptname} | %{family} | %{style}\n' ~/Library/Fonts/Anton-400.ttf
Anton-Regular | Anton | Regular
```

The downloaded face resolves to the PostScript name the manifest and `themes.json` expect.

CSS endpoint returns `.ttf` (not `.woff2`) for the required UA, sampled across five families:

```
$ curl -fsSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&display=swap" | grep -o 'url(https:[^)]*\.ttf)'
url(https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXooxW4.ttf)
```
Also verified for `Inter`, `Source+Sans+3`, `Noto+Naskh+Arabic`, `Press+Start+2P`.

```
$ node bin/ecm.mjs fonts --check
all 70 themes use installed fonts
exit=0
```

## Tests

```
$ node --test test/*.test.mjs
ℹ tests 46  ℹ pass 46  ℹ fail 0
```

`test/smoke.sh` does **not** pass, and did not pass before this change. Three assertions are
stale against the engine as it ships. Verified on a clean `HEAD` worktree:

| Failing assertion | Observed | Verdict |
|---|---|---|
| `donut_track` expects layer 4 opacity 30 | engine reports `100.0` | reproduced on `HEAD` — pre-existing |
| `run_failure 'assertFonts(...)'` | `ReferenceError: assertFonts is not defined` | pre-existing: `assertFonts` was removed from `lib/core.jsx` and the generated script in session `2026-11-11-010129`, per that session's review (`assertFonts(THEME)` calls removed; Node-side `checkFonts` replaces it). The smoke line was left behind. |
| `cta_early` expects outro CTA opacity ≈ 0 at t=0.3 | engine reports `100.0` | pre-existing |

Reproduction on `HEAD` (worktree at `/tmp/ecm-head`):

```
$ node bin/ecm.mjs preview /tmp/donut.json
$ effectcraft-cli get S1_donut 4 transform/opacity --time 1.5 --json /tmp/donut.ecproj
{"type":"scalar","value":100.0,...}
```

Left untouched: deciding whether those three are stale expectations or a real animation regression
is a separate investigation, and deleting the assertions would hide a possible regression.

## What the smoke runs actually covered

Each smoke run stops at its first failing assertion, so no single run reached the end. Staging
the evidence honestly:

| Run | Lines removed from the copy | Reached | Passed before stopping |
|---|---|---|---|
| `test/smoke.sh` | none | `donut_track` | 46 unit tests, hostile preview, untitled-bars, 6 theme previews, counter checks, both `text too long` rejections |
| copy | `donut_track` | `assertFonts` | the above plus `compare-ink`, `steps-ink-title`, `donut-opacity`, `nolabel`, every `run_failure`/`run_success` before the font case |
| copy | `donut_track`, `assertFonts` | `cta_early` | the above plus all `run_failure`/`run_success`, the slides deck render, the render-lock refusal |

Stages the suite places **after** `cta` — the MP4 render and the audio mux — were never reached
by any smoke run. They were exercised directly instead:

```
$ node bin/ecm.mjs render examples/hemat.json
total  18.37
examples/hemat.mp4        exit=0

$ node --test test/*.test.mjs   →   ✔ audio: real ffmpeg mux on a generated black video
```

So: every stage up to and including the slides deck and the render lock is proven on this tree;
the render and audio stages are proven by direct execution, not by `smoke.sh`.

## What gets uploaded

`git archive` of the shipped commit — no `.git`, no generated media:

```
$ git archive -o /tmp/skill.zip HEAD && unzip -l /tmp/skill.zip | tail -1
 18041468                     127 files          (16 MB)
```

127 entries including directory headers; 109 actual files. Cap is 200.

## Installer correctness beyond the 400-weight case

`fonts --install` takes the first `url(…ttf)` from the css2 response, so the response shape
matters. Checked:

```
$ curl -fsSL -A "Mozilla/4.0" "…family=Noto+Naskh+Arabic:wght@400…" | grep -c "@font-face"
1                                   # one block per family at this UA — no unicode-range subsetting
                                    # to pick the wrong one from
$ rm ~/Library/Fonts/Inter-700.ttf && node bin/ecm.mjs fonts --install
downloaded 1 of 87 fonts to …/Library/Fonts (0 failed)
$ fc-scan --format '%{postscriptname} | %{style}\n' ~/Library/Fonts/Inter-700.ttf
Inter-Bold | Bold                   # 700 request lands on the bold face, not the 400
```

The `downloaded 1 of 87` line is also the idempotency proof: the other 86 on-disk names matched
the manifest basenames and were skipped.

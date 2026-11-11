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

Everything the smoke suite exercises up to the `cta` assertion passes when the two dead
assertions are removed from a copy of the script — 46 unit tests, every preview, every theme,
the deck render, and the render lock.

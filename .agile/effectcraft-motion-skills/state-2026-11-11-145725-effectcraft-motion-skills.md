scope: effectcraft-motion-skills
session: 2026-11-11-145725-effectcraft-motion-skills
stage: COMPLETE
status: DONE
updated: 2026-11-11 15:24
completed: [intake, coding, code_review, testing, verification, commit, push]
current: []
next: []

intake: BUG (compressed path)

## Problem
Claude Desktop skill upload rejects the zip: "Zip contains too many files (maximum 200)".
Repo tracked 265 files; `assets/fonts` alone was 157 files (12 MB of TTFs + per-family OFL.txt).

## Change
- `assets/fonts/fonts.json` (87 entries) stays tracked. Its `file` field was normalised from a
  dead repo path (`assets/fonts/inter/Inter-400.ttf`) to the bare filename (`Inter-400.ttf`),
  which is what the installer writes into the OS font directory.
- `node bin/ecm.mjs fonts --install` no longer copies from the repo. It downloads every manifest
  font the machine lacks from the Google Fonts css2 API (`Mozilla/4.0` UA returns `.ttf`),
  straight into `~/Library/Fonts` (`~/.local/share/fonts` on Linux). Idempotent, exits non-zero
  if any download fails.
- Deleted 156 font binaries and `scripts/fetch-fonts.mjs` + `scripts/remap-theme-fonts.mjs`,
  one-shot generators whose outputs are now the committed manifest and `themes.json`.
- Docs updated: `SKILL.md`, `reference/cli.md`, `README.md`, `assets/LICENSES.md`.

265 -> 108 tracked files; 123 files in the working tree excluding `.git`.

skipped:
- DEEP_RESEARCH: no external uncertainty; the Google Fonts css2 download path already existed in-repo.
- Packaging script: 123 files is under the 200 cap without one. If the uploader also counts `.git`
  (951 files), zip with `-x '.git/*'`. Add `scripts/pack-skill.mjs` only if the payload grows again;
  next lever after fonts would be `assets/sfx` (47 files).
- `test/smoke.sh` repairs: three assertions already failed on `HEAD` (donut layer 4 opacity,
  removed `assertFonts`, outro CTA early opacity). Evidence in the verification artifact. Fixing
  them needs a decision on whether the engine or the expectation is wrong — separate work.

## Shipped
commit `5aac610` on `main`, pushed to `origin/main`.

## Notes for the upload
- `zip -r skill.zip . -x '.git/*'` -> 146 entries (cap 200). `.git` holds 951 files, so it must
  stay out.
- Generated render artifacts (`*.mp4` 219 MB, `*.ecproj`, `*.sheet.png`; 9 files) are gitignored
  but present locally. Exclude them to keep the upload small.

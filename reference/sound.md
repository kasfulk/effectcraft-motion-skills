# Sound: bed and sfx rules for the `audio` field

Ported from reel-skill-chat `references/sound.md` and `references/rules.md` (Sound). Adapted to this skill's shape:

```json
"audio": {"bed": "<name or path>", "bedGain": -20,
          "sfx": [{"at": 3.2, "name": "keypress-001", "gain": -8},
                  {"scene": 2, "name": "thunder-1"}]}
```

`at` = seconds on the final timeline; `scene` = 0-based scene start time. Names resolve under `assets/sfx/beds/` (bed) and `assets/sfx/` (sfx). Use only real names; run `ls assets/sfx assets/sfx/beds` first. Field details live in [scenes.md](scenes.md), not here.

## Real assets on disk

| Beds (`assets/sfx/beds/`) | Sfx (`assets/sfx/`) |
|---|---|
| `birds` (dawn), `breeze` (soft), `crickets` (night), `desert-wind`, `fireplace` (cozy), `forest` (calm), `insects` (evening), `jungle`, `ocean` (lapping), `rain`, `sea`, `wind` (gusty), `wind-v1` | `bong_001`; `card-slide-1`; `chips-collide-1..4` (soft ticks); `drop_001`, `drop_002` (plink); `impactBell_heavy_000/003`; `impactGlass_light_000..004`; `impactSoft_heavy_002` (thud), `impactSoft_medium_001` (tap); `impactWood_light_000..004`; `keypress-001..006` (.wav); `thunder-1..6` (.m4a) |

`assets/sfx-kit/` holds only catalogue metadata here (no `sounds/` wav dir), so kit ids are not usable in specs; the list above is the usable palette.

## Hard rules

1. **Sparse.** About 1 sfx per 3–5 s of final video. A 30 s video: 6–10 sfx. Never two sfx within 0.5 s of each other.
2. **One at a time.** No stacked pair on one moment (no pop + tick on the same `at`).
3. **Silence before the turn.** At least one gap of 1–1.5 s with no sfx just before the payoff scene; the first sound after that silence lands on the turn itself.
4. **Bed stays under.** `bedGain` ≈ -20 dB under speech-level content; felt more than heard — if you notice the bed on first listen, it is too loud. One bed per video unless the story changes world.
5. **Match weight to scene.** Soft/warm reels (tenang, dreamy-aura, gold-vine): only `drop`, `chips-collide`, `impactGlass_light`, `impactSoft_medium`, `keypress`, `impactWood_light`, `impactBell_heavy`. No `bong`, `impactSoft_heavy`, `thunder` at all. Intense reels (kinetik, cinematic, pixel-quest) may use `bong_001` once on the hook and `thunder`/`impactSoft_heavy` on the payoff only — never on repeat plays of the same beat.
6. **Fade out.** The bed must fade at the end so the last scene settles; do not end on a hard bed cut.
7. **Banned scratchy sounds.** No pen/pencil/chalk/marker writing, paper, fabric or plastic slides — none exist on disk here anyway; do not add them. A counter ticks only on its last few steps, not per character.
8. **Sync.** Place `at` on the frame the event settles (the sheet frame is scene start + settle; sfx after that, never before). `scene` is the cheap way to hit a scene entrance.

## Scene-type → sfx role

| Scene type | Sfx role | Asset (all real names) |
|---|---|---|
| `hook` | one soft hit or the bed simply starting; sound at 0.0 s, never a slow fade-in | `impactBell_heavy_000` (soft reels) or `bong_001` (intense reels only) |
| `kinetic` | silent, or one soft tick per 2nd–3rd line at most | `chips-collide-1` |
| `stat` | count-up → soft ticks on the last few steps only | `chips-collide-2` ×2–3 |
| `bars` | one whoosh when the highlight bar lands, nothing else | `card-slide-1` |
| `donut` | one light ping when the ring completes | `impactGlass_light_000` |
| `steps` | silent, or one soft tap when the last step lands | `impactSoft_medium_001` |
| `compare` | one soft slide on the second card's entrance | `card-slide-1` |
| `quote` | silence (let it read), or one drop after it settles | `drop_001` |
| `outro` | one soft resolving hit on the cta | `impactBell_heavy_003` |
| transition turn (`fade`/`dip` into the payoff) | the heaviest allowed sound, right after the silence | `impactSoft_heavy_002` (intense) / `drop_002` (soft) |

## Bed choice by content

| Bed | Use when |
|---|---|
| `sea` / `rain` / `breeze` | soothing scenes: mercy, comfort, reflection (tenang-style) |
| `wind` / `desert-wind` | intense scenes: warnings, hardship, the unseen |
| `birds` | dawn, beginnings |
| `crickets` / `insects` | night, endings |
| `fireplace` | cozy, home, community |
| `forest` / `jungle` | nature, growth |
| `ocean` | gentle scale, calm |

## Complete example

A 5-scene, ~28 s reel, theme `tenang`:

```json
{
  "theme": "tenang",
  "transition": "fade",
  "audio": {
    "bed": "sea",
    "bedGain": -20,
    "sfx": [
      {"scene": 0, "name": "impactBell_heavy_000", "gain": -10},
      {"scene": 1, "name": "chips-collide-2", "gain": -14},
      {"scene": 2, "name": "chips-collide-3", "gain": -14},
      {"at": 17.5, "name": "impactGlass_light_000", "gain": -12},
      {"scene": 3, "name": "drop_001", "gain": -12},
      {"scene": 4, "name": "impactBell_heavy_003", "gain": -10}
    ]
  },
  "scenes": [
    {"type": "hook", "text": "Satu kalimat setelah wudu.", "emphasis": "satu"},
    {"type": "stat", "value": 8, "label": "pintu langit"},
    {"type": "donut", "value": 100, "label": "ampunan bagi yang berwudu"},
    {"type": "quote", "text": "Ya Allah, jadikan aku orang yang bertobat dan bersuci.", "source": "TIRMIDZI"},
    {"type": "outro", "text": "Ucapkan sekarang.", "cta": "Tulis: Aku siap"}
  ]
}
```

Checklist: 6 sfx over ~28 s (≈1 per 4.7 s) · no two within 0.5 s · one soft weight throughout (tenang) · quiet stretch before scene 3's ping · one bed at -20 dB · final bell resolves the outro.

## What was deliberately not ported

The source's LUFS measurement loop, `mix.py` fixed boost, kit-sound fetching, ElevenLabs voice and code-made `boom`/`rise` do not map onto this skill's declarative `audio` field. Levels here are simple `gain` dB per event; if a render sounds off, lower `gain` (halving amplitude ≈ -6 dB) rather than adding more sfx.

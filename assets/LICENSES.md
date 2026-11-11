# Assets: sources and licenses

Extracted from `reel-skill-chat/assets.tar.gz` (free from @barakahraaz on Instagram, not for sale). Provenance as stated in that skill's `references/sound.md`.

| Path | Source | License |
|---|---|---|
| `sfx/*.ogg`, `sfx/keypress-*.wav` (`bong`, `card-slide`, `chips-collide`, `drop`, `impact*`) | Kenney sound packs | CC0 |
| `sfx/thunder-1..6.m4a` | SFXMint ambience clips | CC0 |
| `sfx/beds/{wind,breeze,desert-wind,ocean,forest,jungle,insects,fireplace}.m4a` | 60 s loops crossfaded from SFXMint clips | CC0 |
| `sfx/beds/{sea,rain,birds,crickets,wind-v1}.m4a` | 60 s loops cut from Freesound (CC0 filter) and Mixkit samples | CC0 / Mixkit License (mixed; not itemised upstream) |
| `sfx-kit/` (metadata only: `sounds.json`, `catalogue.md`, `GUIDE.md`, `analysis.json`) | [wyzowl/sfx-kit](https://github.com/wyzowl/sfx-kit) | CC0, see `sfx-kit/LICENSE` |

The OFL/Apache fonts are no longer redistributed here; `node bin/ecm.mjs fonts --install` downloads them from Google Fonts (SIL OFL 1.1 / Apache 2.0 as published upstream) into the user's font directory.

The 320 SFX Kit WAVs are not stored here; `sounds.json` lists each file with its sha256 for download on demand.

The Mixkit License allows use inside videos but not redistributing the sound files on their own. The five beds in the mixed row may include Mixkit material.

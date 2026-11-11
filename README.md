# effectcraft-motion

Skill untuk mengubah spec JSON menjadi video motion graphics 9:16 berbentuk MP4 melalui `effectcraft-cli`, atau menjadi deck carousel 3:4/4:5/1:1 berupa PNG per slide. Pipeline ini memvalidasi scene, membuat project EffectCraft, menghasilkan contact sheet, lalu merender video.

## Kebutuhan

- `effectcraft-cli` (di `PATH`)
- Node.js ≥ 20
- ImageMagick 7 (`magick`) atau IM6 bawaan Ubuntu (`convert`/`montage`), di `PATH`
- `ffmpeg` dan `ffprobe` (di `PATH`; `/opt/homebrew/bin` dipakai sebagai fallback di macOS)

Jalan di macOS dan Linux (Ubuntu/Debian). `bin/ecm` menangani bedanya: prioritas rendah
lewat `taskpolicy -b nice -n 19` di macOS dan `nice -n 19` di Linux. Font dipasang ke
`~/Library/Fonts` (macOS) atau `~/.local/share/fonts` + `fc-cache` (Linux).

Pasang dependensi:

```sh
# macOS
brew install node imagemagick ffmpeg
# Ubuntu/Debian
sudo apt install nodejs imagemagick ffmpeg fontconfig
```

Pasang skill secara lokal:

```sh
ln -s "$PWD" ~/.claude/skills/effectcraft-motion   # macOS/Claude Code
ln -s "$PWD" ~/.hermes/skills/creative/effectcraft-motion   # Hermes
```

## Mulai cepat

```sh
bin/ecm themes                     # daftar 70 theme
bin/ecm new reel spec.json         # spec starter untuk theme reel
bin/ecm slides deck.json --out deck-slides/   # render satu PNG per slide
bin/ecm check examples/hemat.json
bin/ecm fonts --check              # pastikan semua font terpasang; `fonts --install` mengunduh font yang belum ada dari Google Fonts
bin/ecm preview examples/hemat.json
bin/ecm render examples/hemat.json
```

`check` hanya memvalidasi dan menghitung durasi. `preview` membuat project serta contact sheet. `render` menulis MP4 di samping spec. Jalankan satu proses engine pada satu waktu.



Referensi:

- [Scene types](reference/scenes.md)
- [Themes](reference/themes.md)
- [Templates](reference/templates.md)
- [CLI dan pitfall](reference/cli.md)
- [Craft, story shapes and pacing](reference/craft.md)
- [Sound: bed and sfx rules](reference/sound.md)
- [3D models](reference/3d.md)
- [Cold-reader review of the contact sheet](reference/review.md)
- [Platform notes: macOS + Linux](PLATFORM-NOTES.md)

Tes smoke lengkap memakai engine secara serial:

```sh
bash test/smoke.sh
```

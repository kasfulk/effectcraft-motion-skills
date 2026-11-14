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
bin/install   # link ke ~/.agents/skills (Codex, Gemini CLI, Cline, OpenCode, omp) + Claude Code/Hermes/Pi/Kimi bila ada, dan `ecm` ke ~/.local/bin
bin/install ~/path/skills-harness-lain   # harness lain: sebut folder skills-nya
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
- [Free asset sources: fonts, SVG, 3D, effects, sound, 2D animation toolkits](reference/assets.md)
- [Cold-reader review of the contact sheet](reference/review.md)
- [Platform notes: macOS + Linux](PLATFORM-NOTES.md)

Tes unit (cepat, tanpa render):

```sh
npm test
```

Tes smoke lengkap memakai engine secara serial:

```sh
bash test/smoke.sh
```

Lisensi: [MIT](LICENSE). Font, SFX dan model 3D punya lisensinya masing-masing — lihat [assets/LICENSES.md](assets/LICENSES.md).

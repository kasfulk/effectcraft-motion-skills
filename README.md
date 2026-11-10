# effectcraft-motion

Skill untuk mengubah spec JSON menjadi video motion graphics 9:16 berbentuk MP4 melalui `effectcraft-cli`, atau menjadi deck carousel 3:4/4:5/1:1 berupa PNG per slide. Pipeline ini memvalidasi scene, membuat project EffectCraft, menghasilkan contact sheet, lalu merender video.

## Kebutuhan

- `effectcraft-cli`
- Node.js ≥ 20
- ImageMagick (`magick`)
- `ffmpeg` dan `ffprobe`

Pasang skill secara lokal:

```sh
ln -s "$PWD" ~/.claude/skills/effectcraft-motion
```

## Mulai cepat

```sh
node bin/ecm.mjs themes                    # daftar 70 theme
node bin/ecm.mjs new reel spec.json         # spec starter untuk theme reel
node bin/ecm.mjs slides deck.json --out deck-slides/   # render satu PNG per slide
node bin/ecm.mjs check examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs preview examples/hemat.json
taskpolicy -b nice -n 19 node bin/ecm.mjs render examples/hemat.json
```

`check` hanya memvalidasi dan menghitung durasi. `preview` membuat project serta contact sheet. `render` menulis MP4 di samping spec. Jalankan satu proses engine pada satu waktu.

Referensi:

- [Scene types](reference/scenes.md)
- [Themes](reference/themes.md)
- [Templates](reference/templates.md)
- [CLI dan pitfall](reference/cli.md)
- [Craft, story shapes and pacing](reference/craft.md)
- [Sound: bed and sfx rules](reference/sound.md)
- [Cold-reader review of the contact sheet](reference/review.md)

Tes smoke lengkap memakai engine secara serial:

```sh
taskpolicy -b nice -n 19 bash test/smoke.sh
```

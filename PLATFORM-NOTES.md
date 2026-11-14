# Platform notes (macOS + Linux)

The pipeline runs on macOS and Linux (Ubuntu/Debian). Everything platform-specific is
handled in-repo; nothing here needs a manual patch.

## Launcher

`bin/ecm` is the only entry point. It applies low priority the way each OS expects:

- macOS: `taskpolicy -b nice -n 19` (falls back to `nice -n 19` if taskpolicy is absent)
- Linux: `nice -n 19`

Never call `node bin/ecm.mjs` directly — you lose the priority handling.

## Binary resolution

`bin/ecm.mjs` resolves `ffmpeg`/`ffprobe` from `PATH` first, then falls back to
`/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`. `effectcraft-cli` is expected on `PATH`.

ImageMagick works either way: version 7 (`magick`, plus `magick montage`) or the IM6 that
ships with Debian/Ubuntu (`convert`, `montage`, `identify`). The code picks whichever exists.

## Fonts

`bin/ecm fonts --install` downloads the theme fonts from Google Fonts (OFL) into
`~/Library/Fonts` on macOS and `~/.local/share/fonts` on Linux, skipping any file already
present, then runs `fc-cache` only where fontconfig exists. It needs network access; there
is no offline bundle.

## Contact-sheet labels

`magick montage` needs a label font. The code tries `/System/Library/Fonts/Helvetica.ttc`
(macOS), then `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` (Linux), then omits
`-font` and lets ImageMagick pick its default.

## Dependencies

```sh
# macOS
brew install node imagemagick ffmpeg
# Ubuntu/Debian
sudo apt install nodejs imagemagick ffmpeg fontconfig
```

## Pitfalls

- The render lock is a **directory** `/tmp/ecm-render.lock`. A hard-killed render (timeout,
  SIGKILL) leaves it behind and every later render exits with "another render is running".
  Clear it with `rm -rf /tmp/ecm-render.lock`, not `rm -f`.
- A killed render also leaves a truncated `.mp4` (no moov atom). Delete it before re-rendering.
- An 18 s reel takes ~4 min to render on a laptop. Run it in the background, not in a
  180 s foreground call.
- One engine process at a time — serial only.

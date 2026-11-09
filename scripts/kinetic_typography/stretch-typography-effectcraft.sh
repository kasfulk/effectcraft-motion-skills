#!/usr/bin/env bash
# stretch-typography-effectcraft.sh
# Animasi Teks Stretchy & RGB Split menggunakan CC Scale Wipe dan Shift Channels

set -e

PROJECT_FILE="stretch_typography.ecproj"
COMP_NAME="StretchTypographyComp"
OUTPUT_VIDEO="stretch_typography_demo.mp4"

echo "=== 1. Membuat Proyek & Komposisi Teks ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextComp","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"MainText","text":"HYPER VIBES","size":140,"color":"#ffffff"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 1 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

echo "=== 2. Membuat Komposisi Utama Render ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#050505","width":1920,"height":1080}' \
  "$PROJECT_FILE"

# Mengimpor layer teks
effectcraft-cli exec layer.addComp \
  --params '{"compName":"TextComp"}' \
  "$PROJECT_FILE"

echo "=== 3. Menambahkan Efek CC Scale Wipe (Stretch Animation) ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "CCScaleWipe" \
  --values '{"stretch": 100, "direction": 90}' \
  "$PROJECT_FILE"

# Keyframe animasi center peregangan (Scale Wipe reveal)
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/CCScaleWipe/center" \
  --keys '[{"time":0,"value":[0,540]},{"time":1.5,"value":[1920,540]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

# Menambahkan Glow halus
effectcraft-cli add_effect \
  --layer 2 \
  --effect "Glow" \
  --values '{"glowThreshold": 80, "glowRadius": 120, "glowIntensity": 0.8}' \
  "$PROJECT_FILE"

echo "=== 4. Menambahkan Zoom Transform & RGB Split Glitch ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "ShiftChannels" \
  --values '{"takeRed": "red", "takeGreen": "off", "takeBlue": "off"}' \
  "$PROJECT_FILE"

echo "=== 5. Render Preview Frame pada Detik ke-1.0 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 1.0 \
  --out "preview_stretch_typography.png" \
  "$PROJECT_FILE"

echo "=== 6. Perenderan Akhir ke MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Stretch Typography Selesai: $OUTPUT_VIDEO"

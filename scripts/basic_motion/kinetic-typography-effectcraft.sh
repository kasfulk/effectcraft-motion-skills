#!/usr/bin/env bash
# kinetic-typography-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk animasi tipografi kreatif (Kinetic Typography)
# Berdasarkan teknik AE: Range Selector, Text to Path, Echo Trails, dan RGB Split Zoom.

set -e

PROJECT_FILE="kinetic_typography.ecproj"
COMP_NAME="KineticTypographyComp"
OUTPUT_VIDEO="kinetic_typography.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi Teks ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":6}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Gelap Minimalis ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG_Solid","color":"#0F111A","width":1920,"height":1080}' \
  "$PROJECT_FILE"

echo "=== 3. Animasi Teks Utama dengan Range Selector & Blur/Position Reveal ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Title_Text","text":"ULTIMATE PRODUCT","size":120,"fill":"#FFFFFF","font":"Montserrat-Bold"}' \
  "$PROJECT_FILE"

# Atur posisi tengah
effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

# Tambahkan Text Animator dengan Range Selector (Ramp Up, Ease High/Low)
effectcraft-cli add_effect \
  --layer 2 \
  --effect "TextAnimator" \
  --values '{
    "animatorType": "rangeSelector",
    "shape": "rampUp",
    "easeHigh": 80,
    "easeLow": -50,
    "positionOffset": [0, 150],
    "opacityOffset": 0,
    "blurOffset": [20, 20]
  }' \
  "$PROJECT_FILE"

# Keyframe offset Range Selector dari 0% ke 100%
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/TextAnimator/selectorStart" \
  --keys '[{"time":0.3,"value":0},{"time":1.8,"value":100}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 4. Tipografi Melingkar (Text to Circular Path) ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Circular_Text","text":"* PREMIUM QUALITY * LIMITED EDITION * CREATIVE MOTION ","size":36,"fill":"#FFAE33"}' \
  "$PROJECT_FILE"

# Terapkan ekspresi path melingkar & rotasi kontinu
effectcraft-cli set_property \
  --layer 3 \
  --path "text/pathOption" \
  --values '{"pathType":"circle","radius":320,"reversePath":false}' \
  "$PROJECT_FILE"

effectcraft-cli set_property \
  --layer 3 \
  --path "transform/rotation" \
  --expression "time * 45" \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

echo "=== 5. Efek RGB Split Zoom & Echo Trails pada Transisi Teks ==="
# Duplikasi layer untuk efek chromatic aberration / RGB Split
effectcraft-cli exec layer.duplicate --layer 2 "$PROJECT_FILE" # Layer 4 (Red Shift)
effectcraft-cli exec layer.duplicate --layer 2 "$PROJECT_FILE" # Layer 5 (Blue Shift)

effectcraft-cli add_effect --layer 4 --effect "ShiftChannels" --values '{"takeRedFrom":"red","takeGreenFrom":"none","takeBlueFrom":"none"}' "$PROJECT_FILE"
effectcraft-cli add_effect --layer 5 --effect "ShiftChannels" --values '{"takeRedFrom":"none","takeGreenFrom":"none","takeBlueFrom":"blue"}' "$PROJECT_FILE"

# Geser posisi R & B dengan ekspresi cepat saat zoom
effectcraft-cli set_property --layer 4 --path "transform/position" --expression "[960 + Math.sin(time*20)*8, 540]" "$PROJECT_FILE"
effectcraft-cli set_property --layer 5 --path "transform/position" --expression "[960 - Math.sin(time*20)*8, 540]" "$PROJECT_FILE"

# Efek Echo Trail
effectcraft-cli add_effect \
  --layer 2 \
  --effect "Echo" \
  --values '{"echoTime": -0.02, "numberOfEchoes": 4, "decay": 0.7}' \
  "$PROJECT_FILE"

echo "=== 6. Render Frame Preview (Detik 1.2) & Render Akhir ==="
effectcraft-cli render-frame --comp "$COMP_NAME" --time 1.2 --out "preview_typography.png" "$PROJECT_FILE"
effectcraft-cli render --comp "$COMP_NAME" --out "$OUTPUT_VIDEO" --format h264 "$PROJECT_FILE"

echo "Kinetic Typography Selesai: $OUTPUT_VIDEO"

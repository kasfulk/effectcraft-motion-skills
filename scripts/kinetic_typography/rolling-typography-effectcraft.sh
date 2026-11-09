#!/usr/bin/env bash
# rolling-typography-effectcraft.sh
# Animasi Rolling Typography Strip menggunakan CC Cylinder dan CC Repetile

set -e

PROJECT_FILE="rolling_typography.ecproj"
COMP_NAME="RollingTypographyComp"
OUTPUT_VIDEO="rolling_typography_demo.mp4"

echo "=== 1. Membuat Komposisi Teks & Strip ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextPlaceholder","width":2000,"height":800,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"RollingText","text":"MOTION GRAPHICS PRO","size":120,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Komposisi Strip dengan CC Repetile
effectcraft-cli exec comp.new \
  --params '{"name":"StripComp","width":1000,"height":8000,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TextPlaceholder"}' "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "CCRepetile" \
  --values '{"expandLeft": 3200, "expandRight": 3200, "tiling": "repeat"}' \
  "$PROJECT_FILE"

echo "=== 2. Komposisi Silinder 3D (CC Cylinder) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"Roll3DComp","width":2000,"height":2000,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TextPlaceholder"}' "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "CCCylinder" \
  --values '{"shadingAmbient": 100, "radius": 100}' \
  "$PROJECT_FILE"

# Animasi Rotasi Y Silinder
effectcraft-cli set_property --layer 1 --path "effects/CCCylinder/rotationY" --expression "time * 90" "$PROJECT_FILE"

echo "=== 3. Penggabungan di Render Comp Utama & Camera Shake ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#0c0a09","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"StripComp"}' "$PROJECT_FILE"
effectcraft-cli exec layer.addComp --params '{"compName":"Roll3DComp"}' "$PROJECT_FILE"

# Skala & Rotasi Strip
effectcraft-cli set_property --layer 2 --path "transform/rotation" --value -45 "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/scale" --value '[35, 35]' "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/scale" --value '[40, 40]' "$PROJECT_FILE"

# Wiggle ekspresi pada Adjustment Layer (Camera shake)
effectcraft-cli exec layer.newAdjustment \
  --params '{"name":"CameraWiggle"}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 4 \
  --effect "Transform" \
  --values '{}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "effects/Transform/position" --expression "wiggle(1, 12)" "$PROJECT_FILE"

echo "=== 4. Render Preview Frame & Output ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.0 \
  --out "preview_rolling_typography.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Rolling Typography Selesai: $OUTPUT_VIDEO"

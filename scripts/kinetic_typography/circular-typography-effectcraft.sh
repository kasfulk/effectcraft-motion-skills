#!/usr/bin/env bash
# circular-typography-effectcraft.sh
# Animasi Circular Text Typography pada Mask Path dengan Depth Feathering

set -e

PROJECT_FILE="circular_typography.ecproj"
COMP_NAME="CircularTypographyComp"
OUTPUT_VIDEO="circular_typography_demo.mp4"

echo "=== 1. Membuat Komposisi Teks Melingkar (Text to Mask Path) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"CircularTextComp","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"CircleText","text":"TYPOLOGY MOTION CIRCULAR DESIGN ","size":80,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Mengaplikasikan Mask Ellipse melingkar pada Teks
effectcraft-cli exec mask.add \
  --layer 1 \
  --type "ellipse" \
  --params '{"center":[960,540],"radiusX":400,"radiusY":400}' \
  "$PROJECT_FILE"

# Menghubungkan Text Path ke Mask 1 & Set Reverse Path = True
effectcraft-cli set_property --layer 1 --path "text/pathOption/path" --value "Mask 1" "$PROJECT_FILE"
effectcraft-cli set_property --layer 1 --path "text/pathOption/reversePath" --value true "$PROJECT_FILE"

# Keyframe Rotasi Last Margin (Looping)
effectcraft-cli add_keyframe \
  --layer 1 \
  --path "text/pathOption/lastMargin" \
  --keys '[{"time":0,"value":0},{"time":2.5,"value":400},{"time":5,"value":0},{"time":7.5,"value":400},{"time":10,"value":0}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 2. Multi-Ring Layering dengan Mask Feather Depth & Scaling ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#020617","width":1920,"height":1080}' \
  "$PROJECT_FILE"

# Cincin 1 (Paling Luar)
effectcraft-cli exec layer.addComp --params '{"compName":"CircularTextComp"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "collapseTransformation" --value true "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/scale" --value '[120, 120]' "$PROJECT_FILE"

# Cincin 2 (Tengah)
effectcraft-cli exec layer.addComp --params '{"compName":"CircularTextComp"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "collapseTransformation" --value true "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "transform/scale" --value '[85, 85]' "$PROJECT_FILE"
effectcraft-cli add_effect \
  --layer 3 \
  --effect "Fill" \
  --values '{"color": "#38bdf8"}' \
  "$PROJECT_FILE"

# Cincin 3 (Paling Dalam)
effectcraft-cli exec layer.addComp --params '{"compName":"CircularTextComp"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "collapseTransformation" --value true "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "transform/scale" --value '[55, 55]' "$PROJECT_FILE"

# Depth Mask Feathering pada layer cincin tengah
effectcraft-cli add_effect \
  --layer 3 \
  --effect "FastBoxBlur" \
  --values '{"blurRadius": 15, "iterations": 1}' \
  "$PROJECT_FILE"

# Pulsating Zoom Keyframe pada Ring Utama
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "transform/scale" \
  --keys '[{"time":4,"value":[120,120]},{"time":5,"value":[135,135]},{"time":6,"value":[120,120]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 3. Render Preview & Output Video ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_circular_typography.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Circular Typography Selesai: $OUTPUT_VIDEO"

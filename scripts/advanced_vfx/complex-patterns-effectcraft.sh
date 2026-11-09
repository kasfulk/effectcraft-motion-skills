#!/usr/bin/env bash
# complex-patterns-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Complex Geometric Patterns, Trim Paths, & Repeaters

set -e

PROJECT_FILE="complex_patterns.ecproj"
COMP_NAME="ComplexPatternsComp"
OUTPUT_VIDEO="complex_patterns_motif.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi (1080p, 30fps, 8s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":8}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Radial Gradient ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Radial_BG","color":"#030712","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "Ramp" \
  --values '{"startPoint":[960,540],"endPoint":[960,0],"startColor":"#1e1b4b","endColor":"#030712","shape":"radial"}' \
  "$PROJECT_FILE"

echo "=== 3. Base Geometric Shape Motif (Polygon & Ring Lines) ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Geometric_Motif","width":300,"height":300,"strokeColor":"#818cf8","strokeWidth":3,"fillColor":"none","sides":6}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

# Animasi Trim Paths untuk menggambar garis geometris secara bertahap
effectcraft-cli add_effect \
  --layer 2 \
  --effect "TrimPaths" \
  --values '{"start":0,"end":100,"offsetExpression":"time * 45"}' \
  "$PROJECT_FILE"

effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/TrimPaths/end" \
  --keys '[{"time":0,"value":0},{"time":2.5,"value":100}]' \
  --interpolation "easyEase"

echo "=== 4. Shape Repeater untuk Multiplikasi Pola Futuristik ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "Repeater" \
  --values '{"copies":12,"transformScale":[85,85],"transformRotation":30,"transformOpacity":90}' \
  "$PROJECT_FILE"

# Rotasi otomatis seluruh grup pola geometris
effectcraft-cli set_property --layer 2 --path "transform/rotation" \
  --expression "time * 25" "$PROJECT_FILE"

echo "=== 5. Subtle Turbulent Displace & Glow Effects ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "TurbulenceDisplace" \
  --values '{"amount":25,"size":80,"evolutionExpression":"time * 60"}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 2 \
  --effect "Glow" \
  --values '{"threshold":50,"radius":25,"intensity":1.4}' \
  "$PROJECT_FILE"

echo "=== 6. Render Frame Preview pada Detik ke-2.5 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_complex_patterns.png" \
  "$PROJECT_FILE"

echo "=== 7. Render Video MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

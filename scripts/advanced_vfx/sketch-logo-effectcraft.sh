#!/usr/bin/env bash
# sketch-logo-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Hand-Drawn Sketch & Scribble Logo Reveal Animation

set -e

PROJECT_FILE="sketch_logo.ecproj"
COMP_NAME="SketchLogoComp"
OUTPUT_VIDEO="sketch_logo_reveal.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi (1080p, 30fps, 6s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":6}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Tekstur Kertas (Paper Texture Background) ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Paper_Texture_Solid","color":"#f4f1ea","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "FractalNoise" \
  --values '{"fractalType":"basic","noiseType":"softLinear","contrast":120,"brightness":-10,"scale":80}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "Tint" \
  --values '{"mapBlackTo":"#e6e2d8","mapWhiteTo":"#fbf9f5"}' \
  "$PROJECT_FILE"

echo "=== 3. Vector Outline & Stroke Drawing Layer (Garis Sketsa Pensil) ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Logo_Stroke_Outline","width":400,"height":400}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 2 \
  --effect "Stroke" \
  --values '{"color":"#2b2b2b","size":4,"paintStyle":"onTransparent"}' \
  "$PROJECT_FILE"

# Trim Paths keyframing untuk simulasi alur gambar pensil otomatis
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/Stroke/end" \
  --keys '[{"time":0,"value":0},{"time":2.0,"value":100}]' \
  --interpolation "easyEase"

echo "=== 4. Scribble Texture Fill Layer (Arsiran Pensil Internal) ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Logo_Scribble_Fill","width":390,"height":390}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "Scribble" \
  --values '{"fillColor":"#1a1a1a","strokeWidth":3,"angle":45,"density":60,"wiggleSpeed":8}' \
  "$PROJECT_FILE"

# Animasi kemunculan arsiran bertahap
effectcraft-cli add_keyframe \
  --layer 3 \
  --path "transform/opacity" \
  --keys '[{"time":1.5,"value":0},{"time":2.5,"value":100}]' \
  --interpolation "linear"

echo "=== 5. Final Logo Solid Reveal & Track Matte Inverted Transition ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Brand_Logo_Text","text":"BRANDLOGO","size":100,"color":"#111827"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "trackMatte" \
  --value '{"targetLayer": 2, "mode": "alphaInverted"}' "$PROJECT_FILE"

echo "=== 6. Render Frame Preview pada Detik ke-2.2 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.2 \
  --out "preview_sketch_logo.png" \
  "$PROJECT_FILE"

echo "=== 7. Render Video MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

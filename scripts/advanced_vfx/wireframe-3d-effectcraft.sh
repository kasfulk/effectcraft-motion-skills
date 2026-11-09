#!/usr/bin/env bash
# wireframe-3d-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk 3D Wireframe Box, Liquid Morph Effect, & Color Gradient Echo

set -e

PROJECT_FILE="wireframe_3d.ecproj"
COMP_NAME="Wireframe3DComp"
OUTPUT_VIDEO="wireframe_3d_morph_demo.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi (1080p, 30fps, 7s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":7}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Dark Canvas ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG_Solid","color":"#090d16","width":1920,"height":1080}' \
  "$PROJECT_FILE"

echo "=== 3. 3D Wireframe Box (6 Sisi Shape Layer 3D) & Null Controller ==="
effectcraft-cli exec layer.newNull \
  --params '{"name":"Box_3D_NullController","is3D":true}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540, 0]' "$PROJECT_FILE"

# Animasi Rotasi Kontroler Null 3D secara kontinu
effectcraft-cli set_property --layer 2 --path "transform/rotationX" --expression "time * 45" "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/rotationY" --expression "time * 60" "$PROJECT_FILE"

# Sisi-sisi Kubus Wireframe 3D
for i in {1..6}; do
  effectcraft-cli exec layer.newShape \
    --params '{"name":"Cube_Face_'$i'","width":300,"height":300,"strokeColor":"#38bdf8","strokeWidth":3,"fillColor":"none","is3D":true}' \
    "$PROJECT_FILE"
  
  # Set parenting ke Null Controller
  effectcraft-cli set_property --layer $((i+2)) --path "parent" --value 2 "$PROJECT_FILE"
done

# Atur transformasi offset 3D untuk 6 sisi kubus
effectcraft-cli set_property --layer 3 --path "transform/position" --value '[0, 0, -150]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "transform/position" --value '[0, 0, 150]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 5 --path "transform/position" --value '[-150, 0, 0]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 5 --path "transform/rotationY" --value 90 "$PROJECT_FILE"
effectcraft-cli set_property --layer 6 --path "transform/position" --value '[150, 0, 0]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 6 --path "transform/rotationY" --value 90 "$PROJECT_FILE"
effectcraft-cli set_property --layer 7 --path "transform/position" --value '[0, -150, 0]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 7 --path "transform/rotationX" --value 90 "$PROJECT_FILE"
effectcraft-cli set_property --layer 8 --path "transform/position" --value '[0, 150, 0]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 8 --path "transform/rotationX" --value 90 "$PROJECT_FILE"

echo "=== 4. Liquid Morph Effect (Gaussian Blur + Simple Choker Adjustment Layer) ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Liquid_Morph_Adjustment","color":"#000000","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 9 --path "isAdjustmentLayer" --value true "$PROJECT_FILE"

# Formula Gooey/Liquid Morph: Blur tinggi + Choker ketat
effectcraft-cli add_effect \
  --layer 9 \
  --effect "GaussianBlur" \
  --values '{"blurriness": 40}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 9 \
  --effect "SimpleChoker" \
  --values '{"chokeMatte": 25}' \
  "$PROJECT_FILE"

echo "=== 5. Color Gradient Echo Layer (Visual Motion Trail) ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "Echo" \
  --values '{"echoTime": -0.04, "numberOfEchoes": 6, "startingIntensity": 0.8, "decay": 0.7, "echoOperator": "compositeBehind"}' \
  "$PROJECT_FILE"

echo "=== 6. Render Frame Preview pada Detik ke-2.5 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_wireframe_3d.png" \
  "$PROJECT_FILE"

echo "=== 7. Render Video MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

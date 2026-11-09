#!/usr/bin/env bash
# trippy-typography-effectcraft.sh
# Animasi Trippy Typography Trails menggunakan Multi-Layer Stagger, Drop Shadow & Camera Lens Blur

set -e

PROJECT_FILE="trippy_typography.ecproj"
COMP_NAME="TrippyTypographyComp"
OUTPUT_VIDEO="trippy_typography_demo.mp4"

echo "=== 1. Membuat Komposisi Teks Utama & Rotasi Looping ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextBase","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"TrippyText","text":"DOPE VIBES","size":120,"color":"#ffffff"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 1 --path "transform/scale" --value '[25, 25]' "$PROJECT_FILE"

# Animasi Rotasi Bolak-Balik dengan loopOut()
effectcraft-cli add_keyframe \
  --layer 1 \
  --path "transform/rotation" \
  --keys '[{"time":0,"value":20},{"time":1.33,"value":-20},{"time":2.66,"value":20}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 1 --path "transform/rotation" --expression "loopOut()" "$PROJECT_FILE"

echo "=== 2. Multi-Layer Stagger (Trail Effect) & Drop Shadows ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TitleStack","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

# Layer 1 (Base Scale 25%)
effectcraft-cli exec layer.addComp --params '{"compName":"TextBase"}' "$PROJECT_FILE"
effectcraft-cli add_effect --layer 1 --effect "DropShadow" --values '{"opacity": 85, "distance": 0, "softness": 30}' "$PROJECT_FILE"

# Layer 2 (Scale 35%, Stagger 3 frames)
effectcraft-cli exec layer.addComp --params '{"compName":"TextBase"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/scale" --value '[140, 140]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "startTime" --value 0.1 "$PROJECT_FILE"
effectcraft-cli add_effect --layer 2 --effect "Tint" --values '{"swapColors": true}' "$PROJECT_FILE"

# Layer 3 (Scale 45%, Stagger 6 frames)
effectcraft-cli exec layer.addComp --params '{"compName":"TextBase"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "transform/scale" --value '[180, 180]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "startTime" --value 0.2 "$PROJECT_FILE"

# Layer 4 (Scale 55%, Stagger 9 frames)
effectcraft-cli exec layer.addComp --params '{"compName":"TextBase"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "transform/scale" --value '[220, 220]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "startTime" --value 0.3 "$PROJECT_FILE"
effectcraft-cli add_effect --layer 4 --effect "Tint" --values '{"swapColors": true}' "$PROJECT_FILE"

echo "=== 3. RGB Split & Camera Lens Blur Depth ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#0f051d","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TitleStack"}' "$PROJECT_FILE"

# Adjustment Layer untuk Depth Lens Blur
effectcraft-cli exec layer.newAdjustment \
  --params '{"name":"DepthBlur"}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "CameraLensBlur" \
  --values '{"blurRadius": 15}' \
  "$PROJECT_FILE"

# Mask Vignette pada Depth Blur
effectcraft-cli exec mask.add \
  --layer 3 \
  --type "ellipse" \
  --params '{"center":[960,540],"radiusX":600,"radiusY":400}' \
  "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "masks/Mask1/inverted" --value true "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "masks/Mask1/feather" --value 300 "$PROJECT_FILE"

echo "=== 4. Render Preview & Output Video ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.0 \
  --out "preview_trippy_typography.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Trippy Typography Selesai: $OUTPUT_VIDEO"

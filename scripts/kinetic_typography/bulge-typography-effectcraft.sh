#!/usr/bin/env bash
# bulge-typography-effectcraft.sh
# Animasi Bulge Typography Deformasi menggunakan Bezier Warp & Wiggle Expressions

set -e

PROJECT_FILE="bulge_typography.ecproj"
COMP_NAME="BulgeTypographyComp"
OUTPUT_VIDEO="bulge_typography_demo.mp4"

echo "=== 1. Membuat Teks & Pattern Comp ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextComp","width":1700,"height":1300,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"BulgeText","text":"BURST TOAST","size":180,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Pattern Comp dengan Motion Tile
effectcraft-cli exec comp.new \
  --params '{"name":"PatternComp","width":2000,"height":2000,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TextComp"}' "$PROJECT_FILE"
effectcraft-cli add_effect \
  --layer 1 \
  --effect "MotionTile" \
  --values '{"outputHeight": 1000}' \
  "$PROJECT_FILE"

# Keyframe pergerakan pola vertikal
effectcraft-cli add_keyframe \
  --layer 1 \
  --path "effects/MotionTile/tileCenter" \
  --keys '[{"time":0,"value":[1000,0]},{"time":10,"value":[1000,2000]}]' \
  --interpolation "linear" \
  "$PROJECT_FILE"

echo "=== 2. Efek Bezier Warp, Wiggle Tangents & Optics Compensation ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#09090b","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"PatternComp"}' "$PROJECT_FILE"

# Bezier Warp Deformasi
effectcraft-cli add_effect \
  --layer 2 \
  --effect "BezierWarp" \
  --values '{"quality": 10}' \
  "$PROJECT_FILE"

# Ekspresi Wiggle pada Tangent Bezier Warp (Squash & Stretch organik)
effectcraft-cli set_property --layer 2 --path "effects/BezierWarp/topRightTangent" --expression "wiggle(2, 30)" "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "effects/BezierWarp/topLeftTangent" --expression "wiggle(2, 30)" "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "effects/BezierWarp/bottomRightTangent" --expression "wiggle(2, 30)" "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "effects/BezierWarp/bottomLeftTangent" --expression "wiggle(2, 30)" "$PROJECT_FILE"

# Optics Compensation untuk distorsi cembung
effectcraft-cli add_effect \
  --layer 2 \
  --effect "OpticsCompensation" \
  --values '{"fieldOfView": 65, "reverseLensDistortion": true}' \
  "$PROJECT_FILE"

# Shift Channels Chromatic Aberration
effectcraft-cli add_effect \
  --layer 2 \
  --effect "ShiftChannels" \
  --values '{"takeRed": "red", "takeGreen": "green", "takeBlue": "blue"}' \
  "$PROJECT_FILE"

echo "=== 3. Render Preview & Output Video ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.0 \
  --out "preview_bulge_typography.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Bulge Typography Selesai: $OUTPUT_VIDEO"

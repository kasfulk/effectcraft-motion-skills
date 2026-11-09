#!/usr/bin/env bash
# text-displacement-effectcraft.sh
# Animasi Text Displacement Glitch menggunakan 3-Point Gradient Map & Time Displacement

set -e

PROJECT_FILE="text_displacement.ecproj"
COMP_NAME="TextDisplacementComp"
OUTPUT_VIDEO="text_displacement_demo.mp4"

echo "=== 1. Membuat Komposisi Teks ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextHolder","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"MainText","text":"DESIGN DISPLACE","size":140,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Fitur Scale keyframes dari 0 ke 100 dengan Easy Ease
effectcraft-cli add_keyframe \
  --layer 1 \
  --path "transform/scale" \
  --keys '[{"time":0,"value":[0,0]},{"time":0.66,"value":[100,100]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 2. Membuat 3-Point Gradient Map ==="
effectcraft-cli exec comp.new \
  --params '{"name":"GradientMapComp","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"MapSolid","color":"#000000","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "FourColorGradient" \
  --values '{
    "color1": "#000000",
    "color2": "#888888",
    "color3": "#ffffff",
    "color4": "#000000"
  }' \
  "$PROJECT_FILE"

echo "=== 3. Pengaplikasian Time Displacement & RGB Glitch ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#050505","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TextHolder"}' "$PROJECT_FILE"
effectcraft-cli exec layer.addComp --params '{"compName":"GradientMapComp"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "visible" --value false "$PROJECT_FILE"

# Adjustment Layer Time Displacement
effectcraft-cli exec layer.newAdjustment \
  --params '{"name":"DisplacementLayer"}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 4 \
  --effect "TimeDisplacement" \
  --values '{"displacementMap": "GradientMapComp", "maxDisplacementTime": 0.6, "timeResolution": 400}' \
  "$PROJECT_FILE"

# Shift Channels RGB Glitch Look
effectcraft-cli add_effect \
  --layer 4 \
  --effect "ShiftChannels" \
  --values '{"takeRed": "red", "takeGreen": "green", "takeBlue": "blue"}' \
  "$PROJECT_FILE"

# Noise Grain untuk anti color-banding
effectcraft-cli add_effect \
  --layer 4 \
  --effect "Noise" \
  --values '{"amount": 3, "type": "gaussian"}' \
  "$PROJECT_FILE"

echo "=== 4. Render Preview & Output Video ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 1.2 \
  --out "preview_text_displacement.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Text Displacement Selesai: $OUTPUT_VIDEO"

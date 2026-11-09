#!/usr/bin/env bash
# liquid-typography-effectcraft.sh
# Animasi Liquid Ripple Typography menggunakan Caustics & Radio Waves Wave Map

set -e

PROJECT_FILE="liquid_typography.ecproj"
COMP_NAME="LiquidTypographyComp"
OUTPUT_VIDEO="liquid_typography_demo.mp4"

echo "=== 1. Membuat Komposisi Teks & Motion Tile ==="
effectcraft-cli exec comp.new \
  --params '{"name":"TextComp","width":1920,"height":150,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newText \
  --params '{"name":"LiquidText","text":"LIQUID FLOW MOTION","size":100,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Motion Tile Comp
effectcraft-cli exec comp.new \
  --params '{"name":"MotionTileComp","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"TextComp"}' "$PROJECT_FILE"
effectcraft-cli add_effect \
  --layer 1 \
  --effect "MotionTile" \
  --values '{"outputHeight": 750, "mirrorEdges": false}' \
  "$PROJECT_FILE"

echo "=== 2. Membuat Wave Map (Radio Waves & Fast Box Blur) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"WaveMapComp","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"WaveSolid","color":"#000000","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "RadioWaves" \
  --values '{"frequency": 0.75, "expansion": 6, "startWidth": 100, "endWidth": 100}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "FastBoxBlur" \
  --values '{"blurRadius": 60, "iterations": 2, "repeatEdgePixels": true}' \
  "$PROJECT_FILE"

echo "=== 3. Efek Refraksi Caustics & 3D Camera Depth of Field ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#020617","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli exec layer.addComp --params '{"compName":"MotionTileComp"}' "$PROJECT_FILE"
effectcraft-cli exec layer.addComp --params '{"compName":"WaveMapComp"}' "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "visible" --value false "$PROJECT_FILE"

# Adjustment Layer dengan Caustics
effectcraft-cli exec layer.newAdjustment \
  --params '{"name":"CausticsLayer"}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 4 \
  --effect "Caustics" \
  --values '{
    "waterSurface": "WaveMapComp",
    "waveHeight": 0.5,
    "smoothing": 50,
    "waterDepth": 0,
    "refractiveIndex": 1.1,
    "surfaceOpacity": 0.1,
    "causticStrength": 1.0
  }' \
  "$PROJECT_FILE"

# 3D Camera & Null Controller Rotation
effectcraft-cli exec layer.new3DNull --params '{"name":"CamControl"}' "$PROJECT_FILE"
effectcraft-cli exec layer.newCamera \
  --params '{"name":"MainCam","focalLength":50,"depthOfField":true,"aperture":250,"blurLevel":120,"focusDistance":1000}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 5 --path "transform/rotationX" --value 25 "$PROJECT_FILE"
effectcraft-cli set_property --layer 5 --path "transform/rotationY" --expression "time * 3" "$PROJECT_FILE"

echo "=== 4. Render Preview & Output Video ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_liquid_typography.png" \
  "$PROJECT_FILE"

effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Liquid Typography Selesai: $OUTPUT_VIDEO"

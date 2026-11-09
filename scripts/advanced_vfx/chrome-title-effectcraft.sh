#!/usr/bin/env bash
# chrome-title-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Cinematic Chrome Title Intro & Chromatic Aberration

set -e

PROJECT_FILE="chrome_title.ecproj"
COMP_NAME="ChromeTitleComp"
OUTPUT_VIDEO="chrome_title_intro.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi (1080p, 30fps, 8s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":8}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Dark Environment ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Environment_BG","color":"#050811","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "Ramp" \
  --values '{"startPoint":[960,0],"endPoint":[960,1080],"startColor":"#0f172a","endColor":"#020617","shape":"radial"}' \
  "$PROJECT_FILE"

echo "=== 3. Text Holder & Metallicity Shader Setup ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Chrome_Title","text":"CHROME","size":180,"color":"#e2e8f0","fontFamily":"Impact"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

# Efek bevel & glass reflection untuk tekstur logam 3D mengkilap
effectcraft-cli add_effect \
  --layer 2 \
  --effect "BevelAlpha" \
  --values '{"edgeThickness": 8, "lightAngle": 45, "lightIntensity": 0.8}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 2 \
  --effect "CCGlass" \
  --values '{"bumpMapLayer": 2, "softness": 12, "height": 20, "displacement": -15}' \
  "$PROJECT_FILE"

echo "=== 4. Light Sweep Shine & Glow Layer ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "CCLightSweep" \
  --values '{"center":[0,540],"direction":45,"shape":"linear","width":80,"sweepIntensity":2.0}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "effects/CCLightSweep/center" \
  --expression "[time * 600 - 300, 540]" "$PROJECT_FILE"

echo "=== 5. Adjustment Layer: Chromatic Aberration & Lens Distortion ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Chromatic_Adjustment","color":"#000000","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "isAdjustmentLayer" --value true "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "3DGlasses" \
  --values '{"leftView": 2, "rightView": 2, "stereoMode": "balancedRedBlue", "sceneConvergence": 5}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "Glow" \
  --values '{"threshold": 55, "radius": 40, "intensity": 1.2}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "Noise" \
  --values '{"amount": 3, "type": "gaussian"}' \
  "$PROJECT_FILE"

echo "=== 6. Render Frame Preview pada Detik ke-2.0 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.0 \
  --out "preview_chrome_title.png" \
  "$PROJECT_FILE"

echo "=== 7. Render Video MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

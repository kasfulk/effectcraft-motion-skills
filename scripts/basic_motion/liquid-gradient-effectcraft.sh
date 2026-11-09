#!/usr/bin/env bash
# liquid-gradient-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk membuat animasi background Liquid Gradient
# Berdasarkan prinsip animasi After Effects (Four-Color Gradient, Wave Warp, Turbulence Displace, Motion Tile)

set -e

PROJECT_FILE="liquid_gradient.ecproj"
COMP_NAME="LiquidGradientComp"
OUTPUT_VIDEO="liquid_gradient_bg.mp4"

echo "=== 1. Membuat Proyek & Komposisi Baru (1080p, 30fps, 10s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

echo "=== 2. Membuat Layer Solid untuk Background ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Gradient_Solid","color":"#000000","width":1920,"height":1080}' \
  "$PROJECT_FILE"

echo "=== 3. Menambahkan Efek Four Color Gradient & Ekspresi Pergerakan Warna ==="
effectcraft-cli add_effect \
  --layer 1 \
  --effect "FourColorGradient" \
  --values '{
    "color1": "#FF5E36",
    "color2": "#FFAE33",
    "color3": "#7E33FF",
    "color4": "#33C7FF",
    "blend": 75
  }' \
  "$PROJECT_FILE"

# Memasang ekspresi JS matematika agar titik warna bergerak cair secara otomatis seiring waktu
effectcraft-cli set_property --layer 1 --path "effects/FourColorGradient/point1" --expression "[960 + Math.sin(time * 1.5) * 400, 540 + Math.cos(time * 1.2) * 300]" "$PROJECT_FILE"
effectcraft-cli set_property --layer 1 --path "effects/FourColorGradient/point2" --expression "[960 + Math.cos(time * 1.8) * 350, 540 + Math.sin(time * 1.4) * 250]" "$PROJECT_FILE"
effectcraft-cli set_property --layer 1 --path "effects/FourColorGradient/point3" --expression "[960 + Math.sin(time * 1.1) * 300, 540 + Math.cos(time * 1.6) * 400]" "$PROJECT_FILE"
effectcraft-cli set_property --layer 1 --path "effects/FourColorGradient/point4" --expression "[960 + Math.cos(time * 1.3) * 450, 540 + Math.sin(time * 1.7) * 350]" "$PROJECT_FILE"

echo "=== 4. Distorsi Fluida (Wave Warp & Turbulence Displace) ==="
effectcraft-cli add_effect \
  --layer 1 \
  --effect "WaveWarp" \
  --values '{"waveType":"sine","height":45,"width":180,"direction":45,"speed":1.5}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "TurbulenceDisplace" \
  --values '{"amount":130,"size":160,"complexity":3,"evolutionExpression":"time * 90"}' \
  "$PROJECT_FILE"

echo "=== 5. Motion Tile dengan Mirror Edges untuk Mencegah Celah/Garis Potong ==="
effectcraft-cli add_effect \
  --layer 1 \
  --effect "MotionTile" \
  --values '{"outputWidth":150,"outputHeight":150,"mirrorEdges":true}' \
  "$PROJECT_FILE"

echo "=== 6. Render Preview Frame pada Detik ke-2.5 (Inspeksi Visual AI) ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_gradient.png" \
  "$PROJECT_FILE"

echo "=== 7. Perenderan Akhir ke MP4 (H.264) ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Perenderan Selesai: $OUTPUT_VIDEO"

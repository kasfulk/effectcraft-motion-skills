#!/usr/bin/env bash
# shape-repeater-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Latar Belakang Geometris dengan Shape Repeater
# Berdasarkan teknik AE: Shape Layer Repeater, Turbulent Displacement, dan Dynamic Offset Expressions.

set -e

PROJECT_FILE="shape_repeater.ecproj"
COMP_NAME="ShapeRepeaterComp"
OUTPUT_VIDEO="shape_repeater.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi Shape Repeater ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":8}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Dasar ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG_Solid","color":"#121824","width":1920,"height":1080}' \
  "$PROJECT_FILE"

echo "=== 3. Layer Shape Dasar (Lingkaran / Poligon Minimalis) ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Base_Pattern_Shape","type":"ellipse","width":80,"height":80,"strokeColor":"#33C7FF","strokeWidth":4,"fillColor":"none"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[200, 540]' "$PROJECT_FILE"

echo "=== 4. Penambahan Shape Repeater & Pengaturan Transformasi Salinan ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "ShapeRepeater" \
  --values '{
    "copies": 12,
    "offset": 0,
    "positionOffset": [140, 0],
    "scaleOffset": [95, 95],
    "rotationOffset": 15,
    "startOpacity": 100,
    "endOpacity": 15
  }' \
  "$PROJECT_FILE"

# Animasi pergerakan offset repeater seiring waktu
effectcraft-cli set_property \
  --layer 2 \
  --path "effects/ShapeRepeater/offset" \
  --expression "time * -0.8" \
  "$PROJECT_FILE"

echo "=== 5. Distorsi Organik dengan Turbulent Displace & Color Loop ==="
effectcraft-cli add_effect \
  --layer 2 \
  --effect "TurbulenceDisplace" \
  --values '{
    "amount": 65,
    "size": 110,
    "complexity": 2,
    "evolutionExpression": "time * 120"
  }' \
  "$PROJECT_FILE"

# Tambahkan efek Motion Tile untuk mengisi seluruh permukaan 16:9
effectcraft-cli add_effect \
  --layer 2 \
  --effect "MotionTile" \
  --values '{"outputWidth": 200, "outputHeight": 200, "mirrorEdges": true}' \
  "$PROJECT_FILE"

echo "=== 6. Render Preview Frame (Detik 3.0) & Perenderan Video ==="
effectcraft-cli render-frame --comp "$COMP_NAME" --time 3.0 --out "preview_shape_repeater.png" "$PROJECT_FILE"
effectcraft-cli render --comp "$COMP_NAME" --out "$OUTPUT_VIDEO" --format h264 "$PROJECT_FILE"

echo "Shape Repeater Geometric Background Selesai: $OUTPUT_VIDEO"

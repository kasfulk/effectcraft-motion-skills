#!/usr/bin/env bash
# frosted-glass-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk membuat efek Frosted Glass (Glassmorphism) tanpa plugin

set -e

PROJECT_FILE="frosted_glass.ecproj"
COMP_NAME="FrostedGlassComp"
OUTPUT_VIDEO="frosted_glass_demo.mp4"

echo "=== 1. Membuat Proyek & Komposisi Baru (1080p, 30fps, 10s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

echo "=== 2. Membuat Latar Belakang Warna Dinamis / Gradient ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Background_Solid","color":"#0f172a","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "FourColorGradient" \
  --values '{
    "color1": "#38bdf8",
    "color2": "#818cf8",
    "color3": "#c084fc",
    "color4": "#f472b6",
    "blend": 80
  }' \
  "$PROJECT_FILE"

# Animasi pergerakan titik warna latar belakang
effectcraft-cli set_property --layer 1 --path "effects/FourColorGradient/point1" --expression "[960 + Math.sin(time) * 300, 540 + Math.cos(time * 0.8) * 200]" "$PROJECT_FILE"

echo "=== 3. Elemen Objek di Belakang Kaca (untuk Pembuktian Pembiasan & Blur) ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Background_Text","text":"EFFECTCRAFT","size":160,"color":"#ffffff"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/opacity" --value 80 "$PROJECT_FILE"

echo "=== 4. Layer Frosted Glass Card (Shape Layer dengan Radius Kaca) ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Glass_Card","width":800,"height":500,"cornerRadius":30}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

# Animasi mengambang (floating animation) pada kartu kaca
effectcraft-cli set_property --layer 3 --path "transform/position" \
  --expression "[960, 540 + Math.sin(time * 2) * 25]" "$PROJECT_FILE"
effectcraft-cli set_property --layer 3 --path "transform/rotation" \
  --expression "Math.sin(time * 1.5) * 3" "$PROJECT_FILE"

echo "=== 5. Menyiapkan Adjustment Layer & Fast Box Blur (Frosted Effect) ==="
# Mengubah layer shape menjadi Adjustment Layer agar memburamkan konten di belakangi secara otomatis
effectcraft-cli set_property --layer 3 --path "isAdjustmentLayer" --value true "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "FastBoxBlur" \
  --values '{"blurRadius": 35, "iterations": 3, "repeatEdgePixels": true}' \
  "$PROJECT_FILE"

# Tinting warna putih transparan (15% Opacity) untuk memberi efek kilap frosted khas Glassmorphism
effectcraft-cli add_effect \
  --layer 3 \
  --effect "Fill" \
  --values '{"color": "#ffffff", "opacity": 0.15}' \
  "$PROJECT_FILE"

echo "=== 6. Border Highlight & Bevel (Tepi Kaca Memantulkan Cahaya) ==="
effectcraft-cli add_effect \
  --layer 3 \
  --effect "Stroke" \
  --values '{"color": "#ffffff", "opacity": 0.45, "width": 2, "brushStyle": "gradient"}' \
  "$PROJECT_FILE"

echo "=== 7. Soft Noise & Drop Shadow (Bayangan Organik Kaca) ==="
effectcraft-cli add_effect \
  --layer 3 \
  --effect "DropShadow" \
  --values '{"color": "#000000", "opacity": 0.35, "direction": 135, "distance": 25, "softness": 40}' \
  "$PROJECT_FILE"

# Menambahkan subtle noise grain untuk tekstur permukaan kaca buram (matte finish)
effectcraft-cli add_effect \
  --layer 3 \
  --effect "Noise" \
  --values '{"amount": 4, "type": "gaussian"}' \
  "$PROJECT_FILE"

echo "=== 8. Konten Teks di Atas Kartu Kaca ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Glass_Title","text":"Frosted Glass UI","size":48,"color":"#ffffff"}' \
  "$PROJECT_FILE"

# Menghubungkan teks ke kartu kaca (Parenting) agar ikut mengambang secara sinkron
effectcraft-cli set_property --layer 4 --path "parent" --value 3 "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "transform/position" --value '[0, -30]' "$PROJECT_FILE"

echo "=== 9. Render Frame Preview pada Detik ke-2.0 (Inspeksi Visual AI) ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.0 \
  --out "preview_frosted_glass.png" \
  "$PROJECT_FILE"

echo "=== 10. Perenderan Akhir ke MP4 (H.264) ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai! Video Frosted Glass telah dirender: $OUTPUT_VIDEO"

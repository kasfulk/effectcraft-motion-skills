#!/usr/bin/env bash
# infographics-slider-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Animated Infographics & Expression Slider Counter

set -e

PROJECT_FILE="infographics_slider.ecproj"
COMP_NAME="InfographicsSliderComp"
OUTPUT_VIDEO="infographics_slider_demo.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi (1080p, 30fps, 6s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":6}' \
  "$PROJECT_FILE"

echo "=== 2. Background Grid & Dark Theme ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Infographic_BG","color":"#0b0f19","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "Grid" \
  --values '{"size": 60, "border": 1, "color": "#1e293b", "opacity": 0.5}' \
  "$PROJECT_FILE"

echo "=== 3. Slider Control Controller Solid Layer ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Slider_Controller","color":"#000000","width":100,"height":100}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 2 \
  --effect "SliderControl" \
  --values '{"name":"ProgressSlider", "value": 0}' \
  "$PROJECT_FILE"

# Animasi nilai Slider Control dari 0 hingga 87% dalam 2.5 detik
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/SliderControl/value" \
  --keys '[{"time":0.5,"value":0},{"time":3.0,"value":87}]' \
  --interpolation "easyEase"

echo "=== 4. Dynamic Bar Chart Shape Layer ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Bar_Chart_Fill","width":180,"height":600,"color":"#38bdf8","anchorPoint":"bottom"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[960, 800]' "$PROJECT_FILE"

# Hubungkan Skala Tinggi (Scale Y) grafik ke nilai Slider Control
effectcraft-cli set_property --layer 3 --path "transform/scale" \
  --expression "var val = thisComp.layer('Slider_Controller').effect('SliderControl')('value'); [100, val]" "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "Glow" \
  --values '{"threshold": 40, "radius": 30, "intensity": 1.5}' \
  "$PROJECT_FILE"

echo "=== 5. Animated Percentage Counter Text Layer ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Percentage_Counter_Text","text":"0%","size":120,"color":"#ffffff"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "transform/position" --value '[960, 420]' "$PROJECT_FILE"

# Expression untuk mengupdate nilai teks secara real-time berdasarkan Slider Control tanpa angka desimal
effectcraft-cli set_property --layer 4 --path "sourceText" \
  --expression "var val = thisComp.layer('Slider_Controller').effect('SliderControl')('value'); val.toFixed(0) + '%'" "$PROJECT_FILE"

echo "=== 6. Subtitle & Label Teks Infografis ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Label_Text","text":"GROWTH RATE 2026","size":36,"color":"#94a3b8"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 5 --path "transform/position" --value '[960, 900]' "$PROJECT_FILE"

echo "=== 7. Render Frame Preview pada Detik ke-2.5 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_infographics.png" \
  "$PROJECT_FILE"

echo "=== 8. Render Video MP4 ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

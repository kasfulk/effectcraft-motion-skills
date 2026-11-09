#!/usr/bin/env bash
# instagram-reels-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Vertical 9:16 Instagram Reels Animation & Rough Brush Stroke Reveal

set -e

PROJECT_FILE="instagram_reels.ecproj"
COMP_NAME="InstagramReelsComp"
OUTPUT_VIDEO="instagram_reels_promo.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi Vertical Canvas 9:16 (1080x1920, 30fps, 10s) ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1080,"height":1920,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

echo "=== 2. Skewed Dynamic Background & Gradient Texture ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Reels_BG_Solid","color":"#0f172a","width":1080,"height":1920}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "FourColorGradient" \
  --values '{"color1":"#ec4899","color2":"#8b5cf6","color3":"#3b82f6","color4":"#06b6d4","blend":85}' \
  "$PROJECT_FILE"

echo "=== 3. Skewed Shape Banner Decor Layer ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Skewed_Banner","width":1200,"height":450,"color":"#ffffff","skew":-15}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 2 --path "transform/position" --value '[540, 960]' "$PROJECT_FILE"
effectcraft-cli set_property --layer 2 --path "transform/opacity" --value 15 "$PROJECT_FILE"

echo "=== 4. Rough Brush Stroke Mask & Image Reveal Setup ==="
effectcraft-cli exec layer.newShape \
  --params '{"name":"Brush_Stroke_Mask","width":800,"height":800}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[540, 750]' "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 3 \
  --effect "RoughenEdges" \
  --values '{"edgeType":"rough","border":35,"fractalInfluence":1.5,"scale":120,"evolutionExpression":"time*120"}' \
  "$PROJECT_FILE"

# Animasi skala brush mask untuk me-reveal gambar
effectcraft-cli add_keyframe \
  --layer 3 \
  --path "transform/scale" \
  --keys '[{"time":0.5,"value":[0,0]},{"time":2.0,"value":[100,100]}]' \
  --interpolation "easyEase"

echo "=== 5. Photo Placeholder Layer dengan Track Matte Brush Stroke ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Photo_Placeholder","color":"#38bdf8","width":900,"height":900}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "transform/position" --value '[540, 750]' "$PROJECT_FILE"

effectcraft-cli set_property --layer 4 --path "trackMatte" \
  --value '{"targetLayer": 3, "mode": "alpha"}' "$PROJECT_FILE"

echo "=== 6. Kinetic Title Text & Subtitle untuk Reels ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Reels_Title","text":"CREATE MORE.","size":84,"color":"#ffffff"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 5 --path "transform/position" --value '[540, 1350]' "$PROJECT_FILE"

effectcraft-cli add_keyframe \
  --layer 5 \
  --path "transform/position" \
  --keys '[{"time":1.2,"value":[540,1450]},{"time":2.2,"value":[540,1350]}]' \
  --interpolation "easyEase"

effectcraft-cli add_keyframe \
  --layer 5 \
  --path "transform/opacity" \
  --keys '[{"time":1.2,"value":0},{"time":2.2,"value":100}]' \
  --interpolation "linear"

echo "=== 7. Adjustment Layer: RGB Split & Vignette Finishing ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"RGB_Split_Adjustment","color":"#000000","width":1080,"height":1920}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 6 --path "isAdjustmentLayer" --value true "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 6 \
  --effect "RGBSplit" \
  --values '{"redOffset":[-4,0],"blueOffset":[4,0]}' \
  "$PROJECT_FILE"

echo "=== 8. Render Frame Preview pada Detik ke-2.5 ==="
effectcraft-cli render-frame \
  --comp "$COMP_NAME" \
  --time 2.5 \
  --out "preview_instagram_reels.png" \
  "$PROJECT_FILE"

echo "=== 9. Render Video MP4 Vertical ==="
effectcraft-cli render \
  --comp "$COMP_NAME" \
  --out "$OUTPUT_VIDEO" \
  --format h264 \
  "$PROJECT_FILE"

echo "Selesai: $OUTPUT_VIDEO"

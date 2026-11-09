#!/usr/bin/env bash
# product-promo-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk Iklan Commercial / Promo Produk 3D Motion Graphics
# Berdasarkan teknik AE: 3D Camera Null Staging, Product Bounce Script, Track Matte reveal, Drop Shadow Noise, CC Light Sweep.

set -e

PROJECT_FILE="product_promo.ecproj"
COMP_NAME="ProductPromoComp"
OUTPUT_VIDEO="product_promo.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi Iklan Produk ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":10}' \
  "$PROJECT_FILE"

echo "=== 2. Latar Belakang Gradien Radial + Tekstur Pattern ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG_Gradient","color":"#1A0B2E","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 1 \
  --effect "Ramp" \
  --values '{"startPoint":[960,540],"endPoint":[960,0],"startColor":"#4A154B","endColor":"#0E041A","rampShape":"radial"}' \
  "$PROJECT_FILE"

echo "=== 3. Pengontrol Kamera 3D (Null Object Staging) ==="
effectcraft-cli exec layer.newNull \
  --params '{"name":"3D_Camera_Controller","is3D":true}' \
  "$PROJECT_FILE"

# Animasi Kamera 3D Orbit & Zoom In
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "transform/position" \
  --keys '[{"time":0,"value":[960,540,-500]},{"time":3,"value":[960,540,0]},{"time":8,"value":[960,500,200]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

effectcraft-cli add_keyframe \
  --layer 2 \
  --path "transform/rotationY" \
  --keys '[{"time":0,"value":-25},{"time":4,"value":10},{"time":10,"value":0}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 4. Layer Aset Produk & Animasi Bounce Script ==="
effectcraft-cli exec layer.importAsset \
  --params '{"name":"Product_Package","path":"assets/product_can.png","is3D":true}' \
  "$PROJECT_FILE"

# Parent aset produk ke Null Camera 3D
effectcraft-cli set_parent --layer 3 --parentLayer 2 "$PROJECT_FILE"

# Atur posisi awal & Bounce Script pada Skala saat produk masuk
effectcraft-cli set_property --layer 3 --path "transform/position" --value '[0, 0, 0]' "$PROJECT_FILE"

effectcraft-cli set_property \
  --layer 3 \
  --path "transform/scale" \
  --expression "
    freq = 3; decay = 5;
    t = time - 0.5;
    if (t < 0) { [0,0,0]; } else {
      s = Math.sin(t * freq * Math.PI * 2) / Math.exp(decay * t);
      [100 + s*30, 100 - s*30, 100];
    }
  " \
  "$PROJECT_FILE"

# Tambahkan efek CC Light Sweep kilau produk
effectcraft-cli add_effect \
  --layer 3 \
  --effect "CCLightSweep" \
  --values '{"center":[960,540],"sweepWidth":40,"intensity":1.8,"edgeIntensity":2.0}' \
  "$PROJECT_FILE"

effectcraft-cli add_keyframe \
  --layer 3 \
  --path "effects/CCLightSweep/center" \
  --keys '[{"time":2.0,"value":[400,200]},{"time":3.5,"value":[1500,800]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 5. Dynamic Drop Shadow dengan Noise Style ==="
effectcraft-cli add_effect \
  --layer 3 \
  --effect "DropShadow" \
  --values '{"color":"#000000","opacity":75,"direction":135,"distance":45,"softness":60}' \
  "$PROJECT_FILE"

echo "=== 6. Teks Marketing dengan Track Matte Transition ==="
# Layer Teks Marketing
effectcraft-cli exec layer.newText \
  --params '{"name":"Marketing_Callout","text":"REFRESH YOUR SENSES","size":72,"fill":"#ECB22E","font":"Montserrat-Bold"}' \
  "$PROJECT_FILE"
effectcraft-cli set_property --layer 4 --path "transform/position" --value '[960, 850]' "$PROJECT_FILE"

# Layer Shape Masking (Track Matte)
effectcraft-cli exec layer.newShape \
  --params '{"name":"Text_Matte_Shape","type":"rect","width":1000,"height":120,"position":[960,850]}' \
  "$PROJECT_FILE"

# Hubungkan Track Matte (Alpha Matte)
effectcraft-cli set_track_matte --layer 4 --matteLayer 5 --type "alpha" "$PROJECT_FILE"

# Keyframe posisi teks naik keluar dari bawah matte
effectcraft-cli add_keyframe \
  --layer 4 \
  --path "transform/position" \
  --keys '[{"time":1.5,"value":[960,950]},{"time":2.5,"value":[960,850]}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 7. Render Preview Frame (Detik 2.8) & Render Komersial ==="
effectcraft-cli render-frame --comp "$COMP_NAME" --time 2.8 --out "preview_product_promo.png" "$PROJECT_FILE"
effectcraft-cli render --comp "$COMP_NAME" --out "$OUTPUT_VIDEO" --format h264 "$PROJECT_FILE"

echo "Product Promo 3D Staging Selesai: $OUTPUT_VIDEO"

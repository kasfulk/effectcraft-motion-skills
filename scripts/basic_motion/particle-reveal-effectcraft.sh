#!/usr/bin/env bash
# particle-reveal-effectcraft.sh
# Skrip otomasi effectcraft-cli untuk pembukaan logo/teks dengan animasi partikel (Trapcode Particular style)
# Berdasarkan teknik AE: Emitter Masking, Particle Physics, Glow, Linear Wipe Reveal, Anti-Banding Noise.

set -e

PROJECT_FILE="particle_reveal.ecproj"
COMP_NAME="ParticleRevealComp"
OUTPUT_VIDEO="particle_reveal.mp4"

echo "=== 1. Inisialisasi Proyek & Komposisi Partikel ==="
effectcraft-cli exec comp.new \
  --params '{"name":"'"$COMP_NAME"'","width":1920,"height":1080,"frameRate":30,"duration":8}' \
  "$PROJECT_FILE"

echo "=== 2. Layer Solid Latar Belakang & Vignette ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG_Solid","color":"#050814","width":1920,"height":1080}' \
  "$PROJECT_FILE"

echo "=== 3. Layer Emitter Partikel Dinamis ==="
effectcraft-cli exec layer.newSolid \
  --params '{"name":"Particular_Emitter","color":"#FFFFFF","width":1920,"height":1080}' \
  "$PROJECT_FILE"

# Pengaturan Fisika Partikel & Emitter
effectcraft-cli add_effect \
  --layer 2 \
  --effect "Particular" \
  --values '{
    "emitterType": "LayerGrid",
    "particlesPerSec": 5000,
    "velocity": 120,
    "velocityRandom": 50,
    "particleLife": 2.5,
    "size": 4,
    "sizeRandom": 80,
    "color": "#FF5E36",
    "colorSecondary": "#33C7FF",
    "windX": -30,
    "turbulenceStrength": 80
  }' \
  "$PROJECT_FILE"

# Keyframe jumlah partikel (Emitter burst lalu meluruh)
effectcraft-cli add_keyframe \
  --layer 2 \
  --path "effects/Particular/particlesPerSec" \
  --keys '[{"time":0,"value":0},{"time":0.5,"value":8000},{"time":3.0,"value":500}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 4. Layer Logo / Teks Utama dengan Linear Wipe Reveal ==="
effectcraft-cli exec layer.newText \
  --params '{"name":"Logo_Text","text":"EFFECTCRAFT","size":140,"fill":"#FFFFFF","font":"Montserrat-Black"}' \
  "$PROJECT_FILE"

effectcraft-cli set_property --layer 3 --path "transform/position" --value '[960, 540]' "$PROJECT_FILE"

# Efek Linear Wipe untuk mengungkapkan logo sejajar dengan garis gerakan partikel
effectcraft-cli add_effect \
  --layer 3 \
  --effect "LinearWipe" \
  --values '{"wipeAngle": -45, "feather": 40}' \
  "$PROJECT_FILE"

effectcraft-cli add_keyframe \
  --layer 3 \
  --path "effects/LinearWipe/transitionCompletion" \
  --keys '[{"time":0.5,"value":100},{"time":2.5,"value":0}]' \
  --interpolation "easyEase" \
  "$PROJECT_FILE"

echo "=== 5. Efek Visual Enhancements (Glow, CC Light Sweep, & Noise Layer) ==="
# Glow pada logo
effectcraft-cli add_effect \
  --layer 3 \
  --effect "Glow" \
  --values '{"glowThreshold": 30, "glowRadius": 50, "glowIntensity": 1.5}' \
  "$PROJECT_FILE"

# Adjustment Layer untuk Anti-Banding Noise & Subtle Camera Zoom
effectcraft-cli exec layer.newAdjustment \
  --params '{"name":"Post_Processing","width":1920,"height":1080}' \
  "$PROJECT_FILE"

effectcraft-cli add_effect \
  --layer 4 \
  --effect "Noise" \
  --values '{"amount": 3.5, "useColorNoise": false}' \
  "$PROJECT_FILE"

# Zoom perlahan dari 100% ke 105%
effectcraft-cli add_keyframe \
  --layer 4 \
  --path "transform/scale" \
  --keys '[{"time":0,"value":[100,100]},{"time":8,"value":[105,105]}]' \
  --interpolation "linear" \
  "$PROJECT_FILE"

echo "=== 6. Render Frame Preview (Detik 2.0) & Render Video ==="
effectcraft-cli render-frame --comp "$COMP_NAME" --time 2.0 --out "preview_particles.png" "$PROJECT_FILE"
effectcraft-cli render --comp "$COMP_NAME" --out "$OUTPUT_VIDEO" --format h264 "$PROJECT_FILE"

echo "Particle Logo Reveal Selesai: $OUTPUT_VIDEO"

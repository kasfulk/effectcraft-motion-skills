#!/usr/bin/env bash
# master-motion-graphics.sh
# Master Orchestrator Script: Mengabungkan Seluruh Modul Motion Graphics di EffectCraft
# Menjalankan alur kerja otomatisasi 5 scene komersial lengkap dari latar belakang, tipografi, partikel, hingga promo produk 3D.

set -e

echo "========================================================="
echo "   EFFECTCRAFT AGENTIC AI - MASTER MOTION GRAPHICS SUITE  "
echo "========================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/5] Menjalankan Modul 1: Liquid Gradient Background..."
bash "$DIR/liquid-gradient-effectcraft.sh"

echo "[2/5] Menjalankan Modul 2: Kinetic Typography Reveal..."
bash "$DIR/kinetic-typography-effectcraft.sh"

echo "[3/5] Menjalankan Modul 3: Particle Logo & Text Reveal..."
bash "$DIR/particle-reveal-effectcraft.sh"

echo "[4/5] Menjalankan Modul 4: Product Promo 3D Staging..."
bash "$DIR/product-promo-effectcraft.sh"

echo "[5/5] Menjalankan Modul 5: Shape Repeater Geometric Background..."
bash "$DIR/shape-repeater-effectcraft.sh"

echo "========================================================="
echo "   SEMUA MODUL ANIMASI SELESAI DIEKSEKUSI DENGAN SUKSES!   "
echo "========================================================="

#!/usr/bin/env bash
# master-typography-effects.sh
# Skrip Master Orchestrator untuk mengeksekusi seluruh 6 modul animasi tipografi EffectCraft

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================================="
echo "   EFFECTCRAFT CLI - MASTER TYPOGRAPHY EFFECTS ORCHESTRATOR"
echo "=================================================================="

MODULES=(
  "stretch-typography-effectcraft.sh"
  "rolling-typography-effectcraft.sh"
  "liquid-typography-effectcraft.sh"
  "text-displacement-effectcraft.sh"
  "bulge-typography-effectcraft.sh"
  "circular-typography-effectcraft.sh"
  "trippy-typography-effectcraft.sh"
)

for script in "${MODULES[@]}"; do
  if [ -f "$SCRIPT_DIR/$script" ]; then
    echo ""
    echo "------------------------------------------------------------------"
    echo ">>> Menjalankan Modul Animasi: $script"
    echo "------------------------------------------------------------------"
    bash "$SCRIPT_DIR/$script"
  else
    echo "⚠️ Peringatan: File skrip $script tidak ditemukan di $SCRIPT_DIR"
  fi
done

echo ""
echo "=================================================================="
echo "🎉 SELURUH MODUL ANIMASI TIPOGRAFI EFFECTCRAFT BERHASIL DIEKSEKUSI!"
echo "=================================================================="

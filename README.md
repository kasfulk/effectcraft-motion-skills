# EffectCraft Agent Skills Repository

Repository panduan dan skrip otomasi `effectcraft-cli` berbasis Agentic AI untuk pembuatan video Motion Graphics terintegrasi.

## 📁 Struktur Repository

```
effectcraft-skills-repository/
├── README.md                          # Panduan penggunaan repository
├── SKILLS.md                          # Dokumentasi utama System Prompt & aturan Motion Design Agent
└── scripts/
    ├── basic_motion/                  # Modul gerakan dasar & komposisi promo
    │   ├── liquid-gradient-effectcraft.sh
    │   ├── shape-repeater-effectcraft.sh
    │   ├── product-promo-effectcraft.sh
    │   ├── particle-reveal-effectcraft.sh
    │   ├── kinetic-typography-effectcraft.sh
    │   ├── frosted-glass-effectcraft.sh
    │   └── master-motion-graphics.sh
    ├── advanced_vfx/                  # Modul efek visual 3D & sinematik
    │   ├── chrome-title-effectcraft.sh
    │   ├── sketch-logo-effectcraft.sh
    │   ├── infographics-slider-effectcraft.sh
    │   ├── wireframe-3d-effectcraft.sh
    │   ├── instagram-reels-effectcraft.sh
    │   ├── complex-patterns-effectcraft.sh
    │   └── master-all-techniques.sh
    └── kinetic_typography/            # Modul animasi tipografi eksperimental
        ├── stretch-typography-effectcraft.sh
        ├── rolling-typography-effectcraft.sh
        ├── liquid-typography-effectcraft.sh
        ├── text-displacement-effectcraft.sh
        ├── bulge-typography-effectcraft.sh
        ├── circular-typography-effectcraft.sh
        ├── trippy-typography-effectcraft.sh
        └── master-typography-effects.sh
```

## 🚀 Cara Menggunakan

1. Extract file zip ini dan unggah folder `effectcraft-skills-repository` ke **Google Drive** Anda (atau push ke **GitHub**).
2. Berikan `SKILLS.md` sebagai *System Prompt / Instruction* pada Agentic AI Anda.
3. Jalankan skrip CLI individual atau gunakan skrip *Master Orchestrator* (`master-*.sh`) untuk mengeksekusi animasi secara berurutan di `effectcraft-cli`.

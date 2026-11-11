#!/usr/bin/env node
// Remaps themes.json fonts to the bundled OFL set (assets/fonts/fonts.json).
// Run after scripts/fetch-fonts.mjs and `node bin/ecm.mjs fonts --install`.
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const fonts = JSON.parse(readFileSync(ROOT + "assets/fonts/fonts.json", "utf8"));
const themes = JSON.parse(readFileSync(ROOT + "themes.json", "utf8"));

const pick = (family, weight = 400) => {
  const list = Object.entries(fonts).filter(([, f]) => f.family.split(",")[0] === family || f.family.startsWith(family));
  const hit = list.find(([, f]) => f.weight === weight) || list[0];
  if (!hit) throw new Error(`missing font ${family} ${weight}`);
  return hit[0];
};

// theme: [displayFamily, displayWeight, bodyFamily, bodyWeight, labelFamily, labelWeight]
const MAP = {
  reel: ["Bebas Neue", 400, "Inter", 400, "JetBrains Mono", 400],
  pitch: ["Inter", 700, "Inter", 400, "JetBrains Mono", 400],
  infopop: ["Archivo Black", 400, "Montserrat", 600, "Montserrat", 600],
  kinetik: ["Oswald", 700, "Barlow Condensed", 600, "JetBrains Mono", 400],
  tenang: ["Manrope", 700, "Manrope", 700, "Manrope", 700],
  edukasi: ["Poppins", 700, "Poppins", 600, "Poppins", 600],
  "art-deco-foil": ["Monoton", 400, "Cinzel", 700, "Cinzel", 700],
  blueprint: ["Space Grotesk", 500, "IBM Plex Mono", 400, "IBM Plex Mono", 400],
  "botanical-plate": ["Fraunces", 700, "Bitter", 700, "Bitter", 700],
  "chalkboard-lesson": ["Caveat", 700, "Patrick Hand", 400, "Patrick Hand", 400],
  "chapter-cards": ["DM Serif Display", 400, "Inter", 400, "Inter", 400],
  cinematic: ["Playfair Display", 700, "Inter", 400, "Inter", 400],
  "compass-bloom": ["Cinzel", 700, "Bitter", 700, "Bitter", 700],
  cyanotype: ["Instrument Serif", 400, "IBM Plex Mono", 400, "IBM Plex Mono", 400],
  "deep-sea-glow": ["Fraunces", 700, "Inter", 400, "Inter", 400],
  "dot-ledger": ["Roboto Slab", 700, "Roboto Slab", 700, "Space Mono", 400],
  "dreamy-aura": ["Quicksand", 700, "Quicksand", 700, "Quicksand", 700],
  "editorial-spread": ["Playfair Display", 700, "Playfair Display", 400, "Inter", 400],
  "ember-room": ["Playfair Display", 700, "Bitter", 700, "Bitter", 700],
  "essay-collage": ["Ultra", 400, "Bitter", 700, "Bitter", 700],
  "flat-vector": ["Poppins", 700, "Poppins", 600, "Poppins", 600],
  "flow-field": ["Instrument Serif", 400, "Inter", 400, "Inter", 400],
  "frosted-glass": ["Public Sans", 700, "Public Sans", 700, "Public Sans", 700],
  "gold-vine": ["Cinzel", 700, "Bitter", 700, "Bitter", 700],
  "graphite-sketchbook": ["Kalam", 700, "Patrick Hand", 400, "Patrick Hand", 400],
  "growing-island": ["Outfit", 700, "Outfit", 700, "Outfit", 700],
  "hand-drawn": ["Permanent Marker", 400, "Caveat", 700, "Caveat", 700],
  impasto: ["Abril Fatface", 400, "Bitter", 700, "Bitter", 700],
  "ink-3d-world": ["Space Grotesk", 700, "Inter", 400, "JetBrains Mono", 400],
  "ink-in-water": ["Fraunces", 700, "Inter", 400, "Inter", 400],
  "iso-night": ["DM Serif Display", 400, "Inter", 400, "Inter", 400],
  "isometric-pastel": ["Figtree", 700, "Figtree", 700, "Figtree", 700],
  "lamp-ink": ["Kalam", 700, "Caveat", 700, "Caveat", 700],
  "lantern-night": ["Amiri", 700, "Amiri", 400, "Amiri", 400],
  "lattice-light": ["Cinzel", 700, "Bitter", 700, "Bitter", 700],
  "line-art-story": ["Plus Jakarta Sans", 700, "Plus Jakarta Sans", 700, "IBM Plex Mono", 400],
  linocut: ["Alfa Slab One", 400, "Bitter", 700, "Bitter", 700],
  "low-poly": ["Lexend", 700, "Lexend", 700, "IBM Plex Mono", 400],
  "manuscript-page": ["Amiri", 700, "Amiri", 400, "Amiri", 400],
  "matisse-cutouts": ["Amatic SC", 700, "Patrick Hand", 400, "Patrick Hand", 400],
  "minimal-geometry": ["Sora", 700, "Sora", 700, "Sora", 700],
  "moon-phases": ["Instrument Serif", 400, "Inter", 400, "Inter", 400],
  "napkin-sketch": ["Permanent Marker", 400, "Caveat", 700, "Caveat", 700],
  "newsprint-collage": ["Special Elite", 400, "Courier Prime", 400, "Courier Prime", 400],
  "nouveau-card": ["Playfair Display", 700, "Bitter", 700, "Bitter", 700],
  "one-line": ["Instrument Serif", 400, "Inter", 400, "Inter", 400],
  origami: ["Work Sans", 700, "Work Sans", 700, "Work Sans", 700],
  "paper-diorama": ["DM Serif Display", 400, "Inter", 400, "Inter", 400],
  "papercraft-kit": ["Bungee", 400, "Nunito", 700, "Nunito", 700],
  "pastel-cinema": ["Nunito", 700, "Nunito", 700, "Nunito", 700],
  "pen-stroke-calligraphy": ["Great Vibes", 400, "Inter", 400, "Inter", 400],
  "pixel-quest": ["Press Start 2P", 400, "VT323", 400, "VT323", 400],
  "pressed-flower-journal": ["Caveat", 700, "Patrick Hand", 400, "Courier Prime", 400],
  "qalam-sketch": ["Amiri", 700, "Amiri", 400, "Amiri", 400],
  "rain-and-light": ["Source Sans 3", 700, "Source Sans 3", 700, "Source Sans 3", 700],
  "retro-os": ["Silkscreen", 700, "Space Mono", 400, "Space Mono", 400],
  ridgeline: ["Cinzel", 700, "Bitter", 700, "Bitter", 700],
  "rim-light-stick": ["Playfair Display", 700, "Inter", 400, "Inter", 400],
  "riso-print": ["Abril Fatface", 400, "Karla", 700, "Karla", 700],
  "stained-glass": ["Cinzel", 700, "Bitter", 700, "Bitter", 700],
  "star-chart": ["Instrument Serif", 400, "IBM Plex Mono", 400, "IBM Plex Mono", 400],
  "sumi-e-wash": ["Fraunces", 700, "Inter", 400, "Inter", 400],
  "swiss-grid-poster": ["Inter", 700, "Inter", 400, "Inter", 400],
  "time-road": ["Roboto Slab", 700, "Roboto Slab", 700, "Space Mono", 400],
  "voxel-diorama": ["Rubik", 700, "Rubik", 700, "Rubik", 700],
  "watercolour-bloom": ["Playfair Display", 700, "Inter", 400, "Inter", 400],
  "watercolour-sketchbook": ["Kalam", 700, "Caveat", 700, "Caveat", 700],
  "wireframe-terrain": ["Space Grotesk", 700, "IBM Plex Mono", 400, "IBM Plex Mono", 400],
  "word-stack": ["Anton", 400, "Inter", 400, "Inter", 400],
  "zellige-tile": ["Reem Kufi", 700, "Amiri", 400, "Amiri", 400],
};

let changed = 0;
for (const [id, [df, dw, bf, bw, lf, lw]] of Object.entries(MAP)) {
  const t = themes[id];
  if (!t) { console.error(`unknown theme ${id}`); continue; }
  t.fonts = { ...t.fonts, display: pick(df, dw), body: pick(bf, bw), label: pick(lf, lw) };
  if (t.fonts.quote) t.fonts.quote = pick(df, dw);
  if (t.fonts.arabic) t.fonts.arabic = pick("Amiri", 400);
  changed++;
}
writeFileSync(ROOT + "themes.json", JSON.stringify(themes, null, 2) + "\n");
console.log(`${changed} themes remapped to bundled fonts`);

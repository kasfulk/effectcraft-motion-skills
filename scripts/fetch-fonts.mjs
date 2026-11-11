#!/usr/bin/env node
// Downloads the bundled font set from Google Fonts (OFL) into assets/fonts/.
// Writes assets/fonts/fonts.json: PostScript name -> {family, style, weight, category, file}.
// Idempotent: existing files are kept. Run: node scripts/fetch-fonts.mjs
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "assets/fonts");
const UA = "Mozilla/4.0";

// [family, weights, category]
const FAMILIES = [
  ["Bebas Neue", [400], "display"],
  ["Anton", [400], "display"],
  ["Archivo Black", [400], "display"],
  ["Space Grotesk", [500, 700], "display"],
  ["Syne", [700, 800], "display"],
  ["Unbounded", [700], "display"],
  ["Instrument Serif", [400], "serif"],
  ["Playfair Display", [400, 700], "serif"],
  ["Fraunces", [700], "serif"],
  ["DM Serif Display", [400], "serif"],
  ["Bricolage Grotesque", [700], "display"],
  ["Oswald", [500, 700], "condensed"],
  ["Barlow Condensed", [600, 700], "condensed"],
  ["Righteous", [400], "display"],
  ["Monoton", [400], "display"],
  ["Cinzel", [700], "serif"],
  ["Abril Fatface", [400], "display"],
  ["Alfa Slab One", [400], "slab"],
  ["Ultra", [400], "slab"],
  ["Bungee", [400], "display"],
  ["Titan One", [400], "display"],
  ["Bowlby One", [400], "display"],
  ["Passion One", [700], "display"],
  ["Teko", [600], "condensed"],
  ["Fjalla One", [400], "condensed"],
  ["Lobster", [400], "script"],
  ["Pacifico", [400], "script"],
  ["Dancing Script", [700], "script"],
  ["Great Vibes", [400], "script"],
  ["Caveat", [700], "hand"],
  ["Kalam", [700], "hand"],
  ["Permanent Marker", [400], "hand"],
  ["Patrick Hand", [400], "hand"],
  ["Amatic SC", [700], "hand"],
  ["Special Elite", [400], "typewriter"],
  ["Courier Prime", [400, 700], "typewriter"],
  ["VT323", [400], "pixel"],
  ["Press Start 2P", [400], "pixel"],
  ["Silkscreen", [400, 700], "pixel"],
  ["Rubik", [500, 700], "sans"],
  ["Nunito", [700], "sans"],
  ["Quicksand", [700], "sans"],
  ["Poppins", [600, 700], "sans"],
  ["Manrope", [700], "sans"],
  ["Sora", [700], "sans"],
  ["Plus Jakarta Sans", [700], "sans"],
  ["Outfit", [700], "sans"],
  ["Figtree", [700], "sans"],
  ["Lexend", [700], "sans"],
  ["Work Sans", [700], "sans"],
  ["Public Sans", [700], "sans"],
  ["Source Sans 3", [700], "sans"],
  ["Inter", [400, 700], "sans"],
  ["Montserrat", [600, 800], "sans"],
  ["DM Sans", [700], "sans"],
  ["Karla", [700], "sans"],
  ["Cabin", [700], "sans"],
  ["Raleway", [700], "sans"],
  ["Josefin Sans", [700], "sans"],
  ["Roboto Slab", [700], "slab"],
  ["Bitter", [700], "slab"],
  ["JetBrains Mono", [400, 700], "mono"],
  ["Space Mono", [400, 700], "mono"],
  ["IBM Plex Mono", [400, 700], "mono"],
  ["Amiri", [400, 700], "arabic"],
  ["Reem Kufi", [700], "arabic"],
  ["Cairo", [700], "arabic"],
  ["Tajawal", [700], "arabic"],
  ["Almarai", [700], "arabic"],
  ["Lateef", [400], "arabic"],
  ["Noto Naskh Arabic", [400, 700], "arabic"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const cssUrl = (family, weights) => {
  const w = weights.length === 1 && weights[0] === 400 ? "" : `:wght@${weights.join(";")}`;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${w}&display=swap`;
};

async function get(url, as = "text") {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "buffer" ? Buffer.from(await r.arrayBuffer()) : r.text();
}

const fonts = {};
let failed = 0;
for (const [family, weights, category] of FAMILIES) {
  try {
    const css = await get(cssUrl(family, weights));
    const blocks = css.split("@font-face").slice(1);
    let got = 0;
    for (const b of blocks) {
      const weight = Number((b.match(/font-weight:\s*(\d+)/) || [])[1] || 400);
      const url = (b.match(/url\((https:[^)]+\.ttf)\)/) || [])[1];
      if (!url) continue;
      const dir = join(OUT, slug(family));
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `${family.replace(/\s+/g, "")}-${weight}.ttf`);
      if (!existsSync(file)) writeFileSync(file, await get(url, "buffer"));
      const [ps, fam, style] = execFileSync("fc-scan", ["--format", "%{postscriptname}\t%{family}\t%{style}", file], { encoding: "utf8" }).trim().split("\t");
      fonts[ps] = { family: fam, style, weight, category, file: file.replace(ROOT, "") };
      got++;
    }
    const ofl = join(OUT, slug(family), "OFL.txt");
    if (!existsSync(ofl)) {
      try { writeFileSync(ofl, await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${slug(family)}/OFL.txt`)); } catch {}
    }
    console.log(`${family}: ${got} file(s)`);
  } catch (e) {
    failed++;
    console.error(`${family}: FAILED ${e.message}`);
  }
}
writeFileSync(join(OUT, "fonts.json"), JSON.stringify(fonts, null, 2));
console.log(`\n${Object.keys(fonts).length} fonts -> assets/fonts/fonts.json (${failed} families failed)`);

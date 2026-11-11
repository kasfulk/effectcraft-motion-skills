// Builds one spec per scene layout and previews it, so a broken layout branch cannot ship
// unnoticed: the unit tests exercise spec validation, not the generated JSX.
// Usage: node scripts/smoke-layouts.mjs [theme]
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const theme = process.argv[2] || "reel";

const payload = {
  hook: { text: "Ubah cara melihat uang" },
  kinetic: { lines: ["Catat.", "Sisihkan.", "Tumbuh."] },
  quote: { text: "Yang terukur lebih mudah diperbaiki.", source: "Catatan harian" },
  stat: { value: 72, label: "target tabungan" },
  bars: { items: [{ label: "Jan", value: 1.2 }, { label: "Feb", value: 1.8 }, { label: "Mar", value: 1.4 }] },
  donut: { value: 72, label: "target tabungan" },
  steps: { items: ["Catat pengeluaran", "Sisihkan 10%", "Otomatiskan"] },
  compare: { left: { title: "Tanpa catatan", points: ["Uang habis", "Sering kaget"] }, right: { title: "Dengan catatan", points: ["Tahu arah uang", "Lebih tenang"] } },
  outro: { text: "Mulai dari hari ini.", cta: "Simpan untuk nanti" },
  counter: { value: 72, label: "pekerja" },
  dotgrid: { count: 9, cols: 3, rows: 3 },
  dial: { value: 18, max: 24, label: "jam produktif" },
  orbit: { rings: [{ r: 200, count: 8, speed: 1 }], centreText: "Fokus" },
  cards: { cards: [{ text: "Cepat" }, { text: "Rapi" }, { text: "Aman" }] },
  timeline: { span: { start: 0, end: 10, unit: "hari" }, events: [{ at: 0.2, label: "Mulai" }, { at: 0.8, label: "Selesai" }] },
  particles: { count: 40, target: "word", text: "Fokus" },
  zoom: { levels: [{ label: "Kota", kind: "grid", n: 9 }, { label: "Dunia", kind: "rings", n: 3 }] },
};

const layouts = {
  hook: ["center", "bottom", "split"],
  kinetic: ["slide", "mask", "stagger", "morph", "world"],
  quote: ["center", "card", "rule"],
  stat: ["center", "ring", "left", "split"],
  bars: ["vertical", "horizontal", "race", "lollipop"],
  donut: ["ring", "multi", "gauge"],
  steps: ["list", "timeline", "cards"],
  compare: ["stack", "split"],
  outro: ["center", "pill", "handle"],
};

const cases = [];
for (const [type, list] of Object.entries(layouts)) for (const layout of list) cases.push({ type, layout, scene: { type, layout, ...payload[type] } });
for (const type of Object.keys(payload)) if (!layouts[type]) cases.push({ type, layout: "(default)", scene: { type, ...payload[type] } });

// Transitions live in the Main comp, so each one needs a two-scene spec to be exercised at all.
const transitions = ["cut", "fade", "wipe", "slide", "dip", "whip", "fold", "maskWipe", "pageTurn", "zoom", "glitch", "dipSeed", "colorShift"];
for (const transition of transitions) cases.push({ type: "transition", layout: transition, scenes: [{ type: "hook", text: "Sebelum" }, { type: "outro", text: "Sesudah", transition }] });

const dir = mkdtempSync(join(tmpdir(), "ecm-smoke-"));
const failures = [];
for (const c of cases) {
  const file = join(dir, `${c.type}-${c.layout.replace(/\W/g, "")}.json`);
  writeFileSync(file, JSON.stringify({ theme, scenes: c.scenes || [c.scene] }));
  const r = spawnSync(process.execPath, [join(root, "bin", "ecm.mjs"), "preview", file], { encoding: "utf8" });
  const msg = (r.stderr || "").split(/\r?\n/).filter((l) => l.trim()).at(-1) || "";
  if (r.status === 0) console.log(`PASS ${c.type}/${c.layout}`);
  else { console.log(`FAIL ${c.type}/${c.layout}: ${msg}`); failures.push(`${c.type}/${c.layout}: ${msg}`); }
}
rmSync(dir, { recursive: true, force: true });

console.log(`\n${cases.length - failures.length}/${cases.length} cases build`);
if (failures.length) { console.log(failures.join("\n")); process.exit(1); }

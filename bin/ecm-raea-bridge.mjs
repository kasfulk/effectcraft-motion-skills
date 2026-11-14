#!/usr/bin/env node
// raea bridge: render a scene's .tsx with raea (raea.io), then import the MP4 as an
// effectcraft footage layer. Usage: node bin/ecm-raea-bridge.mjs scene.tsx [--out scene.mp4]
// [--dur 3] [--comp Bridge] [--project out.ecproj]. Needs `raea` and `effectcraft-cli` on PATH.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename, extname } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const src = args.find((a) => !a.startsWith("--"));
if (!src) {
  console.error("usage: ecm-raea-bridge.m scene.tsx [--out scene.mp4] [--dur 3] [--comp Bridge] [--project out.ecproj]");
  process.exit(1);
}
const tsx = resolve(src);
const out = resolve(flag("out", basename(src, extname(src)) + ".mp4"));
const dur = Number(flag("dur", 3)) || 3;
const compName = flag("comp", "Bridge");
const project = flag("project", out.replace(/\.mp4$/, ".ecproj"));

if (!existsSync(tsx)) { console.error(`raea-bridge: no such file: ${tsx}`); process.exit(1); }
for (const bin of ["raea", "effectcraft-cli"])
  if (spawnSync(bin, ["--version"], { encoding: "utf8" }).status !== 0) {
    console.error(`raea-bridge: ${bin} not on PATH`);
    process.exit(1);
  }

// 1. raea renders the tsx to an MP4 sized for the effectcraft comp.
const r = spawnSync("raea", ["render", tsx, "-o", out], { encoding: "utf8" });
if (r.status !== 0) {
  console.error((r.stderr || r.stdout || "").split("\n").filter(Boolean).slice(-3).join("\n"));
  process.exit(1);
}
console.log(`raea   rendered ${basename(out)} (${dur}s)`);

// 2. effectcraft imports it as footage in a one-scene comp.
const jsx = [
  `var footage = app.project.importFile(new ImportOptions(new File(${JSON.stringify(out)})));`,
  `var comp = app.project.items.addComp(${JSON.stringify(compName)}, 1080, 1920, 1, ${dur}, 30);`,
  `var layer = comp.layers.add(footage);`,
  `layer.startTime = 0; layer.inPoint = 0; layer.outPoint = ${dur};`,
  `writeLn('BRIDGE ' + JSON.stringify({comp: comp.name, layer: layer.index}));`,
].join("\n");
const tmp = join(mkdtempSync(join(tmpdir(), "ecm-raea-")), "bridge.jsx");
writeFileSync(tmp, jsx);
try {
  const b = spawnSync("effectcraft-cli", ["script", tmp, "--empty", "--save-as", project], { encoding: "utf8" });
  const line = (b.stdout || "").split("\n").find((l) => l.startsWith("BRIDGE "));
  if (b.status !== 0 || !line) {
    console.error((b.stderr || b.stdout || "effectcraft script failed").trim().split("\n").slice(-2).join("\n"));
    process.exit(1);
  }
  console.log(`bridge ${line.slice(7)} -> ${project}`);
} finally {
  rmSync(tmp, { force: true });
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`done   embed ${out} as a footage layer (assets.md: use it inside a custom scene's comp)`);

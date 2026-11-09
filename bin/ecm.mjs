#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SCENE_TYPES = ["hook", "kinetic", "stat", "bars", "donut", "steps", "compare", "quote", "outro", "custom"];

const FPS = 30;
const TEXT_TYPES = ["hook", "quote", "outro"];
const NOT_WORDS = new Set(["type", "bg", "emphasis", "jsx"]);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

export const loadThemes = () => JSON.parse(read("../themes.json"));

const str = (x) => typeof x === "string" && x.trim() !== "";
const strs = (a, min, max) => Array.isArray(a) && a.length >= min && a.length <= max && a.every(str);
const side = (s) => s && typeof s.title === "string" && Array.isArray(s.points) && s.points.length <= 4 && s.points.every((p) => typeof p === "string");

function sceneErrors(s) {
  const e = [];
  switch (s.type) {
    case "hook": case "quote": case "outro":
      if (!str(s.text)) e.push("text required");
      break;
    case "kinetic":
      if (!strs(s.lines, 1, 6)) e.push("lines must be 1–6 non-empty strings");
      break;
    case "stat":
      if (!Number.isFinite(s.value)) e.push("value must be a number");
      break;
    case "bars": {
      const ok = Array.isArray(s.items) && s.items.length >= 2 && s.items.length <= 6
        && s.items.every((i) => i && typeof i.label === "string" && Number.isFinite(i.value) && i.value >= 0);
      if (!ok) { e.push("items must be 2–6 of {label, value ≥ 0}"); break; }
      if (!s.items.some((i) => i.value > 0)) e.push("items need at least one value > 0");
      if (s.highlight !== undefined && !(Number.isInteger(s.highlight) && s.highlight >= 0 && s.highlight < s.items.length)) {
        e.push(`highlight must be 0–${s.items.length - 1}`);
      }
      break;
    }
    case "donut":
      if (!(Number.isFinite(s.value) && s.value >= 0 && s.value <= 100)) e.push("value must be 0–100");
      break;
    case "steps":
      if (!strs(s.items, 1, 5)) e.push("items must be 1–5 non-empty strings");
      break;
    case "compare":
      for (const k of ["left", "right"]) if (!side(s[k])) e.push(`${k} must be {title, points: up to 4 strings}`);
      break;
    case "custom":
      if (!str(s.jsx)) e.push("jsx required");
      break;
  }
  if (s.duration !== undefined && !(Number.isFinite(s.duration) && s.duration >= 1 && s.duration <= 15)) e.push("duration must be 1–15");
  if (s.bg !== undefined && !["base", "ink", "accent"].includes(s.bg)) e.push("bg must be base|ink|accent");
  const main = s.type === "kinetic" ? Array.isArray(s.lines) && s.lines.join(" ") : TEXT_TYPES.includes(s.type) && s.text;
  if (s.emphasis !== undefined && typeof main === "string") {
    if (!str(s.emphasis)) e.push("emphasis must be a non-empty string");
    else if (!main.toLowerCase().includes(s.emphasis.toLowerCase())) {
      e.push(`emphasis "${s.emphasis}" not found in ${s.type === "kinetic" ? "lines" : "text"}`);
    }
  }
  return e;
}

export function validate(spec, themes) {
  if (!spec || typeof spec !== "object") return ["spec: must be an object"];
  const errors = [];
  if (!Object.hasOwn(themes, spec.theme)) errors.push(`theme: unknown ${JSON.stringify(spec.theme)} (${Object.keys(themes).join(", ")})`);
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    errors.push("scenes: must be a non-empty array");
    return errors;
  }
  spec.scenes.forEach((s, i) => {
    const type = s?.type;
    const msgs = SCENE_TYPES.includes(type) ? sceneErrors(s) : ["type unknown"];
    for (const m of msgs) errors.push(`scene ${i + 1} (${type}): ${m}`);
  });
  return errors;
}

const strings = (v) =>
  typeof v === "string" ? [v]
  : Array.isArray(v) ? v.flatMap(strings)
  : v && typeof v === "object" ? Object.values(v).flatMap(strings)
  : [];

function dataItems(s) {
  if (s.type === "bars" || s.type === "steps") return s.items.length;
  if (s.type === "kinetic") return s.lines.length;
  if (s.type === "compare") return s.left.points.length + s.right.points.length;
  return 0;
}

export function durationOf(scene, theme) {
  if (scene.duration !== undefined) return Math.round(scene.duration * FPS) / FPS;
  const words = Object.entries(scene)
    .filter(([k]) => !NOT_WORDS.has(k))
    .flatMap(([, v]) => strings(v))
    .join(" ").split(/\s+/).filter(Boolean).length;
  const secs = Math.min(7, Math.max(2.5, 1.2 + 0.37 * words + 0.25 * dataItems(scene)));
  return Math.round(secs * theme.durationScale * FPS) / FPS;
}

const json = (x) => JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const MAIN = String.raw`
(function () {
  function ceilFrame(s) { return Math.ceil(s * 30) / 30; }
  assertFonts(THEME);
  var pre = [], starts = [], settle = [], finalDurs = DURS.slice(), at = 0;
  for (var i = 0; i < SPEC.scenes.length; i++) {
    var scene = SPEC.scenes[i], type = scene.type, dur = finalDurs[i];
    var c = app.project.items.addComp('S' + (i + 1) + '_' + type, 1080, 1920, 1, dur, 30);
    bgFor(c, THEME, scene.bg);
    var entered = 0;
    try {
      if (type === 'custom') {
        var fn = new Function('comp', 'theme', 'scene', 'dur', scene.jsx);
        entered = fn(c, THEME, scene, dur);
        if (typeof entered !== 'number') entered = 0.6 * dur;
      } else if (SCENES[type]) entered = SCENES[type](c, THEME, scene, dur);
      else throw new Error('unsupported scene type');
      var hasContent = false;
      for (var li = 1; li <= c.numLayers; li++) if (c.layer(li).comment !== 'bg') { hasContent = true; break; }
      if (!hasContent) throw new Error('renders blank');
      checkSafe(c, entered);
    } catch (e) {
      var msg = (e.name && e.name !== 'Error' ? e.name + ': ' : '') + e.message;
      throw new Error('scene ' + (i + 1) + ' (' + type + '): ' + msg);
    }
    var need = ceilFrame(entered + 1.5);
    if (need > dur) {
      if (scene.duration !== undefined) throw new Error('scene ' + (i + 1) + ' (' + type + '): duration too short, needs ≥ ' + need.toFixed(2) + 's');
      dur = need; c.duration = dur; finalDurs[i] = dur;
    }
    exitAll(c, dur); pre.push(c); starts.push(at); settle.push(entered); at += dur;
  }
  var main = app.project.items.addComp('Main', 1080, 1920, 1, at, 30);
  for (var j = 0; j < pre.length; j++) { var l = main.layers.add(pre[j]); l.startTime = starts[j]; l.outPoint = starts[j] + finalDurs[j]; animate(l.transform.scale, starts[j], starts[j] + finalDurs[j], [100,100], [103,103], 'calm'); }
  writeLn('ECM ' + JSON.stringify({settle:settle, durs:finalDurs}));
})();
`;

export function buildScript(spec, theme, durs) {
  return [
    `var SPEC = ${json(spec)};`,
    `var THEME = ${json(theme)};`,
    `var DURS = ${json(durs)};`,
    read("../lib/core.jsx"),
    read("../lib/scenes.jsx"),
    MAIN,
  ].join("\n");
}

function check(file) {
  let spec;
  try { spec = JSON.parse(readFileSync(file, "utf8")); }
  catch (err) { console.error(`${file}: ${err.message}`); return 1; }
  const themes = loadThemes();
  const errors = validate(spec, themes);
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  const theme = themes[spec.theme];
  let total = 0;
  spec.scenes.forEach((s, i) => {
    const d = durationOf(s, theme);
    total += d;
    console.log(`${i + 1}  ${s.type}  ${d.toFixed(2)}`);
  });
  console.log(`total  ${total.toFixed(2)}`);
  return 0;
}

function preview(file) {
  let spec;
  try { spec = JSON.parse(readFileSync(file, "utf8")); }
  catch (err) { console.error(`${file}: ${err.message}`); return 1; }
  const themes = loadThemes(), errors = validate(spec, themes);
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  const theme = themes[spec.theme], durs = spec.scenes.map((s) => durationOf(s, theme));
  const dir = dirname(file), base = basename(file, extname(file)), project = join(dir, base + '.ecproj'), sheet = join(dir, base + '.sheet.png');
  const tmp = join(mkdtempSync(join(tmpdir(), 'ecm-')), base + '.build.jsx');
  try {
    writeFileSync(tmp, buildScript(spec, theme, durs));
    const built = spawnSync('effectcraft-cli', ['script', tmp, '--empty', '--save-as', project], {encoding:'utf8'});
    if (built.status !== 0) { const lines = (built.stderr || built.stdout || '').split(/\r?\n/).filter((x) => /:\d+:\d+: /.test(x)); const msg = (lines.length ? lines[lines.length - 1].replace(/^.*?:\d+:\d+: /, '') : (built.stderr || built.stdout || '').trim()); console.error(msg); return 1; }
    const line = `${built.stdout || ''}
${built.stderr || ''}`.split(/\r?\n/).find((x) => x.startsWith('ECM '));
    if (!line) { console.error('missing ECM output'); return 1; }
    const meta = JSON.parse(line.slice(4)), starts = [], frames = [], t = meta.settle, ds = meta.durs; let at = 0;
    for (let i = 0; i < ds.length; i++) { starts.push(at); frames.push(join(dirname(tmp), `${i + 1}_${spec.scenes[i].type}.png`)); at += ds[i]; }
    for (let i = 0; i < frames.length; i++) {
      const time = starts[i] + Math.min(t[i] + 0.25, ds[i] - 0.35), r = spawnSync('effectcraft-cli', ['render-frame', '--project', project, '--comp', 'Main', '--time', String(time), '--max-side', '480', '--out', frames[i]], {encoding:'utf8'});
      if (r.status !== 0) { console.error((r.stderr || r.stdout || '').trim()); return 1; }
      const check = spawnSync('magick', [frames[i], '-colorspace', 'gray', '-format', '%[fx:standard_deviation]', 'info:'], {encoding:'utf8'});
      const deviation = Number(check.stdout.trim());
      if (check.status !== 0 || !Number.isFinite(deviation)) { console.error(`scene ${i + 1} (${spec.scenes[i].type}): blank check failed: ${(check.stderr || '').trim()}`); return 1; }
      if (deviation < 0.004) { console.error(`scene ${i + 1} (${spec.scenes[i].type}): renders blank at ${time}s`); return 1; }
    }
    const montage = spawnSync('magick', ['montage', '-font', '/System/Library/Fonts/Helvetica.ttc', ...frames.flatMap((f) => ['-label', '%t', f]), '-tile', '5x', '-geometry', '+8+8', sheet], {encoding:'utf8'});
    if (montage.status !== 0) { console.error((montage.stderr || montage.stdout || '').trim()); return 1; }
    for (const f of frames) rmSync(f, {force:true});
    console.log(sheet);
    return 0;
  } finally { rmSync(tmp, {force:true}); rmSync(dirname(tmp), {recursive:true, force:true}); }
}

// Node resolves symlinks in import.meta.url but not in argv[1]; the skill is installed via symlink.
const isMain = () => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
};

if (isMain()) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "check" && arg) process.exitCode = check(arg);
  else if (cmd === "preview" && arg) process.exitCode = preview(arg);
  else { console.error("usage: ecm.mjs <check|preview> <spec>"); process.exitCode = 1; }
}

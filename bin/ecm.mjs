#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SCENE_TYPES = ["hook", "kinetic", "stat", "bars", "donut", "steps", "compare", "quote", "outro", "custom"];

const FPS = 30;
const RENDER_LOCK = "/tmp/ecm-render.lock";
const TEXT_TYPES = ["hook", "quote", "outro"];
const NOT_WORDS = new Set(["type", "bg", "emphasis", "jsx", "fx"]);
export const FX_NAMES = ["grid", "liquid", "paper", "grain", "vignette", "glow", "rgbIn", "blurIn", "sweep", "float", "glitch"];
export const THEME_COLOR_KEYS = ["base","ink","accent","muted","data","sheet","marker"];
export const THEME_FONT_KEYS = ["display","body","label","quote","arabic"];

const tplLayer = (theme, tpl) => {
  const patch = { colors: { ...theme.colors }, fonts: { ...theme.fonts } };
  for (const [k, v] of Object.entries({ base: tpl.bg, ink: tpl.ink, accent: tpl.accent }))
    if (v != null) patch.colors[k] = v;
  for (const [k, v] of Object.entries({ display: tpl.font_head, body: tpl.font_body, label: tpl.font_body }))
    if (v != null) patch.fonts[k] = v;
  if (tpl.align != null) patch.align = tpl.align;
  return patch;
};

export const resolveTheme = (theme, spec, templates) => {
  const t = spec.template && templates ? { ...theme, ...tplLayer(theme, templates[spec.template]) } : theme;
  return { ...t, colors: { ...t.colors, ...(spec.colors || {}) }, fonts: { ...t.fonts, ...(spec.fonts || {}) } };
};
const HEX = /^#[0-9a-f]{6}$/i;
const plainObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const fxOk = (f) => f === undefined || (Array.isArray(f) && f.every((n) => FX_NAMES.includes(n)));
const FX_ERR = `fx must be an array of: ${FX_NAMES.join(", ")}`;
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

export const loadThemes = () => JSON.parse(read("../themes.json"));
export const loadTemplates = () => JSON.parse(read("../templates.json"));

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
      else if (Math.abs(s.value) >= 1e15) e.push("value must be below 1e15");
      break;
    case "bars": {
      const ok = Array.isArray(s.items) && s.items.length >= 2 && s.items.length <= 6
        && s.items.every((i) => i && typeof i.label === "string" && Number.isFinite(i.value) && i.value >= 0);
      if (!ok) { e.push("items must be 2–6 of {label, value ≥ 0}"); break; }
      if (s.items.some((i) => i.value >= 1e15)) e.push("values must be below 1e15");
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
  if (!fxOk(s.fx)) e.push(FX_ERR);
  for (const k of ["title", "label", "prefix", "suffix", "source", "cta"]) {
    if (s[k] !== undefined && typeof s[k] !== "string") e.push(`${k} must be a string`);
  }
  const main = s.type === "kinetic" ? strs(s.lines, 1, 6) && s.lines : TEXT_TYPES.includes(s.type) && s.text;
  if (s.emphasis !== undefined && (typeof main === "string" || Array.isArray(main))) {
    if (!str(s.emphasis)) e.push("emphasis must be a non-empty string");
    else if (Array.isArray(main) ? !main.some((line) => line.toLowerCase().includes(s.emphasis.toLowerCase())) : !main.toLowerCase().includes(s.emphasis.toLowerCase())) {
      e.push(`emphasis "${s.emphasis}" not found in ${s.type === "kinetic" ? "any line" : "text"}`);
    }
  }
  return e;
}

export function validate(spec, themes) {
  if (!spec || typeof spec !== "object") return ["spec: must be an object"];
  const errors = [];
  if (!Object.hasOwn(themes, spec.theme)) errors.push(`theme: unknown ${JSON.stringify(spec.theme)} (${Object.keys(themes).join(", ")})`);
  if (spec.template !== undefined) {
    const templates = loadTemplates();
    if (typeof spec.template !== "string" || !Object.hasOwn(templates, spec.template)) errors.push(`template: unknown ${JSON.stringify(spec.template)} (see templates.json)`);
  }
  if (Object.hasOwn(themes, spec.theme)) {
    const t = themes[spec.theme];
    if (t.fx !== undefined && (!Array.isArray(t.fx) || !t.fx.every((n) => FX_NAMES.includes(n)))) errors.push(`theme ${JSON.stringify(spec.theme)}: fx must be an array of: ${FX_NAMES.join(", ")}`);
    if (t.motifs !== undefined && !(Array.isArray(t.motifs) && t.motifs.every((m) => typeof m === "string"))) errors.push(`theme ${JSON.stringify(spec.theme)}: motifs must be an array of strings`);
  }
  if (!fxOk(spec.fx)) errors.push(FX_ERR);
  if (spec.colors !== undefined) {
    if (!plainObj(spec.colors)) errors.push("colors: must be a plain object");
    else for (const [k, v] of Object.entries(spec.colors)) {
      if (!THEME_COLOR_KEYS.includes(k)) errors.push(`colors: unknown key "${k}"`);
      else if (typeof v !== "string" || !HEX.test(v)) errors.push(`colors.${k}: must be #rrggbb`);
    }
  }
  if (spec.fonts !== undefined) {
    if (!plainObj(spec.fonts)) errors.push("fonts: must be a plain object");
    else for (const [k, v] of Object.entries(spec.fonts)) {
      if (!THEME_FONT_KEYS.includes(k)) errors.push(`fonts: unknown key "${k}"`);
      else if (!str(v)) errors.push(`fonts.${k}: must be a non-empty string`);
    }
  }
  if (spec.out !== undefined && !(typeof spec.out === "string" && spec.out.trim() !== "" && spec.out.endsWith(".mp4"))) errors.push("out: must be a .mp4 path");
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

export function validateDeck(deck, templates) {
  if (!deck || typeof deck !== "object") return ["deck: must be an object"];
  const errors = [];
  if (!str(deck.template) || !Object.hasOwn(templates, deck.template)) errors.push(`template: unknown ${JSON.stringify(deck.template)} (see templates.json)`);
  const themes = loadThemes();
  const tpl = templates[deck.template];
  if (tpl) {
    if (!Object.hasOwn(SLIDE_SIZES, tpl.size)) errors.push(`template "${deck.template}": size must be one of ${Object.keys(SLIDE_SIZES).join(", ")}`);
    if (tpl.drawing !== undefined && !["", "cover", "every", "some"].includes(tpl.drawing)) errors.push(`template "${deck.template}": drawing must be cover, every, some, or empty`);
  }
  const theme = deck.theme ?? tpl?.style;
  if (!Object.hasOwn(themes, theme)) errors.push(`theme: unknown ${JSON.stringify(theme)} (see themes.json)`);
  if (deck.out !== undefined && !(typeof deck.out === "string" && deck.out.trim() !== "")) errors.push("out: must be a non-empty directory name");
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
    errors.push("slides: must be a non-empty array (1–30)");
    return errors;
  }
  if (deck.slides.length > 30) errors.push("slides: at most 30 entries");
  deck.slides.forEach((s, i) => {
    if (!s || typeof s !== "object" || !str(s.text)) errors.push(`slide ${i + 1}: text required`);
    else for (const k of ["lead", "source", "emphasis"]) if (s[k] !== undefined && !str(s[k])) errors.push(`slide ${i + 1}: ${k} must be a non-empty string`);
    if (s && s.emphasis !== undefined && str(s.text) && !s.text.toLowerCase().includes(s.emphasis.toLowerCase())) errors.push(`slide ${i + 1}: emphasis not found in text`);
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
    SCENE_N = i + 1;
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
      var fxs = (THEME.fx || []).concat(SPEC.fx || [], scene.fx || []);
      entered = Math.max(entered, applyFx(c, THEME, fxs, entered));
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
    read("../lib/fx.jsx"),
    MAIN,
  ].join("\n");
}
export const SLIDE_SIZES = { "3:4": [1080, 1440], "4:5": [1080, 1350], "1:1": [1080, 1080] };

const SLIDES_MAIN = String.raw`
(function () {
  var W = SIZE[0], H = SIZE[1];
  assertFonts(THEME);
  var pre = [], at = 0;
  for (var i = 0; i < SPEC.slides.length; i++) {
    var c = app.project.items.addComp('P' + (i + 1), W, H, 1, 3, 30);
    bgFor(c, THEME, 'base');
    SLIDES.draw(c, TPL, THEME, SPEC.slides[i], i + 1, SPEC.slides.length, W, H);
    pre.push(c);
  }
  var main = app.project.items.addComp('Main', W, H, 1, pre.length, 30);
  for (var j = 0; j < pre.length; j++) { var l = main.layers.add(pre[j]); l.startTime = j; l.outPoint = j + 1; }
  writeLn('ECM ' + JSON.stringify({count: pre.length}));
})();
`;

export function buildSlidesScript(deck, tpl, theme, size) {
  return [
    `var SPEC = ${json(deck)};`,
    `var TPL = ${json(tpl)};`,
    `var THEME = ${json(theme)};`,
    `var SIZE = ${json(size)};`,
    read("../lib/core.jsx"),
    read("../lib/slides.jsx"),
    read("../lib/fx.jsx"),
    SLIDES_MAIN,
  ].join("\n");
}

function themes() {
  const list = loadThemes();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(list, null, 2));
    return 0;
  }
  for (const id of Object.keys(list).sort()) {
    const t = list[id];
    console.log([id, t.label, t.align, t.colors.base, t.colors.ink, t.colors.accent, t.fonts.display, (t.motifs || []).join(","), (t.fx || []).join(",")].join("\t"));
  }
  return 0;
}

function slides(file, outArg) {
  const deck = readSpec(file);
  if (deck === undefined) return 1;
  const templates = loadTemplates();
  const errors = validateDeck(deck, templates);
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  const tpl = templates[deck.template];
  const themeId = deck.theme ?? tpl.style;
  const theme = resolveTheme(loadThemes()[themeId], { template: deck.template }, templates);
  const size = SLIDE_SIZES[tpl.size] || [1080, 1440];
  const dir = dirname(file), base = basename(file, extname(file));
  const project = join(dir, base + ".ecproj");
  const outDir = resolve(dir, outArg || (deck.out ?? `${base}-slides`));
  mkdirSync(outDir, { recursive: true });
  const tmp = join(mkdtempSync(join(tmpdir(), "ecm-")), base + ".slides.jsx");
  try {
    writeFileSync(tmp, buildSlidesScript(deck, tpl, theme, size));
    const built = spawnSync("effectcraft-cli", ["script", tmp, "--empty", "--save-as", project], { encoding: "utf8" });
    if (built.status !== 0) {
      const lines = (built.stderr || built.stdout || "").split(/\r?\n/).filter((l) => /:\d+:\d+: /.test(l));
      console.error(lines.length ? lines[lines.length - 1].replace(/^.*?:\d+:\d+: /, "") : (built.stderr || built.stdout || "").trim() || built.error?.message || "effectcraft-cli failed to start");
      return 1;
    }
    for (let i = 0; i < deck.slides.length; i++) {
      const png = join(outDir, String(i + 1).padStart(2, "0") + ".png");
      const r = spawnSync("effectcraft-cli", ["render-frame", "--project", project, "--comp", "P" + (i + 1), "--time", "1.8", "--out", png], { encoding: "utf8" });
      if (r.status !== 0) { console.error((r.stderr || r.stdout || "").trim() || r.error?.message || "effectcraft-cli failed to start"); return 1; }
      const check = spawnSync("magick", [png, "-colorspace", "gray", "-format", "%[fx:standard_deviation]", "info:"], { encoding: "utf8" });
      const deviation = Number((check.stdout || "").trim());
      if (check.status !== 0 || !Number.isFinite(deviation)) { console.error(`slide ${i + 1}: blank check failed: ${(check.stderr || "").trim() || "magick failed"}`); return 1; }
      if (deviation < 0.004) { console.error(`slide ${i + 1}: renders blank`); return 1; }
    }
    console.log(outDir);
    return 0;
  } finally { rmSync(tmp, { force: true }); rmSync(dirname(tmp), { recursive: true, force: true }); }
}

function paths(file) {
  const dir = dirname(file), base = basename(file, extname(file));
  return { project: join(dir, base + ".ecproj"), sheet: join(dir, base + ".sheet.png") };
}

function sceneDurations(spec, theme) {
  return spec.scenes.map((s) => durationOf(s, theme));
}

function totalDuration(durs) {
  return durs.reduce((sum, d) => sum + d, 0);
}

function readSpec(file) {
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (err) { console.error(`${file}: ${err.message}`); return undefined; }
}

function check(file) {
  const spec = readSpec(file);
  if (spec === undefined) return 1;
  const themes = loadThemes(), templates = loadTemplates();
  const errors = validate(spec, themes);
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  const theme = resolveTheme(themes[spec.theme], spec, templates);
  const durs = sceneDurations(spec, theme);
  durs.forEach((d, i) => console.log(`${i + 1}  ${spec.scenes[i].type}  ${d.toFixed(2)}`));
  console.log(`total  ${totalDuration(durs).toFixed(2)}`);
  return 0;
}

function render(file) {
  try { mkdirSync(RENDER_LOCK); }
  catch (err) {
    if (err.code === "EEXIST") { console.error("another render is running (remove /tmp/ecm-render.lock if not)"); return 1; }
    console.error(err.message);
    return 1;
  }
  const release = () => rmSync(RENDER_LOCK, { recursive: true, force: true });
  const onInterrupt = (code) => { release(); process.exit(128 + code); };
  process.once("SIGINT", () => onInterrupt(2));
  process.once("SIGTERM", () => onInterrupt(15));
  try {
    const res = preview(file);
    if (res.code !== 0) return res.code;
    const spec = res.spec, { project } = paths(file), out = resolve(dirname(file), spec.out || `${basename(file, extname(file))}.mp4`);
    mkdirSync(dirname(out), {recursive:true});
    const built = spawnSync("effectcraft-cli", ["render", "--project", project, "--comp", "Main", "--out", out, "--format", "h264"], { encoding: "utf8" });
    if (built.status !== 0) {
      const lines = (built.stderr || "").split(/\r?\n/).filter((line) => line.trim());
      console.error(lines.at(-1) || (built.stdout || "").trim() || built.error?.message || "effectcraft-cli failed to start");
      return 1;
    }
    const total = totalDuration(res.durs);
    console.log(`total  ${total.toFixed(2)}`);
    console.log(out);
    return 0;
  } finally {
    release();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  }
}

function preview(file) {
  rmSync(paths(file).sheet, {force:true});
  const spec = readSpec(file);
  if (spec === undefined) return {code:1};
  const themes = loadThemes(), templates = loadTemplates(), errors = validate(spec, themes);
  if (errors.length) { for (const m of errors) console.error(m); return {code:1}; }
  const theme = resolveTheme(themes[spec.theme], spec, templates), durs = sceneDurations(spec, theme);
  const { project, sheet } = paths(file);
  const base = basename(file, extname(file));
  const tmp = join(mkdtempSync(join(tmpdir(), 'ecm-')), base + '.build.jsx');
  try {
    writeFileSync(tmp, buildScript(spec, theme, durs));
    const built = spawnSync('effectcraft-cli', ['script', tmp, '--empty', '--save-as', project], {encoding:'utf8'});
    if (built.status !== 0) { const lines = (built.stderr || built.stdout || '').split(/\r?\n/).filter((x) => /:\d+:\d+: /.test(x)); const msg = lines.length ? lines[lines.length - 1].replace(/^.*?:\d+:\d+: /, '') : ((built.stderr || built.stdout || '').trim() || built.error?.message || 'effectcraft-cli failed to start'); console.error(msg); return {code:1}; }
    const line = `${built.stdout || ''}
${built.stderr || ''}`.split(/\r?\n/).find((x) => x.startsWith('ECM '));
    if (!line) { console.error('missing ECM output'); return {code:1}; }
    const meta = JSON.parse(line.slice(4)), starts = [], frames = [], t = meta.settle, ds = meta.durs; let at = 0;
    for (let i = 0; i < ds.length; i++) { starts.push(at); frames.push(join(dirname(tmp), `${i + 1}_${spec.scenes[i].type}.png`)); at += ds[i]; }
    for (let i = 0; i < frames.length; i++) {
      const time = starts[i] + Math.min(t[i] + 0.25, ds[i] - 0.35), r = spawnSync('effectcraft-cli', ['render-frame', '--project', project, '--comp', 'Main', '--time', String(time), '--max-side', '480', '--out', frames[i]], {encoding:'utf8'});
      if (r.status !== 0) { console.error((r.stderr || r.stdout || '').trim() || r.error?.message || 'effectcraft-cli failed to start'); return {code:1}; }
      const check = spawnSync('magick', [frames[i], '-colorspace', 'gray', '-format', '%[fx:standard_deviation]', 'info:'], {encoding:'utf8'});
      const deviation = Number((check.stdout || '').trim());
      if (check.status !== 0 || !Number.isFinite(deviation)) { console.error(`scene ${i + 1} (${spec.scenes[i].type}): blank check failed: ${(check.stderr || '').trim() || check.error?.message || 'magick failed'}`); return {code:1}; }
      if (deviation < 0.004) { console.error(`scene ${i + 1} (${spec.scenes[i].type}): renders blank at ${time}s`); return {code:1}; }
    }
    const montage = spawnSync('magick', ['montage', '-font', '/System/Library/Fonts/Helvetica.ttc', ...frames.flatMap((f) => ['-label', '%t', f]), '-tile', '5x', '-geometry', '+8+8', sheet], {encoding:'utf8'});
    if (montage.status !== 0) { console.error((montage.stderr || montage.stdout || '').trim() || montage.error?.message || 'magick montage failed'); return {code:1}; }
    for (const f of frames) rmSync(f, {force:true});
    console.log(sheet);
    return {code:0, spec, durs:meta.durs};
  } finally { rmSync(tmp, {force:true}); rmSync(dirname(tmp), {recursive:true, force:true}); }
}

// Node resolves symlinks in import.meta.url but not in argv[1]; the skill is installed via symlink.
const isMain = () => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
};
function newSpec(theme, out) {
  const spec = { theme, out: `${theme}.mp4`, scenes: [
    { type: "hook", text: "Tulis hook di sini" },
    { type: "stat", value: 72, suffix: "%", label: "Tulis satu angka nyata" },
    { type: "outro", text: "Simpan video ini.", cta: "Follow untuk tips lain" },
  ]};
  const themes = loadThemes(), errors = validate(spec, themes);
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
  console.log(out);
  return 0;
}

if (isMain()) {
  const [cmd, arg, out] = process.argv.slice(2);
  if (cmd === "check" && arg) process.exitCode = check(arg);
  else if (cmd === "preview" && arg) process.exitCode = preview(arg).code;
  else if (cmd === "render" && arg) process.exitCode = render(arg);
  else if (cmd === "themes") process.exitCode = themes();
  else if (cmd === "slides" && arg) {
    let outArg;
    const oi = process.argv.indexOf("--out");
    if (oi !== -1) outArg = process.argv[oi + 1];
    process.exitCode = slides(arg, outArg);
  }
  else if (cmd === "new" && arg) {
    if (!Object.hasOwn(loadThemes(), arg)) { console.error(`theme: unknown ${JSON.stringify(arg)} (see reference/themes.md)`); process.exitCode = 1; }
    else process.exitCode = newSpec(arg, resolve(process.cwd(), out || `${arg}.json`));
  }
  else { console.error("usage: ecm.mjs <check|preview|render|themes|slides|new> <spec|deck|theme> [out]"); process.exitCode = 1; }
}

#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, realpathSync, renameSync, existsSync, copyFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SCENE_TYPES = ["hook", "kinetic", "stat", "bars", "donut", "steps", "compare", "quote", "outro", "custom",
  "counter", "dotgrid", "dial", "orbit", "cards", "timeline", "particles", "zoom"];

const FPS = 30;
const RENDER_LOCK = "/tmp/ecm-render.lock";
const TEXT_TYPES = ["hook", "quote", "outro"];
const NOT_WORDS = new Set(["type", "bg", "emphasis", "jsx", "fx", "transition", "layout", "elements", "atmosphere", "surface", "kind", "order", "corner", "axis", "hinge", "shape", "seed", "curve"]);
export const TRANSITIONS = ["cut", "fade", "wipe", "slide", "dip", "whip", "fold", "maskWipe", "pageTurn", "zoom", "glitch", "dipSeed", "colorShift"];
export const TRANSITION_LEN = { cut: 0, fade: 0.35, wipe: 0.4, slide: 0.45, dip: 0.4, fold: 0.9, maskWipe: 0.9, pageTurn: 1.0, zoom: 0.7, glitch: 0.7, dipSeed: 1.0, colorShift: 1.4, whip: 0.55 };
export const ELEMENT_NAMES = ["flash", "rays", "fog", "particles", "cracks", "lightning", "fire", "water"];
export const ATMOSPHERE_NAMES = ["none", "glow", "grain", "full"];
export const LAYOUTS = {
  hook: ["center", "split", "bottom"],
  kinetic: ["slide", "mask", "stagger", "morph", "world"],
  quote: ["center", "rule", "card"],
  stat: ["center", "left", "split", "ring"],
  bars: ["vertical", "horizontal", "race", "lollipop"],
  donut: ["ring", "gauge", "multi"],
  steps: ["list", "timeline", "cards"],
  compare: ["stack", "split"],
  outro: ["center", "pill", "handle"]
};
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
    case "counter":
      if (!Number.isFinite(s.value)) e.push("value must be a number");
      else if (Math.abs(s.value) >= 1e15) e.push("value must be below 1e15");
      if (s.curve !== undefined && !["ease", "flicker"].includes(s.curve)) e.push("curve must be ease|flicker");
      if (s.race !== undefined && !(plainObj(s.race) && Number.isFinite(s.race.to) && (s.race.label === undefined || typeof s.race.label === "string"))) e.push("race must be {to, label?}");
      break;
    case "dotgrid":
      if (!(Number.isInteger(s.count) && s.count >= 1)) e.push("count must be a positive integer");
      if (s.cols !== undefined && !(Number.isInteger(s.cols) && s.cols >= 1 && s.cols <= 40)) e.push("cols must be 1–40");
      if (s.rows !== undefined && !(Number.isInteger(s.rows) && s.rows >= 1 && s.rows <= 40)) e.push("rows must be 1–40");
      if (s.order !== undefined && !["row", "spiral", "wave"].includes(s.order)) e.push("order must be row|spiral|wave");
      if (s.shape !== undefined && !["dot", "bead", "square"].includes(s.shape)) e.push("shape must be dot|bead|square");
      if (s.missing !== undefined && !(Array.isArray(s.missing) && s.missing.every((i) => Number.isInteger(i) && i >= 0))) e.push("missing must be an array of indices");
      if (Number.isInteger(s.count) && s.count > 200) e.push("count must be 200 or less (render cost)");
      break;
    case "dial":
      if (!Number.isFinite(s.value)) e.push("value must be a number");
      if (s.max !== undefined && !(Number.isFinite(s.max) && s.max > 0)) e.push("max must be a positive number");
      if (s.marks !== undefined && !(Number.isInteger(s.marks) && s.marks >= 2 && s.marks <= 60)) e.push("marks must be 2–60");
      if (s.kind !== undefined && !["clock", "gauge", "sun"].includes(s.kind)) e.push("kind must be clock|gauge|sun");
      if (s.labels !== undefined && !(Array.isArray(s.labels) && s.labels.every((x) => typeof x === "string"))) e.push("labels must be an array of strings");
      break;
    case "orbit":
      if (!(Array.isArray(s.rings) && s.rings.length >= 1 && s.rings.length <= 5
        && s.rings.every((r) => plainObj(r) && Number.isFinite(r.r) && Number.isFinite(r.count) && r.count >= 1 && r.count <= 12))) e.push("rings must be 1–5 of {r, count 1–12, speed}");
      if (s.centre !== undefined && !["dot", "word", "none"].includes(s.centre)) e.push("centre must be dot|word|none");
      break;
    case "cards":
      if (!(Array.isArray(s.cards) && s.cards.length >= 1 && s.cards.length <= 9
        && s.cards.every((c) => plainObj(c) && str(c.text)))) e.push("cards must be 1–9 of {text, sub?}");
      if (s.cols !== undefined && !(Number.isInteger(s.cols) && s.cols >= 1 && s.cols <= 3)) e.push("cols must be 1–3");
      if (s.order !== undefined && !["row", "random"].includes(s.order)) e.push("order must be row|random");
      if (s.checks !== undefined && !(Array.isArray(s.checks) && s.checks.every((i) => Number.isInteger(i) && i >= 0))) e.push("checks must be an array of indices");
      break;
    case "timeline":
      if (!(plainObj(s.span) && Number.isFinite(s.span.start) && Number.isFinite(s.span.end) && s.span.end > s.span.start)) e.push("span must be {start, end > start, unit?}");
      if (!(Array.isArray(s.events) && s.events.length >= 1 && s.events.length <= 8
        && s.events.every((ev) => plainObj(ev) && Number.isFinite(ev.at) && ev.at >= 0 && ev.at <= 1 && str(ev.label)))) e.push("events must be 1–8 of {at 0..1, label}");
      if (s.runner !== undefined && !["light", "none"].includes(s.runner)) e.push("runner must be light|none");
      break;
    case "particles":
      if (s.count !== undefined && !(Number.isInteger(s.count) && s.count >= 1 && s.count <= 120)) e.push("count must be 1–120");
      if (s.target !== undefined && !["circle", "word", "none"].includes(s.target)) e.push("target must be circle|word|none");
      if (s.target === "word" && !str(s.text)) e.push("text required when target is word");
      break;
    case "zoom":
      if (!(Array.isArray(s.levels) && s.levels.length >= 1 && s.levels.length <= 5
        && s.levels.every((l) => plainObj(l) && str(l.label) && ["dot", "grid", "rings"].includes(l.kind)))) e.push("levels must be 1–5 of {label, kind: dot|grid|rings, n?}");
      break;
  }
  if (s.layout !== undefined) {
    const allowed = LAYOUTS[s.type];
    if (!allowed) e.push(`layout: ${s.type} has no layouts`);
    else if (!allowed.includes(s.layout)) e.push(`layout: unknown "${s.layout}" for ${s.type} (${allowed.join("|")})`);
  }
  if (s.elements !== undefined && !(Array.isArray(s.elements) && s.elements.every((n) => ELEMENT_NAMES.includes(n)))) e.push(`elements must be an array of: ${ELEMENT_NAMES.join(", ")}`);
  if (s.atmosphere !== undefined && !ATMOSPHERE_NAMES.includes(s.atmosphere)) e.push(`atmosphere must be one of: ${ATMOSPHERE_NAMES.join(", ")}`);
  if (s.transition !== undefined && !TRANSITIONS.includes(s.transition)) e.push(`transition: unknown ${JSON.stringify(s.transition)} (${TRANSITIONS.join("|")})`);
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

// craft rules for the audio block; returns [] or error strings
export function validateAudio(audio, specDir, totalSeconds, sceneStarts, sceneCount) {
  const errors = [];
  if (audio.bed !== undefined && !str(audio.bed)) errors.push("audio.bed: must be a non-empty string");
  if (audio.bedGain !== undefined && !sfxGainOk(audio.bedGain)) errors.push("audio.bedGain: must be -40–0 dB");
  if (audio.sfx !== undefined) {
    if (!Array.isArray(audio.sfx)) errors.push("audio.sfx: must be an array");
    else {
      if (audio.sfx.length > 12) errors.push("audio.sfx: at most 12 entries");
      if (!audio.bed && audio.sfx.length === 0) errors.push("audio: needs a bed or at least one sfx");
      audio.sfx.forEach((s, i) => {
        const label = `audio.sfx[${i}]`;
        if (!plainObj(s)) { errors.push(`${label}: must be an object`); return; }
        if (!str(s.name)) errors.push(`${label}: name required`);
        const hasAt = s.at !== undefined, hasScene = s.scene !== undefined;
        if (hasAt && hasScene) errors.push(`${label}: use either "at" or "scene", not both`);
        if (!hasAt && !hasScene) errors.push(`${label}: needs "at" or "scene"`);
        if (hasAt && !(Number.isFinite(s.at) && s.at >= 0)) errors.push(`${label}: at must be a number ≥ 0`);
        if (hasScene && !(Number.isInteger(s.scene) && s.scene >= 1 && s.scene <= sceneCount)) errors.push(`${label}: scene must be 1–${sceneCount}`);
        if (!sfxGainOk(s.gain)) errors.push(`${label}: gain must be -40–0 dB`);
        if (hasAt && Number.isFinite(s.at) && s.at >= 0 && Number.isFinite(totalSeconds) && s.at > totalSeconds) errors.push(`${label}: at ${s.at}s is past the end (${totalSeconds.toFixed(2)}s)`);
      });
    }
  }
  if (audio.bed === undefined && !Array.isArray(audio.sfx)) errors.push("audio: needs a bed or at least one sfx");
  if (str(audio.bed)) {
    const file = resolveSfxFile(audio.bed, specDir);
    if (file === undefined || !AUDIO_EXT.test(file) || !existsSync(file))
      errors.push(`audio.bed: cannot find "${audio.bed}" (looked in assets/sfx/beds as .wav/.m4a/.mp3/.ogg, and next to the spec)`);
  }
  // resolution + overlap + density need valid entries
  if (Array.isArray(audio.sfx)) {
    audio.sfx.forEach((s, i) => {
      if (!plainObj(s) || !str(s.name)) return;
      const file = resolveSfxFile(s.name, specDir);
      if (file === undefined || !AUDIO_EXT.test(file) || !existsSync(file))
        errors.push(`audio.sfx[${i}]: cannot find "${s.name}" (looked in assets/sfx and assets/sfx/beds as .wav/.m4a/.mp3/.ogg, and next to the spec)`);
    });
    const times = audio.sfx.map((s, i) => ({ i, s, t: s.at !== undefined ? s.at : s.scene !== undefined ? sceneStarts[s.scene - 1] : undefined }))
      .filter((x) => Number.isFinite(x.t)).sort((a, b) => a.t - b.t);
    for (let j = 1; j < times.length; j++)
      if (times[j].t - times[j - 1].t < 0.5) errors.push(`audio.sfx[${times[j].i}] overlaps audio.sfx[${times[j - 1].i}] (0.5 s minimum)`);
    if (times.length > 1 && times.length / totalSeconds > 1 / 2.5) errors.push(`audio.sfx: too dense (${times.length} sfx in ${totalSeconds.toFixed(2)}s; one per 2.5 s minimum)`);
  }
  return errors;
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
  if (spec.transition !== undefined && !TRANSITIONS.includes(spec.transition)) errors.push(`transition: unknown ${JSON.stringify(spec.transition)} (${TRANSITIONS.join("|")})`);
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

// validate with the audio block resolved: needs durations for scene-relative and density rules
export function validateSpec(spec, themes, specDir = process.cwd()) {
  const errors = validate(spec, themes);
  if (errors.length || !spec || typeof spec !== "object" || spec.audio === undefined) return errors;
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) return errors;
  const theme = Object.hasOwn(themes, spec.theme) ? resolveTheme(themes[spec.theme], spec, loadTemplates()) : null;
  if (!theme) return errors;
  if (!plainObj(spec.audio)) return [...errors, "audio: must be an object"];
  const durs = sceneDurations(spec, theme);
  let at = 0; const starts = durs.map((d) => { const s = at; at += d; return s; });
  errors.push(...validateAudio(spec.audio, specDir, at, starts, spec.scenes.length));
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
  for (const k of ["handle"]) if (deck[k] !== undefined && !str(deck[k])) errors.push(`${k}: must be a non-empty string`);
  for (const k of Object.keys(deck)) if (!["template", "theme", "out", "slides", "handle"].includes(k)) errors.push(`${k}: unknown deck field (template, theme, out, slides, handle)`);
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
  if (s.type === "cards") return s.cards.length;
  if (s.type === "timeline") return s.events.length;
  if (s.type === "orbit") return s.rings.length;
  if (s.type === "zoom") return s.levels.length;
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
  var TRLEN = ${json(TRANSITION_LEN)};
  // camera moves cycled by scene: [scale from, scale to, pan from, pan to]
  var CAMS = [
    {s0:[104,104], s1:[112,112], p0:[540,960], p1:[576,936]},  // push in, drift right
    {s0:[112,112], s1:[104,104], p0:[540,960], p1:[504,984]},  // pull out, drift left
    {s0:[106,106], s1:[112,112], p0:[540,960], p1:[540,912]},  // push in, crane up
    {s0:[112,112], s1:[106,106], p0:[540,960], p1:[566,960]}   // pull out, drift right
  ];
  var pre = [], starts = [], settle = [], finalDurs = DURS.slice(), trans = [], at = 0;
  for (var i = 0; i < SPEC.scenes.length; i++) {
    var scene = SPEC.scenes[i], type = scene.type, dur = finalDurs[i];
    var tr = i === 0 ? 'cut' : (scene.transition || SPEC.transition || 'cut');
    var ov = TRLEN[tr] || 0;
    SCENE_N = i + 1;
    var c = app.project.items.addComp('S' + (i + 1) + '_' + type, 1080, 1920, 1, dur + ov, 30);
    c.motionBlur = true; c.motionBlurSamples = 8;
    bgFor(c, THEME, scene.bg);
    if (typeof ATMOSPHERE !== 'undefined') ATMOSPHERE.apply(c, THEME, {atmosphere: scene.atmosphere});
    var entered = 0;
    try {
      if (type === 'custom') {
        var fn = new Function('comp', 'theme', 'scene', 'dur', scene.jsx);
        entered = fn(c, THEME, scene, dur);
        if (typeof entered !== 'number') entered = 0.6 * dur;
      } else {
        var builder = SCENES[type] || (typeof SCENES_EXTRA !== 'undefined' ? SCENES_EXTRA[type] : undefined);
        if (!builder) throw new Error('unsupported scene type');
        entered = builder(c, THEME, scene, dur);
      }
      var hasContent = false;
      for (var li = 1; li <= c.numLayers; li++) if (c.layer(li).comment !== 'bg') { hasContent = true; break; }
      if (!hasContent) throw new Error('renders blank');
      var fxs = (THEME.fx || []).concat(SPEC.fx || [], scene.fx || []);
      entered = Math.max(entered, applyFx(c, THEME, fxs, entered));
      if (scene.elements && typeof ELEMENTS !== 'undefined') entered = Math.max(entered, ELEMENTS.apply(c, THEME, scene.elements, {dur: dur}));
      if (typeof ATMOSPHERE !== 'undefined' && ATMOSPHERE.overlay) ATMOSPHERE.overlay(c, THEME, {atmosphere: scene.atmosphere});
      // Parallax: the atmosphere is the far plane, so it lags the camera. Without this the pan
      // moves frame and content together and the shot reads as flat.
      var PCAM = CAMS[i % 3], pdx = (PCAM.p1[0] - PCAM.p0[0]) * 0.8, pdy = (PCAM.p1[1] - PCAM.p0[1]) * 0.8;
      if (pdx || pdy) {
        for (var pn = 1; pn <= c.numLayers; pn++) {
          var ply = c.layer(pn);
          // Only the atmosphere glows: scene decor (slab, highlighter, hook-bar) is placed
          // against the text and has its own position keys, so drifting it breaks the layout.
          if (ply.adjustmentLayer || String(ply.name).indexOf('glow') !== 0) continue;
          var pp = ply.transform.position, pv = pp.value;
          animate(pp, 0, dur + ov, [pv[0], pv[1]], [pv[0] - pdx, pv[1] - pdy], 'calm');
        }
      }
      checkSafe(c, entered);
    } catch (e) {
      var msg = (e.name && e.name !== 'Error' ? e.name + ': ' : '') + e.message;
      throw new Error('scene ' + (i + 1) + ' (' + type + '): ' + msg);
    }
    var need = ceilFrame(entered + 1.5);
    if (need > dur) {
      if (scene.duration !== undefined) throw new Error('scene ' + (i + 1) + ' (' + type + '): duration too short, needs ≥ ' + need.toFixed(2) + 's');
      var oldDur = dur;
      dur = need; c.duration = dur + ov; finalDurs[i] = dur;
      for (var li = 1; li <= c.numLayers; li++) { var ll = c.layer(li); if (ll.outPoint >= oldDur - 0.01) ll.outPoint = dur + ov; }
    }
    trans.push(tr);
    // outgoing content stays visible through the transition window so the incoming layer crossfades over it
    exitAll(c, dur + ov);
    for (var mb = 1; mb <= c.numLayers; mb++) {
      var ml = c.layer(mb), expr = null;
      try { expr = ml.property('Source Text').expression; } catch (e) {}
      // A counting number must not be motion-blurred: eight shutter samples of a changing
      // Source Text smear several values on top of each other and the digits stop reading.
      ml.motionBlur = !expr;
    }
    pre.push(c); starts.push(at); settle.push(entered); at += dur;
  }
  var main = app.project.items.addComp('Main', 1080, 1920, 1, at, 30);
  main.motionBlur = true; main.motionBlurSamples = 8;
  var layers = [];
  for (var j = 0; j < pre.length; j++) {
    var st = starts[j], ov = TRLEN[trans[j]] || 0;
    // Camera on every scene, driven from a null: the transitions animate the scene layer's own
    // scale and position (fold, pageTurn, zoom, glitch, slide), so a camera written onto that
    // same layer would overwrite their keys. Parent/child keeps the two independent.
    // Amplitudes are pushed past the comfortable amount -- a 3 % drift reads as nothing on a phone.
    main.layers.addNull();
    var cam = main.layer(1); cam.name = 'cam' + (j + 1);
    cam.startTime = st - ov; cam.outPoint = st + finalDurs[j];
    cam.transform.anchorPoint.setValue([540, 960]);
    var CAM = CAMS[j % 3];
    animate(cam.transform.scale, cam.startTime, cam.outPoint, CAM.s0, CAM.s1, 'calm');
    animate(cam.transform.position, cam.startTime, cam.outPoint, CAM.p0, CAM.p1, 'calm');
    var l = main.layers.add(pre[j]);
    l.parent = cam;
    l.startTime = st - ov; l.outPoint = st + finalDurs[j];
    layers.push(l);
  }
  for (var k = 1; k < layers.length; k++) {
    var t = trans[k], o = TRLEN[t], cut = starts[k];
    if (t === 'fade') {
      layers[k].transform.opacity.setValueAtTime(cut - o, 0);
      animate(layers[k].transform.opacity, cut - o, cut, 0, 100, THEME.easing);
    } else if (t === 'wipe') {
      var w = layers[k].property('Effects').addProperty('Linear Wipe');
      w.property('Wipe Angle').setValue(THEME.align === 'left' ? 0 : 90);
      w.property('Feather').setValue(8);
      animate(w.property('Transition Completion'), cut - o, cut, 100, 0, 'smooth');
    } else if (t === 'slide') {
      var from = THEME.align === 'left' ? [540 + 1080, 960] : [540, 960 + 1920];
      animate(layers[k].transform.position, cut - o, cut, from, [540, 960], 'smooth');
    } else if (t === 'dip') {
      var half = o / 2;
      var dip = main.layers.addSolid(rgb(THEME.colors.ink), 'dip', 1080, 1920, 1);
      dip.comment = 'decor';
      dip.moveAfter(layers[k - 1]);
      dip.startTime = cut - half; dip.outPoint = cut + half;
      animate(dip.transform.opacity, cut - half, cut, 0, 100, 'smooth');
      animate(dip.transform.opacity, cut, cut + half, 100, 0, 'smooth');
    } else if (typeof TRANSITIONS !== 'undefined' && TRANSITIONS.apply) {
      TRANSITIONS.apply(main, THEME, t, layers[k - 1], layers[k], {start: cut - o, dur: o, index: k});
    }
  }
  for (var mb2 = 1; mb2 <= main.numLayers; mb2++) main.layer(mb2).motionBlur = true;
  writeLn('ECM ' + JSON.stringify({settle:settle, durs:finalDurs}));
})();
`;

const readLib = (rel) => { try { return read(rel); } catch { return ""; } };

export function buildScript(spec, theme, durs) {
  return [
    `var SPEC = ${json(spec)};`,
    `var THEME = ${json(theme)};`,
    `var DURS = ${json(durs)};`,
    readLib("../lib/core.jsx"),
    readLib("../lib/fx.jsx"),
    readLib("../lib/motion.jsx"),
    readLib("../lib/elements.jsx"),
    readLib("../lib/atmosphere.jsx"),
    readLib("../lib/transitions.jsx"),
    readLib("../lib/scenes.jsx"),
    readLib("../lib/scenes-extra.jsx"),
    MAIN,
  ].join("\n");
}
export const SLIDE_SIZES = { "3:4": [1080, 1440], "4:5": [1080, 1350], "1:1": [1080, 1080] };

const SLIDES_MAIN = String.raw`
(function () {
  var W = SIZE[0], H = SIZE[1];
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

export function suggestThemes(spec, themes) {
  const types = new Set((spec?.scenes || []).map((s) => s?.type));
  const has = (...names) => names.some((n) => types.has(n));
  const picks = [];
  const push = (id) => { if (themes[id] && !picks.includes(id)) picks.push(id); };
  if (has("stat", "bars", "donut", "counter", "dotgrid", "dial", "timeline")) {
    push("infopop"); push("edukasi"); push("reel"); push("kinetik");
  } else if (has("quote")) {
    push("pitch"); push("tenang"); push("editorial-spread"); push("manuscript-page");
  } else if (has("kinetic")) {
    push("kinetik"); push("reel"); push("infopop"); push("cinematic");
  } else if (has("cards", "steps", "compare")) {
    push("edukasi"); push("infopop"); push("chapter-cards"); push("minimal-geometry");
  } else {
    push("reel"); push("pitch"); push("infopop"); push("tenang");
  }
  for (const id of Object.keys(themes)) { if (picks.length >= 4) break; push(id); }
  return picks.slice(0, 4);
}

function fonts() {
  const dir = resolve(dirname(new URL(import.meta.url).pathname), "../assets/fonts");
  const manifest = JSON.parse(readFileSync(join(dir, "fonts.json"), "utf8"));
  if (process.argv.includes("--list")) {
    const byCat = {};
    for (const [ps, f] of Object.entries(manifest)) (byCat[f.category] ||= []).push(`${ps}  ${f.family} ${f.style}`);
    for (const cat of Object.keys(byCat).sort()) {
      console.log(`\n${cat}`);
      for (const line of byCat[cat].sort()) console.log("  " + line);
    }
    return 0;
  }
  if (process.argv.includes("--check")) {
    const themes = loadThemes();
    const list = engineFonts();
    if (!list) { console.error("effectcraft-cli unavailable; cannot check installed fonts"); return 1; }
    const have = new Set();
    for (const f of list.families) for (const s of f.styles) have.add(`${f.family}|${s}`);
    let bad = 0;
    for (const [id, t] of Object.entries(themes)) {
      const missing = [];
      for (const [k, ps] of Object.entries(t.fonts || {})) {
        const m = manifest[ps];
        if (!m) { missing.push(`${k}=${ps} (not bundled)`); continue; }
        const fam = m.family.split(",")[0].trim(), style = m.style.split(",")[0].trim();
        if (!have.has(`${fam}|${style}`)) missing.push(`${k}=${ps} (${fam} ${style})`);
      }
      if (missing.length) { bad++; console.log(`${id}: ${missing.join(", ")}`); }
    }
    if (bad) { console.error(`${bad} themes reference fonts that are not installed — run: node bin/ecm.mjs fonts --install`); return 1; }
    console.log(`all ${Object.keys(themes).length} themes use installed fonts`);
    return 0;
  }
  if (process.argv.includes("--install")) {
    const dest = process.platform === "darwin" ? join(homedir(), "Library/Fonts") : join(homedir(), ".local/share/fonts");
    mkdirSync(dest, { recursive: true });
    let n = 0;
    for (const f of Object.values(manifest)) {
      const src = join(dir, f.file.replace(/^assets\/fonts\//, ""));
      const out = join(dest, basename(src));
      if (!existsSync(out)) { copyFileSync(src, out); n++; }
    }
    spawnSync("fc-cache", ["-f"], { stdio: "ignore" });
    console.log(`${n} installed to ${dest} (${Object.keys(manifest).length} bundled)`);
    return 0;
  }
  console.log(`${Object.keys(manifest).length} bundled fonts in ${dir}`);
  console.log("usage: ecm.mjs fonts [--list|--check|--install]");
  return 0;
}

function themes() {
  const list = loadThemes();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(list, null, 2));
    return 0;
  }
  if (process.argv.includes("--suggest")) {
    const i = process.argv.indexOf("--suggest");
    const arg = process.argv[i + 1];
    const spec = arg && !arg.startsWith("--") ? readSpec(arg) : undefined;
    const picks = suggestThemes(spec, list);
    picks.forEach((id, n) => {
      const t = list[id], m = t.motion || {};
      console.log(`${n + 1}. ${id}  ${t.label}  ${m.energy || "calm"}/${m.transition || "fade"}  ${(t.motifs || []).join(",")}`);
    });
    console.log("5. type your own theme id (node ecm.mjs themes lists all 70)");
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
  const tpl = { ...templates[deck.template] };
  if (deck.handle !== undefined) tpl.handle = deck.handle;
  const themeId = deck.theme ?? tpl.style;
  const theme = resolveTheme(loadThemes()[themeId], { template: deck.template }, templates);
  try { checkFonts(theme); } catch (err) { console.error(err.message); return 1; }
  const size = SLIDE_SIZES[tpl.size] || [1080, 1440];
  const dir = dirname(file), base = basename(file, extname(file));
  const project = join(dir, base + ".ecproj");
  const outDir = resolve(dir, outArg || (deck.out ?? `${base}-slides`));
  mkdirSync(outDir, { recursive: true });
  const tmp = join(mkdtempSync(join(tmpdir(), "ecm-")), base + ".slides.jsx");
  try {
    writeFileSync(tmp, buildSlidesScript(deck, tpl, theme, size));
    console.log(`engine  effectcraft-cli script ${tmp} --empty --save-as ${project}`);
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

const wordsOf = (t) => String(t ?? "").trim().split(/\s+/).filter(Boolean).length;

export function lint(spec, theme, durs) {
  const out = [];
  const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
  const at = (i, type) => `scenes[${i}] (${type})`;
  const add = (code, scene, message, fix) => out.push({ code, scene, level: "warn", message, fix });

  // C01 structure
  if (scenes.length) {
    const first = scenes[0]?.type, last = scenes[scenes.length - 1]?.type;
    if (!["hook", "quote", "stat"].includes(first))
      add("C01", at(0, first), `cold open (first scene is ${first})`, `make scenes[0] {"type":"hook","text":"..."} or open with a quote/stat`);
    if (last !== "outro")
      add("C01", at(scenes.length - 1, last), "no outro/cta, viewers get no next step", `make the last scene {"type":"outro","text":"...","cta":"..."}`);
  }

  // C02 length
  if (scenes.length && scenes.length < 3)
    add("C02", "spec", `${scenes.length} scenes`, "merge or add scenes so there are 3–8");
  if (scenes.length > 8)
    add("C02", "spec", `${scenes.length} scenes`, "cut to 8 scenes or fewer");
  if (durs && durs.length) {
    const total = durs.reduce((a, b) => a + b, 0);
    if (total < 12) add("C02", "spec", `estimated total ${total.toFixed(2)} s`, `total under 12 s (is ${total.toFixed(2)}); add a scene or lengthen text`);
    if (total > 60) add("C02", "spec", `estimated total ${total.toFixed(2)} s`, `total over 60 s (is ${total.toFixed(2)}); cut scenes or shorten text`);
  }

  scenes.forEach((s, i) => {
    const where = at(i, s?.type);
    // C03 bars highlight
    if (s?.type === "bars" && Array.isArray(s.items) && s.items.length > 1) {
      const big = s.items.reduce((b, it, j) => (it.value > s.items[b].value ? j : b), 0);
      const small = s.items.reduce((b, it, j) => (it.value < s.items[b].value ? j : b), 0);
      if (s.highlight === undefined)
        add("C03", where, "no highlight", `add "highlight": ${big} (largest value is ${s.items[big].label})`);
      else if (s.items.some((it) => it.value !== s.items[small].value) && s.highlight === small && small !== big)
        add("C03", where, `highlight ${s.highlight} points at the smallest value (${s.items[small].label})`, `set "highlight": ${big} (largest value is ${s.items[big].label})`);
      else if (s.highlight !== big)
        add("C03", where, `note: highlight ${s.highlight} (${s.items[s.highlight]?.label}) is not the largest value`, `set "highlight": ${big} (largest value is ${s.items[big].label})`);
    }
    // C04 words
    if (s?.type === "hook" && wordsOf(s.text) > 9)
      add("C04", where, `hook is ${wordsOf(s.text)} words`, `rewrite "text" to 9 words or fewer`);
    if (s?.type === "kinetic" && Array.isArray(s.lines))
      s.lines.forEach((line, j) => { if (wordsOf(line) > 4)
        add("C04", where, `line ${j + 1} "${line}" is ${wordsOf(line)} words`, `split or trim lines[${j}] to 4 words or fewer`); });
    if (s?.type === "steps" && Array.isArray(s.items))
      s.items.forEach((item, j) => { if (wordsOf(item) > 7)
        add("C04", where, `step ${j + 1} "${item}" is ${wordsOf(item)} words`, `split or trim items[${j}] to 7 words or fewer`); });
    if (s?.type === "quote" && wordsOf(s.text) > 24)
      add("C04", where, `quote is ${wordsOf(s.text)} words`, `trim "text" to 24 words or fewer`);
    if (s?.type === "compare")
      for (const sideKey of ["left", "right"]) {
        const pts = s[sideKey]?.points;
        if (Array.isArray(pts)) pts.forEach((p, j) => { if (wordsOf(p) > 6)
          add("C04", where, `${sideKey} point ${j + 1} "${p}" is ${wordsOf(p)} words`, `trim ${sideKey}.points[${j}] to 6 words or fewer`); });
      }
    if (s?.type === "outro" && s.cta !== undefined && wordsOf(s.cta) > 5)
      add("C04", where, `cta is ${wordsOf(s.cta)} words`, `trim "cta" to 5 words or fewer`);
    // C05 emphasis
    if (["hook", "outro", "quote"].includes(s?.type)) {
      if (s.emphasis === undefined)
        add("C05", where, "no emphasis word; pick the one word the scene is about", `add "emphasis": "<one word from ${s.type === "outro" ? "text" : "text"}>"`);
      else if (wordsOf(s.emphasis) > 3)
        add("C05", where, `emphasis "${s.emphasis}" is ${wordsOf(s.emphasis)} words`, `trim "emphasis" to 3 words or fewer`);
    }
    // C07 fx
    if (Array.isArray(s.fx) && s.fx.length > 1)
      add("C07", where, `${s.fx.length} fx presets on one scene`, `keep at most 1 fx preset in "fx" (has ${JSON.stringify(s.fx)})`);
    if (Array.isArray(s.fx) && ["calm", "smooth"].includes(theme?.easing) && s.fx.some((f) => f === "glitch" || f === "rgbIn"))
      add("C07", where, `fx ${s.fx.filter((f) => f === "glitch" || f === "rgbIn").join(", ")} fights the ${theme.easing} theme`, `remove glitch/rgbIn or pick a snap/pop theme`);
    // C08 numbers
    if (s?.type === "stat") {
      if (s.label === undefined)
        add("C08", where, "stat without label", `add "label": "<what the number is>"`);
      if (Number.isFinite(s.value) && s.value > 100 && !s.prefix && !s.suffix)
        add("C08", where, `value ${s.value} reads like a percentage over 100`, `add "suffix": "%" or "prefix": "Rp " so the unit is clear`);
    }
    if (s?.type === "bars" && Array.isArray(s.items)) {
      const over = s.items.filter((it) => it.value > 100);
      if (over.length) add("C08", where, `bar value(s) over 100 (${over.map((it) => it.label).join(", ")})`, `rescale values (e.g. thousands) or make the unit part of each label`);
    }
    if (s?.type === "donut" && Number.isFinite(s.value) && !Number.isInteger(s.value))
      add("C08", where, `donut value ${s.value} has decimals`, `round "value" to a whole number`);
    // C09 long hold
    if (TEXT_TYPES.includes(s?.type) && s.duration !== undefined) {
      const auto = durationOf({ ...s, duration: undefined }, theme);
      if (s.duration > 2 * auto)
        add("C09", where, `explicit duration ${s.duration}s is more than 2x the ${auto.toFixed(2)}s estimate; long hold, viewers scroll`, `remove "duration" or set it near ${auto.toFixed(2)}`);
    }
  });

  // C07 spec-level fx
  if (Array.isArray(spec?.fx) && spec.fx.length > 1)
    add("C07", "spec", `${spec.fx.length} spec-level fx presets`, `keep at most 1 fx preset in spec "fx" (has ${JSON.stringify(spec.fx)})`);
  if (Array.isArray(spec?.fx) && ["calm", "smooth"].includes(theme?.easing) && spec.fx.some((f) => f === "glitch" || f === "rgbIn"))
    add("C07", "spec", `spec fx ${spec.fx.filter((f) => f === "glitch" || f === "rgbIn").join(", ")} fights the ${theme.easing} theme`, `remove glitch/rgbIn or pick a snap/pop theme`);

  // C06 rhythm
  for (let i = 0; i + 2 < scenes.length; i++) {
    const t = scenes[i]?.type;
    if (t === scenes[i + 1]?.type && t === scenes[i + 2]?.type && t !== "kinetic") {
      add("C06", at(i, t), `three consecutive ${t} scenes`, `vary the scene types (e.g. insert a kinetic or steps scene)`);
      break;
    }
  }
  if (scenes.length > 4) {
    for (let i = 0; i + 2 < scenes.length; i++) {
      const b = (j) => scenes[j]?.bg ?? "base";
      if (b(i) === b(i + 1) && b(i) === b(i + 2)) {
        add("C06", at(i, scenes[i]?.type), `flat rhythm; three scenes on bg ${b(i)}`, `alternate bg base/ink/accent on the turn (set "bg" on scenes[${i + 1}])`);
        break;
      }
    }
  }

  // C10 data-only
  const dataScenes = scenes.filter((s) => ["stat", "bars", "donut"].includes(s?.type)).length;
  if (dataScenes >= 3 && !scenes.some((s) => ["kinetic", "steps", "quote"].includes(s?.type)))
    add("C10", "spec", `${dataScenes} data scenes: numbers without a line of meaning`, `add a kinetic, steps, or quote scene that says what the numbers mean`);

  // C11 same type and layout back to back
  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1], b = scenes[i];
    if (a?.type === b?.type && (a.layout || "default") === (b.layout || "default"))
      add("C11", at(i, b.type), `same type and layout as scene ${i}`, `change "layout" on one of them (${(LAYOUTS[b.type] || []).join("|")})`);
  }

  // C12 transition monotony
  const trs = scenes.slice(1).map((s) => s.transition || spec.transition || "cut");
  if (trs.length >= 3 && new Set(trs).size === 1 && trs[0] !== "cut")
    add("C12", "spec", `every scene uses "${trs[0]}"`, `vary transitions: ${TRANSITIONS.filter((t) => t !== "cut").join("|")}`);

  // C13 flat look
  const hasAtmo = scenes.some((s) => s.atmosphere) || (theme?.motion?.atmosphere && theme.motion.atmosphere !== "none") || (theme?.fx || []).length || (spec.fx || []).length;
  if (!hasAtmo) add("C13", "spec", "no atmosphere or fx: flat background", `add "atmosphere":"glow" or an fx preset`);

  // C14 long lines in the new types
  scenes.forEach((s, i) => {
    const where = at(i, s?.type);
    if (s?.type === "cards" && Array.isArray(s.cards)) s.cards.forEach((c, j) => { if (wordsOf(c.text) > 6) add("C14", where, `card ${j + 1} is ${wordsOf(c.text)} words`, `trim cards[${j}].text to 6 words or fewer`); });
    if (s?.type === "timeline" && Array.isArray(s.events)) s.events.forEach((ev, j) => { if (wordsOf(ev.label) > 5) add("C14", where, `event ${j + 1} is ${wordsOf(ev.label)} words`, `trim events[${j}].label to 5 words or fewer`); });
    if (s?.type === "zoom" && Array.isArray(s.levels)) s.levels.forEach((l, j) => { if (wordsOf(l.label) > 4) add("C14", where, `level ${j + 1} is ${wordsOf(l.label)} words`, `trim levels[${j}].label to 4 words or fewer`); });
  });

  // C15 layout variety
  const layouts = scenes.map((s) => `${s.type}:${s.layout || "default"}`);
  const dup = new Set(layouts.filter((x, i) => layouts.indexOf(x) !== i));
  if (dup.size >= 2) add("C15", "spec", `${dup.size} layouts repeat`, `vary "layout" across scenes`);

  return out;
}

function check(file, strict) {
  const spec = readSpec(file);
  if (spec === undefined) return 1;
  const themes = loadThemes(), templates = loadTemplates();
  const errors = validateSpec(spec, themes, dirname(file));
  if (errors.length) { for (const m of errors) console.error(m); return 1; }
  const theme = resolveTheme(themes[spec.theme], spec, templates);
  const durs = sceneDurations(spec, theme);
  durs.forEach((d, i) => console.log(`${i + 1}  ${spec.scenes[i].type}  ${d.toFixed(2)}`));
  console.log(`total  ${totalDuration(durs).toFixed(2)}`);
  const findings = lint(spec, theme, durs);
  for (const f of findings) console.log(`${f.level.toUpperCase()}  ${f.code} ${f.scene}: ${f.message} → ${f.fix}`);
  if (findings.some((f) => f.level === "error")) return 1;
  if (strict && findings.length) return 2;
  if (spec.audio) printAudioPlan(spec, dirname(file), totalDuration(durs), sceneStartsOf(durs), spec.scenes.length);
  return 0;
}

const SFX_EXTS = [".wav", ".m4a", ".mp3", ".ogg"];
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const AUDIO_EXT = /\.(wav|m4a|mp3|ogg)$/i;

const sfxDir = () => new URL("../assets/sfx/", import.meta.url).pathname;

// name resolves to assets/sfx/<name>.<ext>, assets/sfx/beds/<name>.<ext>, else spec-relative path
export function resolveSfxFile(name, specDir) {
  if (typeof name !== "string" || name.trim() === "") return undefined;
  if (name.includes("/")) return resolve(specDir, name);
  const dir = sfxDir();
  for (const base of [join(dir, name), join(dir, "beds", name)])
    for (const ext of SFX_EXTS) if (existsSync(base + ext)) return base + ext;
  return resolve(specDir, name);
}

const sfxGainOk = (g) => g === undefined || (Number.isFinite(g) && g >= -40 && g <= 0);

// pure: [{file, at, gain, label}] with absolute times; throws Error on bad input
export function planSfx(audio, specDir, totalSeconds, sceneStarts) {
  return (audio.sfx || []).map((s, i) => {
    const label = `audio.sfx[${i}]`;
    const at = s.scene !== undefined ? sceneStarts[s.scene - 1] : s.at;
    if (at === undefined || !Number.isFinite(at)) throw new Error(`${label}: needs a finite "at" or a "scene"`);
    const file = resolveSfxFile(s.name, specDir);
    if (file === undefined || !AUDIO_EXT.test(file) || !existsSync(file)) throw new Error(`${label}: cannot find "${s.name}" (looked in assets/sfx and assets/sfx/beds as .wav/.m4a/.mp3/.ogg, and next to the spec)`);
    return { file, at, gain: s.gain === undefined ? -6 : s.gain, label, name: s.name };
  });
}

// input 0 is the silent video (added by muxAudio), audio inputs start at 1
export function audioArgs(spec, specDir, totalSeconds, sceneStarts) {
  const audio = spec?.audio;
  if (!audio) return undefined;
  const bed = audio.bed !== undefined ? resolveSfxFile(audio.bed, specDir) : undefined;
  if (audio.bed !== undefined && (bed === undefined || !AUDIO_EXT.test(bed) || !existsSync(bed)))
    throw new Error(`audio.bed: cannot find "${audio.bed}" (looked in assets/sfx/beds as .wav/.m4a/.mp3/.ogg, and next to the spec)`);
  const sfx = planSfx(audio, specDir, totalSeconds, sceneStarts);
  const inputArgs = [], parts = [];
  if (bed) inputArgs.push("-stream_loop", "-1", "-t", String(totalSeconds), "-i", bed);
  for (const s of sfx) inputArgs.push("-i", s.file);
  if (bed) {
    parts.push(`[1:a]volume=${audio.bedGain === undefined ? -20 : audio.bedGain}dB,afade=t=in:st=0:d=0.3,afade=t=out:st=${Math.max(0, totalSeconds - 0.8).toFixed(3)}:d=0.8[bed]`);
    parts.push(`[bed]${sfx.length ? "apad" : "anull"}[b0]`);
  }
  sfx.forEach((s, i) => parts.push(`[${(bed ? 2 : 1) + i}:a]volume=${s.gain}dB,adelay=${Math.round(s.at * 1000)}:all=1[s${i}]`));
  const labels = [(bed ? "[b0]" : ""), ...sfx.map((_, i) => `[s${i}]`)].filter(Boolean);
  parts.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=11[aout]`);
  return { inputArgs, filter: parts.join(";") };
}

export function probeDuration(file) {
  const r = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  const d = r.status === 0 ? Number((r.stdout || "").trim()) : NaN;
  return Number.isFinite(d) && d > 0 ? d : undefined;
}

// mutates the silent MP4 in place (tmp + rename). Returns true on success.
export function muxAudio(out, spec, specDir, totalSeconds, sceneStarts) {
  const plan = audioArgs(spec, specDir, totalSeconds, sceneStarts);
  if (plan === undefined) return false;
  const tmp = out.replace(/\.mp4$/, "") + ".tmp.mp4";
  const args = ["-y", "-i", out, ...plan.inputArgs, "-filter_complex", plan.filter,
    "-map", "0:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", tmp];
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) {
    rmSync(tmp, { force: true });
    throw new Error(`audio mux failed: ${((r.stderr || "").split(/\r?\n/).filter(Boolean).at(-1)) || r.error?.message || "ffmpeg failed to start"}`);
  }
  renameSync(tmp, out);
  return true;
}

function sceneStartsOf(durs) {
  const starts = []; let at = 0;
  for (const d of durs) { starts.push(at); at += d; }
  return starts;
}

function printAudioPlan(spec, specDir, total, sceneStarts, sceneCount) {
  const audio = spec.audio;
  if (audio.bed !== undefined) {
    const bed = resolveSfxFile(audio.bed, specDir);
    const dur = bed ? probeDuration(bed) : undefined;
    console.log(`audio  bed ${audio.bed}${dur ? `  ${dur.toFixed(2)}s` : ""}`);
  }
  for (const s of planSfx(audio, specDir, total, sceneStarts)) console.log(`audio  sfx ${s.name}  ${s.at.toFixed(2)}s`);
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
    console.log(`engine  effectcraft-cli render --project ${project} --comp Main --out ${out} --format h264`);
    const built = spawnSync("effectcraft-cli", ["render", "--project", project, "--comp", "Main", "--out", out, "--format", "h264"], { encoding: "utf8" });
    if (built.status !== 0) {
      const lines = (built.stderr || "").split(/\r?\n/).filter((line) => line.trim());
      console.error(lines.at(-1) || (built.stdout || "").trim() || built.error?.message || "effectcraft-cli failed to start");
      return 1;
    }
    const total = totalDuration(res.durs);
    console.log(`total  ${total.toFixed(2)}`);
    if (spec.audio) {
      let at = 0; const starts = res.durs.map((d) => { const s = at; at += d; return s; });
      try { muxAudio(out, spec, dirname(file), total, starts); }
      catch (err) { console.error(err.message); return 1; }
      console.log(`audio: muxed ${spec.audio.sfx?.length || 0} sfx + bed`);
    } else console.log("audio: none");
    console.log(out);
    return 0;
  } finally {
    release();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  }
}

let FONT_LIST;
function engineFonts() {
  if (FONT_LIST !== undefined) return FONT_LIST;
  const r = spawnSync("effectcraft-cli", ["exec", "text.fonts", "--json"], { encoding: "utf8" });
  if (r.status !== 0) return (FONT_LIST = null);
  try { FONT_LIST = JSON.parse(r.stdout); } catch { FONT_LIST = null; }
  return FONT_LIST;
}
function checkFonts(theme) {
  const list = engineFonts();
  if (!list) return;
  const manifest = JSON.parse(readFileSync(new URL("../assets/fonts/fonts.json", import.meta.url), "utf8"));
  const have = new Set();
  for (const f of list.families) for (const s of f.styles) have.add(`${f.family}|${s}`);
  const missing = [];
  for (const [k, ps] of Object.entries(theme.fonts)) {
    const m = manifest[ps];
    if (!m) { missing.push(`${k}=${ps} (not bundled)`); continue; }
    const fam = m.family.split(",")[0].trim(), style = m.style.split(",")[0].trim();
    if (!have.has(`${fam}|${style}`)) missing.push(`${k}=${ps} (${fam} ${style})`);
  }
  if (missing.length) throw new Error(`fonts not installed: ${missing.join(", ")} — run: node bin/ecm.mjs fonts --install`);
}

function preview(file) {
  rmSync(paths(file).sheet, {force:true});
  const spec = readSpec(file);
  if (spec === undefined) return {code:1};
  const themes = loadThemes(), templates = loadTemplates(), errors = validateSpec(spec, themes, dirname(file));
  if (errors.length) { for (const m of errors) console.error(m); return {code:1}; }
  const theme = resolveTheme(themes[spec.theme], spec, templates), durs = sceneDurations(spec, theme);
  try { checkFonts(theme); } catch (err) { console.error(err.message); return {code:1}; }
  const { project, sheet } = paths(file);
  const base = basename(file, extname(file));
  const tmp = join(mkdtempSync(join(tmpdir(), 'ecm-')), base + '.build.jsx');
  try {
    writeFileSync(tmp, buildScript(spec, theme, durs));
    console.log(`engine  effectcraft-cli script ${tmp} --empty --save-as ${project}`);
    const built = spawnSync('effectcraft-cli', ['script', tmp, '--empty', '--save-as', project], {encoding:'utf8'});
    if (built.status !== 0) { const lines = (built.stderr || built.stdout || '').split(/\r?\n/).filter((x) => /:\d+:\d+: /.test(x)); const msg = lines.length ? lines[lines.length - 1].replace(/^.*?:\d+:\d+: /, '') : ((built.stderr || built.stdout || '').trim() || built.error?.message || 'effectcraft-cli failed to start'); console.error(msg); return {code:1}; }
    const line = `${built.stdout || ''}
${built.stderr || ''}`.split(/\r?\n/).find((x) => x.startsWith('ECM '));
    if (!line) { console.error('missing ECM output'); return {code:1}; }
    const meta = JSON.parse(line.slice(4)), starts = [], frames = [], t = meta.settle, ds = meta.durs; let at = 0;
    for (let i = 0; i < ds.length; i++) { starts.push(at); frames.push(join(dirname(tmp), `${i + 1}_${spec.scenes[i].type}.png`)); at += ds[i]; }
    for (let i = 0; i < frames.length; i++) {
      const ov = TRANSITION_LEN[spec.scenes[i].transition || spec.transition || 'cut'] || 0;
      const pre = Math.max(ov + 0.05, Math.min(t[i] + 0.25, ds[i] - ov - 0.1));
      const time = starts[i] - ov + Math.max(0.05, pre), r = spawnSync('effectcraft-cli', ['render-frame', '--project', project, '--comp', 'Main', '--time', String(time), '--max-side', '480', '--out', frames[i]], {encoding:'utf8'});
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
  if (cmd === "check" && arg) process.exitCode = check(arg, process.argv.includes("--strict"));
  else if (cmd === "preview" && arg) process.exitCode = preview(arg).code;
  else if (cmd === "render" && arg) process.exitCode = render(arg);
  else if (cmd === "themes") process.exitCode = themes();
  else if (cmd === "fonts") process.exitCode = fonts();
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

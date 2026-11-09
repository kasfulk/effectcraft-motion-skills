#!/usr/bin/env node
import { readFileSync } from "node:fs";
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

// Task 2 replaces this with the real MAIN JSX block.
const MAIN = "// MAIN (Task 2)\n";

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "check" && arg) process.exitCode = check(arg);
  else { console.error("usage: ecm.mjs check <spec>"); process.exitCode = 1; }
}

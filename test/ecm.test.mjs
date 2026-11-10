import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadThemes, loadTemplates, validate, validateDeck, validateSpec, durationOf, buildScript, buildSlidesScript, resolveTheme, audioArgs, resolveSfxFile, muxAudio, FX_NAMES, SLIDE_SIZES } from "../bin/ecm.mjs";

const T = loadThemes(); const reel = T.reel, tenang = T.tenang;
test("themes: ids and structure", () => {
  for (const id of ["edukasi","infopop","kinetik","pitch","reel","tenang"]) assert.ok(Object.hasOwn(T, id), `theme ${id} missing`);
  const HEX = /^#[0-9a-f]{6}$/i;
  const MOTIFS = ["slab","square","lineLabel","thin","highlighter","outline","hardShadow","softShadow","glow","underline","sheet","tag"];
  for (const [id, t] of Object.entries(T)) {
    assert.equal(typeof t.label, "string", `${id}.label`);
    assert.ok(["left","center"].includes(t.align), `${id}.align`);
    assert.equal(typeof t.easing, "string", `${id}.easing`);
    assert.equal(typeof t.durationScale, "number", `${id}.durationScale`);
    for (const k of ["base","ink","accent","muted","data"]) assert.match(t.colors[k], HEX, `${id}.colors.${k}`);
    for (const k of ["display","body","label"]) assert.ok(typeof t.fonts[k] === "string" && t.fonts[k], `${id}.fonts.${k}`);
    assert.ok(Array.isArray(t.motifs), `${id}.motifs`);
    for (const m of t.motifs) assert.ok(MOTIFS.includes(m), `${id}.motifs: ${m} not supported`);
    for (const c of Object.values(t.colors)) assert.match(c, HEX, `${id} colour`);
    for (const [k, f] of Object.entries(t.fonts)) assert.ok(typeof f === "string" && f, `${id}.fonts.${k}`);
    if (t.fx) assert.ok(Array.isArray(t.fx) && t.fx.every((n) => FX_NAMES.includes(n)), `${id}.fx`);
  }
});

test("duration: words", () => assert.equal(durationOf({type:"hook", text:"Gaji naik, tabungan tetap?"}, reel), 80/30));
test("duration: tenang scale", () => assert.equal(durationOf({type:"hook", text:"Gaji naik, tabungan tetap?"}, tenang), 96/30));
test("duration: items", () => assert.equal(durationOf({type:"steps", title:"Mulai dari sini", items:["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]}, reel), 147/30));
test("duration: clamp low/high/override", () => {
  assert.equal(durationOf({type:"hook", text:"Halo"}, reel), 2.5);
  assert.equal(durationOf({type:"quote", text:"kata ".repeat(40)}, reel), 7);
  assert.equal(durationOf({type:"hook", text:"Halo", duration:4}, tenang), 4);
});
const v = (scenes, theme = "reel") => validate({theme, scenes}, T);
test("valid example", () => assert.deepEqual(v([{type:"hook", text:"Hai", emphasis:"hai"}]), []));
test("errors", () => {
  assert.deepEqual(validate({theme:"nope", scenes:[]}, T), [`theme: unknown "nope" (${Object.keys(T).join(", ")})`, "scenes: must be a non-empty array"]);
  assert.deepEqual(v([{type:"chart"}]), ["scene 1 (chart): type unknown"]);
  assert.deepEqual(v([{type:"hook"}]), ["scene 1 (hook): text required"]);
  assert.deepEqual(v([{type:"donut", value:120}]), ["scene 1 (donut): value must be 0–100"]);
  assert.deepEqual(v([{type:"stat", value:1e15}]), ["scene 1 (stat): value must be below 1e15"]);
  assert.deepEqual(v([{type:"stat", value:1, label:5}]), ["scene 1 (stat): label must be a string"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:1e15},{label:"b",value:2}]}]), ["scene 1 (bars): values must be below 1e15"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:0},{label:"b",value:0}]}]), ["scene 1 (bars): items need at least one value > 0"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:1},{label:"b",value:2}], highlight:2}]), ["scene 1 (bars): highlight must be 0–1"]);
  assert.deepEqual(v([{type:"hook", text:"Gaji naik", emphasis:"turun"}]), ["scene 1 (hook): emphasis \"turun\" not found in text"]);
  assert.deepEqual(v([{type:"kinetic", lines:["Gaji naik","tabungan tetap"], emphasis:"naik tabungan"}]), ["scene 1 (kinetic): emphasis \"naik tabungan\" not found in any line"]);
  assert.deepEqual(v([{type:"hook", text:"Hai", bg:"red"}]), ["scene 1 (hook): bg must be base|ink|accent"]);
  assert.deepEqual(validate({theme:"reel", out:"clip.mov", scenes:[{type:"hook", text:"Hai"}]}, T), ["out: must be a .mp4 path"]);
});
test("fx: names validated at spec and scene level", () => {
  const err = "fx must be an array of: grid, liquid, paper, grain, vignette, glow, rgbIn, blurIn, sweep, float, glitch";
  assert.deepEqual(validate({theme:"reel", fx:["grain"], scenes:[{type:"hook", text:"Hai", fx:["glow","sweep"]}]}, T), []);
  assert.deepEqual(validate({theme:"reel", fx:["nope"], scenes:[{type:"hook", text:"Hai", fx:"glow"}]}, T), [err, `scene 1 (hook): ${err}`]);
  assert.ok(buildScript({theme:"reel", scenes:[{type:"hook", text:"a"}]}, reel, [3]).includes("var FX = {"));
});
test("resolveTheme merges spec overrides", () => {
  const r = resolveTheme(reel, { colors: { accent: "#000000" }, fonts: { body: "Inter-Regular" } });
  assert.equal(r.colors.accent, "#000000");
  assert.equal(r.colors.base, reel.colors.base);
  assert.equal(r.fonts.body, "Inter-Regular");
  assert.equal(r.fonts.display, reel.fonts.display);
  assert.deepEqual(resolveTheme(reel, {}), { ...reel, colors: { ...reel.colors }, fonts: { ...reel.fonts } });
});
test("validate: theme colors/fonts overrides", () => {
  assert.deepEqual(validate({theme:"reel", colors:{base:"#112233"}, fonts:{body:"Inter-Regular"}, scenes:[{type:"hook", text:"Hai"}]}, T), []);
  assert.deepEqual(validate({theme:"reel", colors:{nope:"#112233"}, scenes:[]}, T).filter((m) => m.startsWith("colors")), ['colors: unknown key "nope"']);
  assert.deepEqual(validate({theme:"reel", colors:{base:"112233"}, scenes:[]}, T).filter((m) => m.startsWith("colors")), ["colors.base: must be #rrggbb"]);
  assert.deepEqual(validate({theme:"reel", fonts:{h1:"X"}, scenes:[]}, T).filter((m) => m.startsWith("fonts")), ['fonts: unknown key "h1"']);
  assert.deepEqual(validate({theme:"reel", fonts:{body:""}, scenes:[]}, T).filter((m) => m.startsWith("fonts")), ["fonts.body: must be a non-empty string"]);
});
test("new: default spec validates, unknown theme exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "ecm-"));
  const bin = new URL("../bin/ecm.mjs", import.meta.url).pathname;
  try {
    const bad = spawnSync(process.execPath, [bin, "new", "nope"], {encoding:"utf8"});
    assert.equal(bad.status, 1);
    assert.ok(bad.stderr.includes('theme: unknown "nope" (see reference/themes.md)'), bad.stderr);
    const ok = spawnSync(process.execPath, [bin, "new", "reel"], {cwd: dir, encoding:"utf8"});
    assert.equal(ok.status, 0, ok.stderr);
    const out = join(dir, "reel.json");
    assert.ok(existsSync(out), ok.stdout);
    const spec = JSON.parse(readFileSync(out, "utf8"));
    assert.deepEqual(validate(spec, T), []);
    assert.equal(spec.theme, "reel");
    assert.equal(spec.out, "reel.mp4");
    assert.deepEqual(spec.scenes.map((s) => s.type), ["hook", "stat", "outro"]);
    const custom = join(dir, "sub", "x.json");
    const ok2 = spawnSync(process.execPath, [bin, "new", "pitch", custom], {cwd: dir, encoding:"utf8"});
    assert.equal(ok2.status, 0, ok2.stderr);
    assert.ok(existsSync(custom));
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
test("script embeds hostile text safely", () => {
  const text = 'a "q" \\ b\n</script>\u2028\u2029end';
  const src = buildScript({theme:"reel", scenes:[{type:"hook", text}]}, reel, [3]);
  const line = src.split("\n")[0];                         // var SPEC = {...};
  assert.ok(!src.includes("\u2028") && !src.includes("\u2029"));
  assert.equal(new Function(line + " return SPEC;")().scenes[0].text, text);
});
test("CLI runs through a symlinked install", () => {
  const dir = mkdtempSync(join(tmpdir(), "ecm-"));
  try {
    symlinkSync(new URL("..", import.meta.url).pathname, join(dir, "link"));
    const spec = join(dir, "bad.json");
    writeFileSync(spec, JSON.stringify({theme:"reel", scenes:[{type:"donut", value:120}]}));
    const r = spawnSync(process.execPath, [join(dir, "link/bin/ecm.mjs"), "check", spec], {encoding:"utf8"});
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("scene 1 (donut): value must be 0–100"), r.stderr);
  } finally { rmSync(dir, {recursive:true, force:true}); }
});

const TPL = loadTemplates();

test("themes: plain output has 9 tab-separated columns per theme", () => {
  const bin = new URL("../bin/ecm.mjs", import.meta.url).pathname;
  const r = spawnSync(process.execPath, [bin, "themes"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split("\n");
  assert.equal(lines.length, Object.keys(T).length, "one line per theme");
  for (const l of lines) assert.equal(l.split("\t").length, 9, `9 columns: ${l}`);
  assert.deepEqual(lines, lines.slice().sort(), "sorted by id");
});

test("themes: --json round-trips to loadThemes()", () => {
  const bin = new URL("../bin/ecm.mjs", import.meta.url).pathname;
  const r = spawnSync(process.execPath, [bin, "themes", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), T);
});

test("template: valid name validates clean, unknown errors", () => {
  assert.deepEqual(validate({ theme: "reel", template: "themed", scenes: [{ type: "hook", text: "Hai" }] }, T), []);
  assert.deepEqual(validate({ theme: "reel", template: "nope", scenes: [] }, T)
    .filter((m) => m.startsWith("template")), ['template: unknown "nope" (see templates.json)']);
});

test("template: colours reach the theme, spec colours still win", () => {
  const tpl = TPL.themed;
  const r = resolveTheme(T["editorial-spread"], { template: "themed" }, TPL);
  assert.equal(r.colors.base, tpl.bg);
  assert.equal(r.colors.ink, tpl.ink);
  assert.equal(r.colors.accent, tpl.accent);
  assert.equal(r.fonts.display, tpl.font_head);
  assert.equal(r.fonts.body, tpl.font_body);
  assert.equal(r.fonts.label, tpl.font_body);
  const r2 = resolveTheme(T["editorial-spread"], { template: "themed", colors: { base: "#123456" } }, TPL);
  assert.equal(r2.colors.base, "#123456");
  assert.equal(r2.colors.ink, tpl.ink);
});

test("template: missing theme still errors", () => {
  assert.deepEqual(validate({ template: "themed", scenes: [] }, T).filter((m) => m.startsWith("theme")),
    [`theme: unknown undefined (${Object.keys(T).join(", ")})`]);
});

test("theme-level fx validation", () => {
  const badThemes = { reel: { ...reel, fx: ["nope"] } };
  assert.deepEqual(validate({ theme: "reel", scenes: [] }, badThemes).filter((m) => m.includes("fx must")),
    [`theme "reel": fx must be an array of: ${FX_NAMES.join(", ")}`]);
});

test("deck validation errors", () => {
  assert.deepEqual(validateDeck({ theme: "reel", slides: [{ text: "Hai" }] }, TPL)
    .filter((m) => m.startsWith("template")), ['template: unknown undefined (see templates.json)']);
  assert.deepEqual(validateDeck({ template: "nope", slides: [{ text: "Hai" }] }, TPL)
    .filter((m) => m.startsWith("template")), ['template: unknown "nope" (see templates.json)']);
  assert.deepEqual(validateDeck({ template: "themed", slides: [] }, TPL)
    .filter((m) => m.startsWith("slides")), ["slides: must be a non-empty array (1–30)"]);
  assert.deepEqual(validateDeck({ template: "themed", slides: [{ lead: "x" }] }, TPL),
    ["slide 1: text required"]);
  assert.deepEqual(validateDeck({ template: "themed", slides: [{ text: "Halo dunia", emphasis: "dunia" }] }, TPL), []);
  assert.deepEqual(validateDeck({ template: "themed", slides: [{ text: "Halo dunia", emphasis: "xyz" }] }, TPL),
    ["slide 1: emphasis not found in text"]);
  assert.deepEqual(validateDeck({ template: "themed", slides: [{ text: "Halo", emphasis: "" }] }, TPL),
    ["slide 1: emphasis must be a non-empty string"]);
  const badTpl = { ...TPL, plain: { ...TPL.plain, size: "9:16", drawing: "sometimes" } };
  assert.deepEqual(validateDeck({ template: "plain", slides: [{ text: "Halo" }] }, badTpl),
    ['template "plain": size must be one of 3:4, 4:5, 1:1', 'template "plain": drawing must be cover, every, some, or empty']);
});

test("SLIDE_SIZES mapping", () => {
  assert.deepEqual(SLIDE_SIZES["3:4"], [1080, 1440]);
  assert.deepEqual(SLIDE_SIZES["4:5"], [1080, 1350]);
  assert.deepEqual(SLIDE_SIZES["1:1"], [1080, 1080]);
});

test("buildSlidesScript injects SPEC, TPL, THEME, SIZE and SLIDES.draw", () => {
  const deck = { template: "themed", theme: "editorial-spread", slides: [{ text: "Hai" }] };
  const src = buildSlidesScript(deck, TPL.themed, T["editorial-spread"], SLIDE_SIZES["3:4"]);
  assert.ok(src.includes("var SPEC ="), "SPEC injected");
  assert.ok(src.includes("var TPL ="), "TPL injected");
  assert.ok(src.includes("var THEME ="), "THEME injected");
  assert.ok(src.includes("var SIZE ="), "SIZE injected");
  assert.ok(src.includes("SLIDES.draw"), "SLIDES.draw called");
  assert.ok(src.includes("addComp('Main'"), "Main comp built");
});

// --- audio ---
const SPEC_DIR = new URL("..", import.meta.url).pathname;
const SFX_DIR = join(SPEC_DIR, "assets", "sfx");
const aSpec = (audio) => ({ theme: "reel", scenes: [{ type: "hook", text: "Hai" }, { type: "outro", text: "Bye" }], audio });
const STARTS = [0, 3];

test("resolveSfxFile finds sfx and bed names", () => {
  assert.equal(resolveSfxFile("keypress-001", "/tmp"), join(SFX_DIR, "keypress-001.wav"));
  assert.equal(resolveSfxFile("thunder-1", "/tmp"), join(SFX_DIR, "thunder-1.m4a"));
  assert.equal(resolveSfxFile("rain", "/tmp"), join(SFX_DIR, "beds", "rain.m4a"));
  assert.equal(resolveSfxFile("nope-xyz", "/tmp"), "/tmp/nope-xyz");
});

test("audioArgs: bed only", () => {
  const r = audioArgs(aSpec({ bed: "rain" }), SPEC_DIR, 6, STARTS);
  assert.deepEqual(r.inputArgs, ["-stream_loop", "-1", "-t", "6", "-i", join(SFX_DIR, "beds", "rain.m4a")]);
  assert.ok(r.filter.includes("volume=-20dB"), r.filter);
  assert.ok(r.filter.includes("afade=t=in:st=0:d=0.3"), r.filter);
  assert.ok(r.filter.includes("afade=t=out:st=5.200:d=0.8"), r.filter);
  assert.ok(r.filter.includes("amix=inputs=1:normalize=0"), r.filter);
  assert.ok(r.filter.includes("loudnorm=I=-18:TP=-1.5:LRA=11"), r.filter);
});

test("audioArgs: sfx only", () => {
  const r = audioArgs(aSpec({ sfx: [{ at: 3.2, name: "keypress-001", gain: -8 }, { scene: 2, name: "thunder-1" }] }), SPEC_DIR, 6, STARTS);
  assert.deepEqual(r.inputArgs, ["-i", join(SFX_DIR, "keypress-001.wav"), "-i", join(SFX_DIR, "thunder-1.m4a")]);
  assert.ok(r.filter.includes("[1:a]volume=-8dB,adelay=3200:all=1[s0]"), r.filter);
  assert.ok(r.filter.includes("[2:a]volume=-6dB,adelay=3000:all=1[s1]"), r.filter); // default gain -6, scene 2 -> 3s
  assert.ok(r.filter.includes("amix=inputs=2:normalize=0"), r.filter);
});

test("audioArgs: bed + sfx input indices shift", () => {
  const r = audioArgs(aSpec({ bed: "ocean", sfx: [{ at: 1, name: "bong_001" }] }), SPEC_DIR, 6, STARTS);
  assert.equal(r.inputArgs[7], join(SFX_DIR, "bong_001.ogg"));
  assert.ok(r.filter.includes("[2:a]volume=-6dB,adelay=1000:all=1[s0]"), r.filter);
  assert.ok(r.filter.includes("[b0][s0]amix=inputs=2:normalize=0"), r.filter);
});

test("audioArgs: no audio block", () => assert.equal(audioArgs({ theme: "reel", scenes: [] }, SPEC_DIR, 6, STARTS), undefined));

test("validateSpec: valid audio passes", () => {
  assert.deepEqual(validateSpec(aSpec({ bed: "rain", sfx: [{ at: 1, name: "keypress-001" }, { scene: 2, name: "thunder-1" }] }), T, SPEC_DIR), []);
  assert.deepEqual(validateSpec(aSpec({ sfx: [] }), T, SPEC_DIR), ["audio: needs a bed or at least one sfx"]);
  assert.deepEqual(validateSpec(aSpec({}), T, SPEC_DIR), ["audio: needs a bed or at least one sfx"]);
});

test("validateSpec: audio errors", () => {
  const spec = (audio) => aSpec(audio);
  const total = durationOf({ type: "hook", text: "Hai" }, T.reel) + durationOf({ type: "outro", text: "Bye" }, T.reel);
  assert.deepEqual(validateSpec({ ...spec({}), theme: "reel", scenes: [{ type: "hook", text: "Hai" }], audio: {} }, T, SPEC_DIR), ["audio: needs a bed or at least one sfx"]);
  assert.ok(validateSpec(spec({ bed: "rain", bedGain: 5 }), T, SPEC_DIR).includes("audio.bedGain: must be -40–0 dB"));
  assert.ok(validateSpec(spec({ bed: 5 }), T, SPEC_DIR).includes("audio.bed: must be a non-empty string"));
  assert.ok(validateSpec(spec({ bed: "nope-lake" }), T, SPEC_DIR)[0].startsWith("audio.bed: cannot find"), validateSpec(spec({ bed: "nope-lake" }), T, SPEC_DIR)[0]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 1, name: "nope" }] }), T, SPEC_DIR), ["audio.sfx[0]: cannot find \"nope\" (looked in assets/sfx and assets/sfx/beds as .wav/.m4a/.mp3/.ogg, and next to the spec)"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 1 }] }), T, SPEC_DIR), ["audio.sfx[0]: name required"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ name: "keypress-001" }] }), T, SPEC_DIR), ["audio.sfx[0]: needs \"at\" or \"scene\""]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 1, scene: 1, name: "keypress-001" }] }), T, SPEC_DIR), ["audio.sfx[0]: use either \"at\" or \"scene\", not both"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: -1, name: "keypress-001" }] }), T, SPEC_DIR), ["audio.sfx[0]: at must be a number ≥ 0"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 99, name: "keypress-001" }] }), T, SPEC_DIR), [`audio.sfx[0]: at 99s is past the end (${total.toFixed(2)}s)`]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ scene: 3, name: "keypress-001" }] }), T, SPEC_DIR), ["audio.sfx[0]: scene must be 1–2"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ scene: 1, name: "keypress-001" }] }), T, SPEC_DIR), []);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 1, name: "keypress-001", gain: -41 }] }), T, SPEC_DIR), ["audio.sfx[0]: gain must be -40–0 dB"]);
  assert.deepEqual(validateSpec(spec({ sfx: [{ at: 1, name: "keypress-001" }, { at: 1.2, name: "thunder-1" }] }), T, SPEC_DIR),
    ["audio.sfx[1] overlaps audio.sfx[0] (0.5 s minimum)"]);
  const dense = Array.from({ length: 5 }, (_, i) => ({ at: i * 2.6, name: "thunder-1" }));
  assert.ok(validateSpec(spec({ sfx: dense }), T, SPEC_DIR).includes(`audio.sfx: too dense (5 sfx in ${total.toFixed(2)}s; one per 2.5 s minimum)`));
  const thirteen = Array.from({ length: 13 }, (_, i) => ({ at: i * 3, name: "thunder-1" }));
  assert.ok(validateSpec(spec({ sfx: thirteen }), T, SPEC_DIR).includes("audio.sfx: at most 12 entries"));
});

test("audio: real ffmpeg mux on a generated black video", { skip: !existsSync("/opt/homebrew/bin/ffmpeg") }, () => {
  const dir = mkdtempSync(join(tmpdir(), "ecm-"));
  try {
    const mp4 = join(dir, "black.mp4");
    const gen = spawnSync("/opt/homebrew/bin/ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30", "-t", "3", "-pix_fmt", "yuv420p", "-c:v", "libx264", mp4], { encoding: "utf8" });
    assert.equal(gen.status, 0, gen.stderr?.slice(-500));
    const spec = aSpec({ bed: "rain", bedGain: -18, sfx: [{ at: 1.2, name: "keypress-001", gain: -10 }, { scene: 2, name: "thunder-1" }] });
  assert.ok(muxAudio(mp4, spec, SPEC_DIR, 3, STARTS));
    const codec = spawnSync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", mp4], { encoding: "utf8" });
    assert.equal(codec.stdout.trim(), "aac", codec.stderr);
    const dur = spawnSync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", mp4], { encoding: "utf8" });
    assert.ok(Math.abs(Number(dur.stdout) - 3) <= 0.1, dur.stdout);
    assert.ok(!existsSync(mp4.replace(/\.mp4$/, ".tmp.mp4")), "tmp file cleaned up");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

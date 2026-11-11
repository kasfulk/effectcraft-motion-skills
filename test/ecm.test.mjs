import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadThemes, loadTemplates, validate, validateDeck, validateSpec, durationOf, buildScript, buildSlidesScript, resolveTheme, lint, audioArgs, resolveSfxFile, muxAudio, FX_NAMES, SLIDE_SIZES, TRANSITIONS } from "../bin/ecm.mjs";

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

test("transitions: valid values, default + override, first scene ignored", () => {
  assert.deepEqual(v([{type:"hook", text:"Hai", transition:"fade"}]), []);
  assert.deepEqual(validate({theme:"reel", transition:"wipe", scenes:[{type:"hook", text:"Hai", transition:"dip"}]}, T), []);
  // first-scene transition accepted but ignored; totals unchanged by any transition
  const scenes = [
    {type:"hook", text:"Hai"},
    {type:"stat", value:72, transition:"fade"},
    {type:"donut", value:40, transition:"slide"},
    {type:"outro", text:"Done", transition:"dip"},
  ];
  const durs = scenes.map((s) => durationOf(s, reel));
  assert.deepEqual(validate({theme:"reel", transition:"wipe", scenes}, T), []);
  assert.deepEqual(durs, scenes.map((s) => durationOf(s, reel)));
});

test("transitions: unknown values error at scene and spec level", () => {
  const list = `(${TRANSITIONS.join("|")})`;
  assert.deepEqual(v([{type:"hook", text:"Hai", transition:"bogus"}]),
    [`scene 1 (hook): transition: unknown "bogus" ${list}`]);
  assert.deepEqual(v([{type:"hook", text:"Hai", transition:5}]),
    [`scene 1 (hook): transition: unknown 5 ${list}`]);
  assert.deepEqual(validate({theme:"reel", transition:"bogus", scenes:[{type:"hook", text:"Hai"}]}, T),
    [`transition: unknown "bogus" ${list}`]);
});

test("transitions: MAIN emits overlap and per-type JSX, totals untouched", () => {
  const durs = [2.5, 3.2, 3.2, 2.5];
  const scenes = [
    {type:"hook", text:"Hai"},
    {type:"stat", value:72, transition:"fade"},
    {type:"steps", items:["Satu","Dua"], transition:"wipe"},
    {type:"outro", text:"Done", transition:"dip"},
  ];
  const src = buildScript({theme:"reel", transition:"slide", scenes}, reel, durs);
  assert.ok(src.includes("TRLEN = {"), "transition lengths emitted");
  assert.ok(src.includes('"fade":0.35') && src.includes('"wipe":0.4') && src.includes('"slide":0.45') && src.includes('"dip":0.4'), "core lengths");
  assert.ok(src.includes("l.startTime = st - ov"), "incoming starts early");
  assert.ok(src.includes("addProperty('Linear Wipe')"), "wipe effect");
  assert.ok(src.includes("'Wipe Angle'"), "wipe angle param");
  assert.ok(src.includes("'dip-seed'"), "dip seed solid");
  assert.ok(src.includes("addSolid(rgb(THEME.colors.ink), 'dip'"), "MAIN dip solid");
  // comp is extended by the incoming overlap so the layer never outlives its precomp
  assert.ok(src.includes("1, dur + ov, 30)"), "comp extended by incoming overlap");
  // content lives to the comp end so the incoming layer crossfades over it
  assert.ok(src.includes("exitAll(c, dur + ov)"), "exitAll spans the comp");
  // motion blur: comp switch on, every layer switch on, Main too
  assert.ok(src.includes("c.motionBlur = true"), "scene comp motion blur on");
  assert.ok(src.includes("main.motionBlur = true"), "Main comp motion blur on");
  assert.ok(src.includes("c.layer(mb).motionBlur = true"), "scene layers motion blur on");
  assert.ok(src.includes("main.layer(mb2).motionBlur = true"), "Main layers motion blur on");
  // totals: durationOf ignores the transition field
  for (const s of scenes) assert.equal(durationOf({...s, transition:undefined}, reel), durationOf(s, reel));
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

// ---- craft lint ----
const L = (scenes, theme = T.reel, extra = {}) => {
  const spec = { theme: "reel", scenes, ...extra };
  return lint(spec, theme, spec.scenes.map((s) => durationOf(s, theme)))
    .map((f) => `${f.code} ${f.scene}: ${f.message} → ${f.fix}`);
};
const codes = (scenes, theme, extra) => [...new Set(L(scenes, theme, extra).map((l) => l.slice(0, 3)))];

test("C01: cold open and missing outro", () => {
  assert.ok(L([{type:"bars",items:[{label:"a",value:1},{label:"b",value:2}]},{type:"kinetic",lines:["x"]}]).some((l) => l.startsWith("C01 ") && l.includes("cold open")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"kinetic",lines:["x"]}]).some((l) => l.startsWith("C01 ") && l.includes("no outro/cta")));
  const ok = L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]);
  assert.ok(!ok.some((l) => l.startsWith("C01 ")), ok.join("; "));
});
test("C02: scene count and total duration", () => {
  assert.ok(codes([{type:"hook",text:"Hai",emphasis:"hai"}]).includes("C02"));
  assert.ok(L(Array.from({length:9}, (_,i) => ({type:"hook",text:"Hai"+i,emphasis:"hai"}))).some((l) => l.startsWith("C02 ") && l.includes("9 scenes")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"stat",value:1,label:"x",suffix:"%"},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]).some((l) => l.startsWith("C02 ") && l.includes("under 12")));
  assert.ok(L(Array.from({length:8}, (_,i) => ({type:"quote",text:"kata ".repeat(20), emphasis:"kata", duration: 8, bg: i%2?"ink":"base"}))).some((l) => l.startsWith("C02 ") && l.includes("over 60")));
  assert.equal(codes([{type:"hook",text:"Gaji naik, tabungan tetap?",emphasis:"tetap"},{type:"stat",value:72,suffix:"%",label:"pekerja belum punya dana darurat"},{type:"bars",title:"Tabungan",items:[{label:"Jan",value:40},{label:"Feb",value:72}],highlight:1},{type:"steps",title:"Mulai dari sini",items:["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]},{type:"outro",text:"Simpan video ini.",cta:"Follow untuk tips lain",emphasis:"simpan",bg:"accent"}]).includes("C02"), false);
});
test("C03: bars highlight", () => {
  const items = [{label:"Makanan",value:40},{label:"Transport",value:120}];
  assert.deepEqual(L([{type:"bars",items}]).filter((l) => l.startsWith("C03 ")), ['C03 scenes[0] (bars): no highlight → add "highlight": 1 (largest value is Transport)']);
  assert.equal(L([{type:"bars",items,highlight:1}]).filter((l) => l.startsWith("C03")).length, 0);
  assert.ok(L([{type:"bars",items,highlight:0}]).some((l) => l.startsWith("C03 ") && l.includes("points at the smallest value")));
});
test("C04: word counts", () => {
  assert.ok(L([{type:"hook",text:"satu dua tiga empat lima enam tujuh delapan sembilan sepuluh",emphasis:"satu"}]).some((l) => l.startsWith("C04 ") && l.includes("hook is 10 words")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu"},{type:"kinetic",lines:["satu dua tiga empat lima"]}]).some((l) => l.startsWith("C04 ") && l.includes("line 1")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu"},{type:"steps",items:["satu dua tiga empat lima enam tujuh delapan"]}]).some((l) => l.startsWith("C04 ") && l.includes("step 1")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu"},{type:"quote",text:"kata ".repeat(25),emphasis:"kata"}]).some((l) => l.startsWith("C04 ") && l.includes("quote is 25 words")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu"},{type:"compare",left:{title:"a",points:["satu dua tiga empat lima enam tujuh"]},right:{title:"b",points:["x"]}}]).some((l) => l.startsWith("C04 ") && l.includes("left point 1")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu"},{type:"outro",text:"Simpan.",cta:"satu dua tiga empat lima enam",emphasis:"simpan"}]).some((l) => l.startsWith("C04 ") && l.includes("cta is 6 words")));
  const ok = L([{type:"hook",text:"Gaji naik?",emphasis:"naik"},{type:"outro",text:"Simpan.",cta:"Follow kami",emphasis:"simpan"}]);
  assert.ok(!ok.some((l) => l.startsWith("C04 ")), ok.join("; "));
});
test("C05: emphasis", () => {
  assert.ok(L([{type:"hook",text:"Hai"},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]).some((l) => l.startsWith("C05 ") && l.includes("no emphasis word")));
  assert.ok(L([{type:"hook",text:"satu dua tiga",emphasis:"satu dua tiga empat"}]).some((l) => l.startsWith("C05 ") && l.includes("is 4 words")));
});
test("C06: rhythm", () => {
  assert.ok(L([{type:"stat",value:1,label:"x"},{type:"stat",value:2,label:"x"},{type:"stat",value:3,label:"x"}]).some((l) => l.startsWith("C06 ") && l.includes("three consecutive stat")));
  assert.equal(L([{type:"kinetic",lines:["a"]},{type:"kinetic",lines:["b"]},{type:"kinetic",lines:["c"]}]).filter((l) => l.startsWith("C06 ") && l.includes("consecutive")).length, 0);
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"stat",value:1,label:"x"},{type:"bars",items:[{label:"a",value:1},{label:"b",value:2}],highlight:1},{type:"stat",value:2,label:"x"},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]).some((l) => l.startsWith("C06 ") && l.includes("flat rhythm")));
});
test("C07: fx", () => {
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"}], T.reel, {fx:["grain","glow"]}).some((l) => l.startsWith("C07 spec:") && l.includes("2 spec-level fx presets")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai",fx:["glow","sweep"]}]).some((l) => l.startsWith("C07 scenes[0]") && l.includes("2 fx presets")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai",fx:["glitch"]}], T.tenang).some((l) => l.startsWith("C07 ") && l.includes("fights the calm theme")));
  assert.equal(L([{type:"hook",text:"Hai",emphasis:"hai",fx:["glitch"]}], T.reel).filter((l) => l.startsWith("C07")).length, 0);
});
test("C08: numbers", () => {
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"stat",value:150}]).some((l) => l.startsWith("C08 ") && l.includes("without label")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"stat",value:150,label:"x"}]).some((l) => l.startsWith("C08 ") && l.includes("reads like a percentage")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"bars",items:[{label:"a",value:500},{label:"b",value:200}],highlight:0}]).some((l) => l.startsWith("C08 ") && l.includes("over 100")));
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"donut",value:12.5}]).some((l) => l.startsWith("C08 ") && l.includes("has decimals")));
  assert.equal(L([{type:"hook",text:"Hai",emphasis:"hai"},{type:"stat",value:72,suffix:"%",label:"x"},{type:"donut",value:72}]).filter((l) => l.startsWith("C08")).length, 0);
});
test("C09: long hold", () => {
  assert.ok(L([{type:"hook",text:"Hai",emphasis:"hai",duration:6}]).some((l) => l.startsWith("C09 ") && l.includes("long hold")));
  assert.equal(L([{type:"hook",text:"Hai",emphasis:"hai",duration:4}]).filter((l) => l.startsWith("C09")).length, 0);
  assert.equal(L([{type:"stat",value:1,label:"x",duration:15}]).filter((l) => l.startsWith("C09")).length, 0, "non-text scenes exempt");
});
test("C10: data-only", () => {
  assert.ok(L([{type:"stat",value:1,label:"x",suffix:"%"},{type:"bars",items:[{label:"a",value:1},{label:"b",value:2}],highlight:0},{type:"donut",value:50},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]).some((l) => l.startsWith("C10 ") && l.includes("numbers without a line of meaning")));
  assert.equal(L([{type:"stat",value:1,label:"x",suffix:"%"},{type:"bars",items:[{label:"a",value:1},{label:"b",value:2}],highlight:0},{type:"kinetic",lines:["arti angka ini"]},{type:"outro",text:"Simpan.",cta:"Follow",emphasis:"simpan"}]).filter((l) => l.startsWith("C10")).length, 0);
});
test("lint: examples produce zero errors, lint-bad triggers many codes", () => {
  const bin = new URL("../bin/ecm.mjs", import.meta.url).pathname;
  for (const name of ["hemat.json", "all-scenes.json"]) {
    const file = new URL(`../examples/${name}`, import.meta.url).pathname;
    const r = spawnSync(process.execPath, [bin, "check", file], {encoding: "utf8"});
    assert.equal(r.status, 0, r.stderr);
    for (const line of r.stdout.split("\n")) assert.ok(!line.startsWith("ERROR"), line);
  }
  const bad = new URL("../examples/lint-bad.json", import.meta.url).pathname;
  const r = spawnSync(process.execPath, [bin, "check", bad], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
  const found = [...new Set(r.stdout.split("\n").filter((l) => l.startsWith("WARN")).map((l) => l.slice(6, 9)))];
  assert.ok(found.length >= 6, `expected >= 6 codes, got ${found.join(",")}`);
  for (const c of ["C01","C03","C04","C05","C06","C07","C08"]) assert.ok(found.includes(c), `${c} missing from ${found.join(",")}`);
});
test("check: --strict exits 2 on warnings, 0 when clean", () => {
  const bin = new URL("../bin/ecm.mjs", import.meta.url).pathname;
  const bad = new URL("../examples/lint-bad.json", import.meta.url).pathname;
  const r = spawnSync(process.execPath, [bin, "check", bad, "--strict"], {encoding: "utf8"});
  assert.equal(r.status, 2);
  assert.ok(r.stdout.includes("WARN  "), r.stdout);
  const cleanSpec = { theme: "reel", scenes: [
    {type:"hook", text:"Gaji naik, tabungan tetap?", emphasis:"tetap"},
    {type:"stat", value:72, suffix:"%", label:"pekerja belum punya dana darurat", bg:"ink"},
    {type:"bars", title:"Tabungan per bulan", items:[{label:"Jan",value:40},{label:"Feb",value:72}], highlight:1},
    {type:"steps", title:"Mulai dari sini", items:["Catat pengeluaran","Sisihkan 10%","Otomatiskan"]},
    {type:"outro", text:"Simpan video ini.", cta:"Follow untuk tips lain", emphasis:"simpan", bg:"accent"},
  ]};
  const dir = mkdtempSync(join(tmpdir(), "ecm-"));
  try {
    const clean = join(dir, "clean.json");
    writeFileSync(clean, JSON.stringify(cleanSpec));
    const r0 = spawnSync(process.execPath, [bin, "check", clean, "--strict"], {encoding: "utf8"});
    assert.equal(r0.status, 0, r0.stdout);
    assert.ok(!r0.stdout.includes("WARN"), r0.stdout);
  } finally { rmSync(dir, {recursive: true, force: true}); }
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

// ---- deck handle override ----
test("deck: handle override accepted, unknown fields rejected", () => {
  const templates = loadTemplates();
  assert.deepEqual(validateDeck({ template: "themed", handle: "@hidupteratur", slides: [{ text: "A" }] }, templates), []);
  assert.deepEqual(validateDeck({ template: "themed", handle: "", slides: [{ text: "A" }] }, templates), ["handle: must be a non-empty string"]);
  assert.ok(validateDeck({ template: "themed", bg: "#fff", slides: [{ text: "A" }] }, templates).some((m) => m.startsWith("bg: unknown deck field")), validateDeck({ template: "themed", bg: "#fff", slides: [{ text: "A" }] }, templates).join("; "));
  // existing decks without handle still validate
  assert.deepEqual(validateDeck({ template: "plain", slides: [{ text: "A" }] }, templates), []);
});

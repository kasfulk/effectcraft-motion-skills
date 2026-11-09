import { test } from "node:test";
import assert from "node:assert/strict";
import { loadThemes, validate, durationOf, buildScript } from "../bin/ecm.mjs";

const T = loadThemes(); const reel = T.reel, tenang = T.tenang;
test("themes: six ids", () => assert.deepEqual(Object.keys(T).sort(), ["edukasi","infopop","kinetik","pitch","reel","tenang"]));
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
  assert.deepEqual(validate({theme:"nope", scenes:[]}, T), ["theme: unknown \"nope\" (reel, pitch, infopop, kinetik, tenang, edukasi)", "scenes: must be a non-empty array"]);
  assert.deepEqual(v([{type:"chart"}]), ["scene 1 (chart): type unknown"]);
  assert.deepEqual(v([{type:"hook"}]), ["scene 1 (hook): text required"]);
  assert.deepEqual(v([{type:"donut", value:120}]), ["scene 1 (donut): value must be 0–100"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:0},{label:"b",value:0}]}]), ["scene 1 (bars): items need at least one value > 0"]);
  assert.deepEqual(v([{type:"bars", items:[{label:"a",value:1},{label:"b",value:2}], highlight:2}]), ["scene 1 (bars): highlight must be 0–1"]);
  assert.deepEqual(v([{type:"hook", text:"Gaji naik", emphasis:"turun"}]), ["scene 1 (hook): emphasis \"turun\" not found in text"]);
  assert.deepEqual(v([{type:"hook", text:"Hai", bg:"red"}]), ["scene 1 (hook): bg must be base|ink|accent"]);
});
test("script embeds hostile text safely", () => {
  const text = 'a "q" \\ b\n</script>\u2028end';
  const src = buildScript({theme:"reel", scenes:[{type:"hook", text}]}, reel, [3]);
  const line = src.split("\n")[0];                         // var SPEC = {...};
  assert.ok(!src.includes("\u2028"));
  assert.equal(new Function(line + " return SPEC;")().scenes[0].text, text);
});

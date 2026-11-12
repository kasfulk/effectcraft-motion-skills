import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIMITIVES, geometry, glbFor, hexToRgb } from "../lib/glb.mjs";

// A GLB the engine silently renders as an inverted crescent still parses fine, so these
// checks are structural only: container layout plus index/normal sanity. Visual proof
// lives in the smoke renders.

function readGlb(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  assert.equal(dv.getUint32(0, true), 0x46546c67, "magic is glTF");
  assert.equal(dv.getUint32(4, true), 2, "version 2");
  assert.equal(dv.getUint32(8, true), buf.length, "header length matches buffer");

  const chunks = [];
  let off = 12;
  while (off < buf.length) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    chunks.push({ type, len, data: buf.subarray(off + 8, off + 8 + len) });
    assert.equal(len % 4, 0, "chunk is 4-byte aligned");
    off += 8 + len;
  }
  assert.equal(chunks.length, 2, "JSON + BIN");
  assert.equal(chunks[0].type, 0x4e4f534a, "first chunk is JSON");
  assert.equal(chunks[1].type, 0x004e4942, "second chunk is BIN");

  const json = JSON.parse(new TextDecoder().decode(chunks[0].data));
  assert.equal(json.asset.version, "2.0");
  assert.equal(json.meshes.length, 1);
  assert.equal(json.buffers[0].byteLength, chunks[1].len);
  return { json, bin: chunks[1].data };
}

test("every primitive is a valid two-chunk GLB with sane geometry", () => {
  for (const kind of PRIMITIVES) {
    const { json, bin } = readGlb(glbFor(kind));

    const prim = json.meshes[0].primitives[0];
    for (const name of ["POSITION", "NORMAL"]) {
      const acc = json.accessors[prim.attributes[name]];
      assert.equal(acc.type, "VEC3", `${kind} ${name} is VEC3`);
      assert.ok(acc.count > 0, `${kind} ${name} has vertices`);
      assert.equal(acc.componentType, 5126, `${kind} ${name} is float32`);
    }
    assert.equal(json.accessors[prim.attributes.POSITION].count,
      json.accessors[prim.attributes.NORMAL].count, `${kind} normals match positions`);

    const idx = json.accessors[prim.indices];
    assert.notEqual(idx.componentType, 5121, `${kind} keeps uint16 indices (one primitive can exceed 65535)`);
    const vertexCount = json.accessors[prim.attributes.POSITION].count;
    assert.ok(vertexCount < 65536, `${kind} vertex count fits uint16`);

    // Every index must address a real vertex, and every triangle must have area.
    const view = json.bufferViews[idx.bufferView];
    const start = (view.byteOffset || 0) + (idx.byteOffset || 0);
    const indices = new Uint16Array(bin.buffer, bin.byteOffset + start, idx.count);
    assert.equal(indices.length % 3, 0, `${kind} indices form triangles`);
    for (const i of indices) assert.ok(i < vertexCount, `${kind} index ${i} < ${vertexCount}`);

    const posView = json.bufferViews[json.accessors[prim.attributes.POSITION].bufferView];
    const positions = new Float32Array(bin.buffer, bin.byteOffset + (posView.byteOffset || 0), vertexCount * 3);
    const normals = new Float32Array(bin.buffer, bin.byteOffset + (json.bufferViews[json.accessors[prim.attributes.NORMAL].bufferView].byteOffset || 0), vertexCount * 3);
    let degenerate = 0;
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3];
      const ab = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]];
      const ac = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      if (Math.hypot(...cross) < 1e-6) degenerate++;
    }
    assert.ok(degenerate / (indices.length / 3) < 0.02, `${kind} has ${degenerate} degenerate triangles`);

    // Normals must be unit length or the engine's lighting reads black.
    const bad = [];
    for (let v = 0; v < vertexCount * 3; v += 3) {
      const len = Math.hypot(normals[v], normals[v + 1], normals[v + 2]);
      if (Math.abs(len - 1) > 1e-3) bad.push(len);
    }
    assert.equal(bad.length, 0, `${kind} has ${bad.length} non-unit normals`);
  }
});

test("colour tint reaches the material", () => {
  const { json } = readGlb(glbFor("cube", { color: hexToRgb("#ff0000") }));
  const [r, g, b] = json.materials[0].pbrMetallicRoughness.baseColorFactor;
  assert.deepEqual([Math.round(r), Math.round(g), Math.round(b)], [1, 0, 0]);
});

test("unknown primitives are rejected instead of emitting an empty mesh", () => {
  assert.throws(() => geometry("dodecahedron"), /unknown/i);
});

// Every harness installs the skill as a symlink; the CLI used to exit 0 there without writing.
test("CLI writes the file when run through a symlinked install", () => {
  const dir = mkdtempSync(join(tmpdir(), "glb-link-"));
  try {
    symlinkSync(fileURLToPath(new URL("..", import.meta.url)), join(dir, "link"));
    const out = join(dir, "s.glb");
    const r = spawnSync(process.execPath, [join(dir, "link/lib/glb.mjs"), "sphere", out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(out), "exited 0 without writing the file");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

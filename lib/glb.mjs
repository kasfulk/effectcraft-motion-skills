#!/usr/bin/env node
// Dependency-free glTF 2.0 (.glb) writer for the primitive meshes effectcraft-cli
// can display as a 3D Model layer. No npm packages: the binary container is a small,
// fixed layout (12-byte header, JSON chunk, BIN chunk).
//
// CLI: node lib/glb.mjs <cube|sphere|torus|cylinder|plane> <out.glb> [--color "#2ea8ff"]

const NAMES = ["cube", "sphere", "torus", "cylinder", "plane"];
export const PRIMITIVES = NAMES;

// --- geometry: each returns {positions, normals, indices} pressed into one array each ---

function cube() {
  const faces = [
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
  ];
  const positions = [], normals = [], indices = [];
  faces.forEach(([n, vs], f) => {
    vs.forEach((v) => { positions.push(...v); normals.push(...n); });
    const b = f * 4;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return { positions, normals, indices };
}

function sphere(stacks = 24, sectors = 32) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= stacks; i++) {
    const phi = (i / stacks) * Math.PI, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let j = 0; j <= sectors; j++) {
      const theta = (j / sectors) * Math.PI * 2, st = Math.sin(theta), ct = Math.cos(theta);
      const x = sp * ct, y = cp, z = sp * st;
      positions.push(x, y, z); normals.push(x, y, z);
    }
  }
  const row = sectors + 1;
  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = i * row + j, b = a + row;
      // The pole rows collapse to a point, so their quad is half degenerate.
      if (i > 0) indices.push(a, a + 1, b);
      if (i < stacks - 1) indices.push(a + 1, b + 1, b);
    }
  }
  return { positions, normals, indices };
}

function torus(ring = 32, tube = 16, R = 0.7, r = 0.3) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= ring; i++) {
    const u = (i / ring) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= tube; j++) {
      const v = (j / tube) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      const x = (R + r * cv) * cu, y = r * sv, z = (R + r * cv) * su;
      positions.push(x, y, z);
      normals.push(cv * cu, sv, cv * su);
    }
  }
  const row = tube + 1;
  for (let i = 0; i < ring; i++) {
    for (let j = 0; j < tube; j++) {
      const a = i * row + j, b = a + row;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return { positions, normals, indices };
}

function cylinder(sides = 32, halfHeight = 1, radius = 0.55) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    positions.push(radius * ca, -halfHeight, radius * sa); normals.push(ca, 0, sa);
    positions.push(radius * ca, halfHeight, radius * sa); normals.push(ca, 0, sa);
  }
  for (let i = 0; i < sides; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  for (const [y, ny] of [[halfHeight, 1], [-halfHeight, -1]]) {
    const centre = positions.length / 3;
    positions.push(0, y, 0); normals.push(0, ny, 0);
    const first = positions.length / 3;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      positions.push(radius * Math.cos(a), y, radius * Math.sin(a)); normals.push(0, ny, 0);
    }
    for (let i = 0; i < sides; i++) {
      if (ny > 0) indices.push(centre, first + i + 1, first + i);
      else indices.push(centre, first + i, first + i + 1);
    }
  }
  return { positions, normals, indices };
}

function plane() {
  return {
    positions: [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  };
}

const BUILDERS = { cube, sphere, torus, cylinder, plane };

export function geometry(kind) {
  const build = BUILDERS[kind];
  if (!build) throw new Error(`unknown primitive ${JSON.stringify(kind)} (${NAMES.join("|")})`);
  return build();
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(hex)}`);
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// --- container ---

function pad4(buf, fill) {
  const rest = (4 - (buf.length % 4)) % 4;
  return rest ? Buffer.concat([buf, Buffer.alloc(rest, fill)]) : buf;
}

export function buildGlb(mesh, { color = [0.1, 0.55, 0.95], metallic = 0.05, roughness = 0.55 } = {}) {
  const { positions, normals, indices } = mesh;
  const vertexCount = positions.length / 3;
  const indexCount = indices.length;
  if (vertexCount === 0 || indexCount === 0) throw new Error("empty mesh");
  if (indexCount % 3 !== 0) throw new Error("index count must be a multiple of 3");
  for (const i of indices) if (!(Number.isInteger(i) && i >= 0 && i < vertexCount)) throw new Error(`index ${i} out of range`);

  const wide = vertexCount > 65535;                     // 32-bit indices only when the mesh needs them
  const posBytes = vertexCount * 12, nrmBytes = vertexCount * 12;
  const idxBytes = indexCount * (wide ? 4 : 2);
  const bin = Buffer.alloc(posBytes + nrmBytes + idxBytes);
  positions.forEach((v, i) => bin.writeFloatLE(v, i * 4));
  normals.forEach((v, i) => bin.writeFloatLE(v, posBytes + i * 4));
  indices.forEach((v, i) => (wide ? bin.writeUInt32LE(v, posBytes + nrmBytes + i * 4) : bin.writeUInt16LE(v, posBytes + nrmBytes + i * 2)));

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }

  const gltf = {
    asset: { version: "2.0", generator: "effectcraft-motion lib/glb.mjs" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ name: "Base", pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: metallic, roughnessFactor: roughness } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertexCount, type: "VEC3", min, max },
      { bufferView: 1, componentType: 5126, count: vertexCount, type: "VEC3" },
      { bufferView: 2, componentType: wide ? 5125 : 5123, count: indexCount, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes },
      { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes },
      { buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: idxBytes },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  const json = pad4(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
  const binPadded = pad4(bin, 0);
  const total = 12 + 8 + json.length + 8 + binPadded.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0);      // "glTF"
  out.writeUInt32LE(2, 4);               // version
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(json.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);     // "JSON"
  json.copy(out, 20);
  const binAt = 20 + json.length;
  out.writeUInt32LE(binPadded.length, binAt);
  out.writeUInt32LE(0x004e4942, binAt + 4);  // "BIN"
  binPadded.copy(out, binAt + 8);
  return out;
}

export function glbFor(kind, opts = {}) {
  return buildGlb(geometry(kind), opts);
}

// --- CLI ---
// Node resolves symlinks in import.meta.url but not in argv[1]; every harness installs the
// skill as a symlink, so compare against the real path or the CLI silently does nothing.
const { realpathSync } = await import("node:fs");
const { pathToFileURL } = await import("node:url");
const isMain = () => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
};
if (process.argv[1] && isMain()) {
  const [kind, out] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const ci = process.argv.indexOf("--color");
  const color = ci === -1 ? undefined : hexToRgb(process.argv[ci + 1]);
  if (!kind || !out) {
    console.error(`usage: node lib/glb.mjs <${NAMES.join("|")}> <out.glb> [--color "#rrggbb"]`);
    process.exit(1);
  }
  const buf = glbFor(kind, color ? { color } : {});
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, buf);
  console.log(`${out} ${buf.length} bytes`);
}

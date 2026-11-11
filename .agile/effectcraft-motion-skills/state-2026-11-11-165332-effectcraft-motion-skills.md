scope: effectcraft-motion-skills
session: 2026-11-11-165332-effectcraft-motion-skills
stage: COMPLETE
status: DONE
updated: 2026-11-11 17:42
completed: [intake, brainstorm, plan, coding, code_review, testing, verification]
current: []
next: []

intake: STANDARD (new capability, touches spec schema, builder, docs, tests)

## Question asked
Bisa tidak membuat 3D asset dari pihak ketiga (hyperframes, three.js, sejenisnya) untuk
di-import ke effectcraft? Kalau bisa, kerjakan di project skill ini.

## Answer: sudah didukung engine, belum didukung skill
`effectcraft-cli` punya **Advanced 3D** penuh. Bukti yang sudah dijalankan:

| Bukti | Hasil |
|---|---|
| `commands \| grep newModel` | `layer.newModel {item?\|path?, …}` menerima `.gltf .glb .obj .stl .fbx` |
| `layer.newModel {path:"/tmp/e3d/cube.glb"}` | `{"advanced3d":true,"item":2,"layer":3}` |
| `render-frame` | kubus biru PBR dirender benar (baseColorFactor dihormati) |
| `app.project.importFile(new ImportOptions(new File(glb)))` | item `typeName = "3D Model"` |
| `comp.layers.add(item)` | layer 3D Model dibuat, `comp.renderer` otomatis jadi `ADBE Advanced 3d` |
| nested `advanced3d` comp → `Main` classic 3D | render sukses, rotasi keyframe jalan (3 frame berbeda) |

Artinya jalur JSX yang sudah dipakai `bin/ecm.mjs` sanggup membuat model layer. Yang belum ada
di skill ini: tipe scene, resolusi path, validasi, preset lighting, generator aset, dan dokumentasi.

## Scope yang dikerjakan
1. **Tipe scene `model`** di spec JSON — jalur native, bukan footage hasil bake.
2. **Resolusi path** `src` mengikuti konvensi SFX: `"3d/cube.glb"` → `assets/3d/…`;
   `"../out/x.glb"` → relatif ke spec.
3. **Generator aset primitif** tanpa dependency (GLB writer): cube/sphere/torus/cylinder/plane,
   supaya spec bisa jalan tanpa Blender. Ditulis ke `assets/3d/`.
4. **Preset lighting** yang menghasilkan shading terbaca — angka final dari probe.
5. **Dokumentasi** `reference/3d.md` + baris SKILL.md + sebutkan jalur ekspor pihak ketiga
   (Blender, Spline, three.js `GLTFExporter`, hyperframes → footage).
6. **Test**: validasi spec + preview nyata dengan GLB hasil generator.

## Non-goals
- Tidak menambah dependency npm ke repo (zip cap 200 tetap terjaga; aset GLB kecil & bisa
  diregenerasi lewat perintah).
- Tidak membuat renderer three.js/WebGL di dalam engine.
- Tidak menyentuh `test/smoke.sh` yang sudah merah sebelum sesi ini.

## Risiko terbuka
- Shading: tanpa light, model render rata (siluet). Dengan Spot default muncul specular panas
  yang blow-out. Butuh kombinasi ambient + key light + roughness — angka dari probe.
- `layers.addLight(name, centerPoint)` memetakan koordinat tak terduga
  (`[700,200,900]` → `[280,700,-440]`); posisi harus di-set lewat property path setelah dibuat.
- `layer.lightType` bukan property object (`.setValue` melempar "not a callable function");
  perlu cara set yang benar.

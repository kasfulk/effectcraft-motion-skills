---
name: effectcraft-motion-graphics
description: >-
  Skill for AI Agents to create professional motion graphics, product promos, and title animations 
  using effectcraft-cli, translating After Effects design principles, keyframing, expressions, 
  and VFX workflows into headless CLI commands.
---

# EffectCraft Motion Graphics Skill (`SKILLS.md`)

## Overview & Agent Role
This skill equips an Agentic AI to design and render high-end motion graphics videos via `effectcraft-cli`. The agent translates classic After Effects workflows—such as organic easing, multi-property text animators, liquid gradients, shape repeaters, track matte hierarchies, 3D camera rigs, and particle physics—into structured `effectcraft-cli` commands.

---

## Key Motion Design Principles (Grounded in After Effects Techniques)

### 1. Easing & Speed Graph Control
- **Linear keyframes look mechanical.** Always apply smooth easing (`easyEase` or custom cubic-bezier handles) on position, scale, and opacity keyframes [8].
- Customize speed graphs to achieve rapid acceleration into dramatic deceleration for product entrance transitions [6].

### 2. Layer Hierarchy & 3D Staging
- Use **Null Objects** as parent controllers for complex multi-layer movements and 3D camera orbits [3, 6].
- Separate background, main product asset, surrounding side elements, and foreground text layers to create depth of field [2, 6].

### 3. Typography & Text Reveals
- Build multi-property text animators combining **Position, Opacity, and Blur** with Range Selectors set to `ramp up` and customized `ease high/low` values [10].
- Implement advanced title effects such as stroke drawing, echo trails, RGB-split zoom, and text attached to circular vector paths driven by rotation expressions [2, 10].

### 4. Background & Texture Synthesis
- **Liquid Gradients**: Apply 4-color gradients, animate color stops via expressions, and distort using Wave Warp, Twirl, and Turbulence Displace [5, 7].
- **Border Elimination**: Apply Motion Tile with `mirror edges` enabled to maintain seamless composition borders during heavy distortion [7].
- **Shape Repeaters**: Use shape layer repeaters combined with turbulent displacement for animated geometric background patterns [10].
- **Grain & Banding Reduction**: Add subtle noise/dust overlays or layer styles to eliminate gradient color banding [1, 7].

### 5. Masking & Matte Parenting
- Utilize flexible **Track Matte Parenting** (Alpha and Luma Mattes) to mask video transitions, texture cutouts, and reveal elements across multiple child layers [2, 10].
- Apply custom mask feathering for organic liquid shapes [10].

### 6. Visual Effects & Polish
- Enhance product shots with **CC Light Sweep**, **Directional Blur**, **Glow**, and organic noise-infused drop shadows generated via layer styles [2, 6, 10].
- Integrate particle systems (emitter masking, wind/turbulence physics, and linear wipe reveals) for logo and text unveils [1].

---

## Standard `effectcraft-cli` Execution Workflow

### Step 1: Project Initialization
Create a target `.ecproj` project file and establish the main composition.
```bash
effectcraft-cli exec comp.new \
  --params '{"name":"MainComp","width":1920,"height":1080,"frameRate":30,"duration":10.0}' \
  project.ecproj
```

### Step 2: Layer & Background Setup
Add shape layers or solid backgrounds, applying gradient effects and expressions.
```bash
# Add solid background
effectcraft-cli exec layer.newSolid \
  --params '{"name":"BG","color":"#0f172a","width":1920,"height":1080}' \
  project.ecproj

# Apply Four-Color Gradient Effect
effectcraft-cli add_effect \
  --layer 1 \
  --effect "FourColorGradient" \
  --values '{"color1":"#ff0055","color2":"#7a00ff","color3":"#00e5ff","color4":"#ffbe00"}' \
  project.ecproj

# Add Wave Warp / Turbulence Distortion
effectcraft-cli add_effect \
  --layer 1 \
  --effect "TurbulenceDisplace" \
  --values '{"amount":80,"size":120}' \
  project.ecproj
```

### Step 3: Product Asset & 3D Camera Rigging
Import assets, attach them to a 3D Null Object, and animate movement.
```bash
# Import Product Image
effectcraft-cli exec layer.importAsset \
  --params '{"path":"./assets/product.png","name":"Product"}' \
  project.ecproj

# Create 3D Null Controller
effectcraft-cli exec layer.newNull \
  --params '{"name":"Null_CamControl","is3D":true}' \
  project.ecproj

# Parent Product Layer to Null
effectcraft-cli exec layer.setParent \
  --params '{"childLayer":2,"parentLayer":3}' \
  project.ecproj

# Add Keyframes for Product Entrance with Easing
effectcraft-cli add_keyframe \
  --layer 3 \
  --path "transform/scale" \
  --keys '[{"time":0.0,"value":[0,0,0]},{"time":1.2,"value":[100,100,100]}]' \
  --interpolation "easyEase" \
  project.ecproj
```

### Step 4: Kinetic Typography & Expressions
Create animated title layers driven by expressions or animator properties.
```bash
# Create Title Text Layer
effectcraft-cli exec layer.newText \
  --params '{"text":"PURE ENERGY","fontSize":120,"fontFamily":"Montserrat","fill":"#ffffff"}' \
  project.ecproj

# Add Organic Bounce / Wiggle Expression to Title Scale
effectcraft-cli set_property \
  --layer 4 \
  --path "transform/rotation" \
  --expression "Math.sin(time * 4) * 5" \
  project.ecproj
```

### Step 5: Visual Inspection (Headless Frame Verification)
Render single frame previews to inspect design quality before full render.
```bash
effectcraft-cli render-frame \
  --comp MainComp \
  --time 1.2 \
  --out ./scratch/preview_01.png \
  project.ecproj
```

### Step 6: Final Headless Rendering
Export the complete composition to high-quality MP4 or ProRes.
```bash
effectcraft-cli render \
  --comp MainComp \
  --out ./output/final_motion_graphic.mp4 \
  --format h264 \
  --bitrate "15M" \
  project.ecproj
```

---

## Agentic Quality Check Gates
Before finalizing any video output, the AI Agent must verify:
1. **Easing Check**: No raw linear transitions on hero elements; keyframes must utilize bezier curves or `easyEase`.
2. **Text Legibility**: Text layers have sufficient contrast, drop shadows, or background track mattes.
3. **Seamless Distortion**: Distorted backgrounds use Motion Tile with mirror edges to avoid transparent borders.
4. **Frame Rendering**: Check frame snapshots at key progress points ($t=0s$, $t=1.5s$, $t=5s$) for visual correctness.

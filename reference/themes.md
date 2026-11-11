## Theme list

70 themes. `node $E themes` prints the same list with labels; `node $E themes --suggest <spec>` recommends four.

| group | themes |
|---|---|
| Bold / news / finance | `reel`, `kinetik`, `infopop`, `flat-vector`, `swiss-grid-poster`, `word-stack`, `linocut`, `riso-print`, `papercraft-kit`, `pixel-quest`, `retro-os`, `wireframe-terrain`, `blueprint` |
| Editorial / serif | `editorial-spread`, `manuscript-page`, `newsprint-collage`, `essay-collage`, `botanical-plate`, `chapter-cards`, `cinematic`, `compass-bloom`, `cyanotype`, `deep-sea-glow`, `dot-ledger`, `ember-room`, `flow-field`, `gold-vine`, `impasto`, `ink-in-water`, `iso-night`, `lantern-night`, `lattice-light`, `moon-phases`, `nouveau-card`, `one-line`, `paper-diorama`, `pen-stroke-calligraphy`, `qalam-sketch`, `ridgeline`, `rim-light-stick`, `stained-glass`, `star-chart`, `sumi-e-wash`, `time-road`, `watercolour-bloom`, `zellige-tile` |
| Hand / sketch | `chalkboard-lesson`, `graphite-sketchbook`, `hand-drawn`, `lamp-ink`, `matisse-cutouts`, `napkin-sketch`, `pressed-flower-journal`, `watercolour-sketchbook`, `edukasi` |
| Minimal / clean | `pitch`, `tenang`, `minimal-geometry`, `line-art-story`, `growing-island`, `isometric-pastel`, `low-poly`, `origami`, `frosted-glass`, `rain-and-light`, `voxel-diorama`, `dreamy-aura`, `pastel-cinema` |
| Deco / retro | `art-deco-foil` |
| 3D / world | `ink-3d-world` |

## Motion and Layouts

Each theme now includes a `motion` object that defines visual transition characteristics, and optionally a `layouts` object for specific composition composition.

### Motion Object

| field | type | values | description |
|-------|------|--------|-------------|
| `energy` | string | `calm`, `snap`, `float` | Overall motion energy and intensity |
| `stagger` | number | `0.12` - `0.35` | Delay between element animations |
| `transition` | string | `fade`, `fold`, `maskWipe`, `pageTurn`, `zoom`, `glitch`, `dipSeed`, `colorShift` | Main transition effect |
| `atmosphere` | string | `none`, `glow`, `grain`, `full` | Environmental treatment: `glow` = accent halo, `grain` = film noise, `full` = both. Every mode except `none` also gets the vignette. A scene's own `atmosphere` overrides the theme's. |

### Layouts Object

Every theme carries a `layouts` object that picks the composition used by each scene type. A scene's own `layout` field overrides it.

| key | values | default when the theme omits it |
|-----|--------|--------------------------------|
| `hook` | `center`, `bottom`, `split` | `center` |
| `kinetic` | `slide`, `mask`, `stagger`, `morph`, `world` | `slide` |
| `quote` | `center`, `card`, `rule` | `center` |
| `stat` | `center`, `ring`, `left`, `split` | `center` |
| `bars` | `vertical`, `horizontal`, `race`, `lollipop` | `vertical` |
| `donut` | `ring`, `multi`, `gauge` | `ring` |
| `steps` | `list`, `timeline`, `cards` | `list` |
| `compare` | `stack`, `split` | `stack` |
| `outro` | `center`, `pill`, `handle` | `center` |

Example: `editorial-spread` uses `{"quote": "card", "steps": "timeline", "compare": "stack"}`.

### Examples

#### Reel Theme (Snap Energy)

```json
{
  "reel": {
    "label": "Reel Tegas",
    "align": "left",
    "easing": "snap",
    "durationScale": 1,
    "motion": {
      "energy": "snap",
      "stagger": 0.12,
      "transition": "glitch",
      "atmosphere": "grain"
    },
    "colors": { ... },
    "fonts": { ... },
    "motifs": ["slab", "square"]
  }
}
```

#### Pitch Theme (Calm Energy)

```json
{
  "pitch": {
    "label": "Pitch Minimal",
    "align": "left",
    "easing": "smooth",
    "durationScale": 1,
    "motion": {
      "energy": "calm",
      "stagger": 0.28,
      "transition": "fade",
      "atmosphere": "glow"
    },
    "colors": { ... },
    "fonts": { ... },
    "motifs": ["lineLabel", "thin"]
  }
}
```

#### Kinetik Theme (Kinetic Energy)

```json
{
  "kinetik": {
    "label": "Kinetik HUD",
    "align": "left",
    "easing": "pop",
    "durationScale": 1,
    "motion": {
      "energy": "snap",
      "stagger": 0.15,
      "transition": "zoom",
      "atmosphere": "full"
    },
    "colors": { ... },
    "fonts": { ... },
    "motifs": ["underline", "square"]
  }
}
```

### Notes

- `motion.energy` determines the overall animation character and intensity
- `motion.stagger` controls timing between successive animations (0.12-0.35 seconds)
- `motion.transition` specifies the main visual transition effect
- `motion.atmosphere` adds environmental context and texture
- `layouts` overrides are included only for themes with specific composition needs
- All new fields are optional with sensible defaults
// atmosphere effects
var ATMOSPHERE = {
  apply: function(comp, theme, o) {
    o = o || {};
    // scene.atmosphere overrides the theme; the documented values are none|glow|grain|full
    var mode = o.atmosphere || (theme.motion && theme.motion.atmosphere) || 'full';
    if (mode === 'none') return;
    var glow = mode === 'glow' || mode === 'full';

    if (glow) {
      // Breathing glow (3 ellipses). Position and size are seeded from the scene number so no two
      // scenes share the same frame — a fixed centre made every panel read as the same layout.
      var seed = SCENE_N || 1;
      var gx = CX + (((seed * 137) % 5) - 2) * 120;
      var gy = 960 + (((seed * 89) % 5) - 2) * 210;
      var gd = 460 + ((seed * 53) % 4) * 80;
      for (var i = 0; i < 3; i++) {
        var glowLayer = ellipse(comp, {cx:gx, cy:gy, d:gd + i * 120, fill:theme.colors.accent, comment:'decor', name:'glow' + i});
        glowLayer.transform.opacity.setValue(3 + i * 8);
        var glowDur = 4 + i * 0.8;
        animate(glowLayer.transform.scale, 0, glowDur, [100, 100], [110 + i * 5, 110 + i * 5], theme.easing);
        animate(glowLayer.transform.opacity, 0, glowDur, 3 + i * 8, 0, theme.easing);
      }
    }

    return;
  },

  // Adjustment layers only affect the layers below them, so they are added after the scene content.
  overlay: function(comp, theme, o) {
    o = o || {};
    var mode = o.atmosphere || (theme.motion && theme.motion.atmosphere) || 'full';
    if (mode === 'none') return;
    var grain = mode === 'grain' || mode === 'full';

    // Vignette adjustment layer
    var vignetteLayer = comp.layers.addSolid([0, 0, 0], 'vignette', 1080, 1920, 1);
    vignetteLayer.adjustmentLayer = true;
    vignetteLayer.comment = 'decor';
    var vignetteEffect = vignetteLayer.property('Effects').addProperty('Vignette');
    vignetteEffect.property('Amount').setValue(35);

    if (grain) {
      // Grain noise
      var grainLayer = comp.layers.addSolid([0, 0, 0], 'grain', 1080, 1920, 1);
      grainLayer.adjustmentLayer = true;
      grainLayer.comment = 'decor';
      var grainEffect = grainLayer.property('Effects').addProperty('Noise');
      grainEffect.property('Amount of Noise').setValue(5);
      grainEffect.property('Use Color Noise').setValue(0);
    }

    return;
  }
};

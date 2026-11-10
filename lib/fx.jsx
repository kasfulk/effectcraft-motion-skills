// fx: effect presets ported from effectcraft-skills-repository recipes to real engine effect names.
// Each preset returns the time its own animation finishes (0 = static); the pipeline holds after it.
function fxBg(comp) { return comp.layer('background'); }
function fxAdjust(comp, name) { var l = comp.layers.addSolid([0, 0, 0], name, 1080, 1920, 1); l.adjustmentLayer = true; l.comment = 'decor'; return l; }
function fxAdd(layer, name, vals) { var e = layer.property('Effects').addProperty(name); for (var k in vals) e.property(k).setValue(vals[k]); return e; }
function fxTargets(comp) {
  var out = [];
  for (var i = 1; i <= comp.numLayers; i++) { var l = comp.layer(i); if (l.comment !== 'bg' && l.comment !== 'decor' && /^(text|value|title|line\d)$/.test(l.name)) out.push(l); }
  return out;
}
function fxStart(l) {
  var best = Infinity, ps = [l.transform.position, l.transform.opacity, l.transform.scale];
  for (var i = 0; i < ps.length; i++) if (ps[i].numKeys) best = Math.min(best, ps[i].keyTime(1));
  return best === Infinity ? 0.15 : best;
}
function fxEach(comp, fn) { var end = 0, ts = fxTargets(comp); for (var i = 0; i < ts.length; i++) end = Math.max(end, fn(ts[i]) || 0); return end; }
var FX = {
  // background
  grid: function (comp, theme) {
    var e = fxAdd(fxBg(comp), 'Grid', {'Width':90, 'Border':2, 'Opacity':30, 'Blending Mode':2}); e.property('Color').setValue(rgb(theme.colors.muted));
    e.property('Anchor').expression = '[time*24, time*24]'; return 0;
  },
  liquid: function (comp, theme) {
    var b = fxBg(comp), e = b.property('Effects').addProperty('4-Color Gradient'), pc = e.property('Positions & Colors');
    var cols = [theme.colors.base, theme.colors.accent, theme.colors.muted, theme.colors.base];
    for (var i = 1; i <= 4; i++) {
      pc.property('Color ' + i).setValue(rgb(cols[i - 1]));
      pc.property('Point ' + i).expression = '[540+Math.sin(time*' + (0.5 + 0.2 * i) + '+' + i + ')*420, 960+Math.cos(time*' + (0.4 + 0.15 * i) + '+' + 2 * i + ')*700]';
    }
    e.property('Opacity').setValue(35); e.property('Blending Mode').setValue(2);
    fxAdd(b, 'Turbulent Displace', {'Amount':60, 'Size':300}).property('Evolution').expression = 'time*40';
    return 0;
  },
  paper: function (comp) { var e = fxAdd(fxBg(comp), 'Fractal Noise', {'Fractal Type':3, 'Contrast':160, 'Complexity':3, 'Opacity':12, 'Blending Mode':4}); e.property('Transform').property('Scale').setValue(30); return 0; },
  grain: function (comp) { fxAdd(fxAdjust(comp, 'grain'), 'Noise', {'Amount of Noise':5, 'Use Color Noise':0}); return 0; },
  vignette: function (comp) { fxAdd(fxAdjust(comp, 'vignette'), 'Vignette', {'Amount':35}); return 0; },
  // hero text: text, value, title, line1..6
  glow: function (comp, theme) {
    return fxEach(comp, function (l) { var e = fxAdd(l, 'Glow', {'Glow Based On':1, 'Glow Radius':28, 'Glow Intensity':0.8, 'Glow Colors':2}); e.property('Color A').setValue(rgb(theme.colors.accent)); e.property('Color B').setValue(rgb(theme.colors.accent)); });
  },
  rgbIn: function (comp, theme) {
    return fxEach(comp, function (l) { var s = fxStart(l), e = l.property('Effects').addProperty('VR Chromatic Aberrations'); animate(e.property('Aberration (Red)'), s, s + 0.5, 40, 0, theme.easing); animate(e.property('Aberration (Blue)'), s, s + 0.5, -40, 0, theme.easing); return s + 0.5; });
  },
  blurIn: function (comp, theme) {
    return fxEach(comp, function (l) { var s = fxStart(l), e = l.property('Effects').addProperty('Gaussian Blur'); animate(e.property('Blurriness'), s, s + 0.5, 40, 0, theme.easing); return s + 0.5; });
  },
  sweep: function (comp, theme, settle) {
    return fxEach(comp, function (l) {
      // Cutout keeps the light inside the glyphs but drops the rest, so it rides on a copy above the text.
      var d = l.duplicate(); d.name = 'sweep'; d.comment = 'decor';
      var r = l.sourceRectAtTime(settle, false), y = r.top + r.height / 2, e = fxAdd(d, 'Light Sweep', {'Width':80, 'Sweep Intensity':100, 'Direction':-20, 'Light Reception':3});
      e.property('Light Color').setValue(rgb(theme.colors.accent)); animate(e.property('Center'), settle, settle + 0.8, [r.left - 120, y], [r.left + r.width + 120, y], 'calm'); return settle + 0.8;
    });
  },
  float: function (comp) { fxEach(comp, function (l) { l.transform.position.expression = '[value[0], value[1] + Math.sin(time*2 + index)*6]'; }); return 0; },
  // overlay
  glitch: function (comp) { var e = fxAdjust(comp, 'glitch').property('Effects').addProperty('VR Digital Glitch'); animate(e.property('Master Amplitude'), 0, 0.45, 300, 0, 'snap'); return 0; }
};
function applyFx(comp, theme, names, settle) {
  var end = 0; for (var i = 0; i < names.length; i++) end = Math.max(end, FX[names[i]](comp, theme, settle)); return end;
}

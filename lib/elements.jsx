// visual elements
function mulberry32(seed) {
  return function () {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t * 0x8080FF01);
    t ^= t + Math.imul(t ^ t >>> 15, t | 1);
    return ((t >>> 0) / 0x100000000);
  };
}
var random = mulberry32(12345);

var ELEMENTS = {
  apply: function(comp, theme, names, o) {
    var end = 0;
    for (var i = 0; i < names.length; i++) {
      switch (names[i]) {
        case 'flash': end = Math.max(end, flash(comp, theme, o || {})); break;
        case 'rays': end = Math.max(end, rays(comp, theme, o || {})); break;
        case 'fog': end = Math.max(end, fog(comp, theme, o || {})); break;
        case 'particles': end = Math.max(end, particles(comp, theme, o || {})); break;
        case 'cracks': end = Math.max(end, cracks(comp, theme, o || {})); break;
        case 'lightning': end = Math.max(end, lightning(comp, theme, o || {})); break;
        case 'fire': end = Math.max(end, fire(comp, theme, o || {})); break;
        case 'water': end = Math.max(end, water(comp, theme, o || {})); break;
      }
    }
    return end;
  }
};

// visual element helper functions
function flash(comp, theme, o) {
  o = o || {};
  var t0 = o.t0 || 0;
  var dur = o.dur || 0.45;
  var peak = o.peak || 0.85;
  var color = o.color || '#ffffff';
  
  var flashLayer = comp.layers.addSolid([1, 1, 1], 'flash', 1080, 1920, 1);
  flashLayer.comment = 'decor';
  animate(flashLayer.transform.opacity, t0, t0 + dur * peak, 0, 100, theme.easing);
  animate(flashLayer.transform.opacity, t0 + dur * peak, t0 + dur, 100, 0, theme.easing);
  
  return t0 + dur;
}

function rays(comp, theme, o) {
  o = o || {};
  var x = o.x !== undefined ? o.x : CX;
  var y = o.y !== undefined ? o.y : -160;
  var count = o.count || 7;
  var spread = o.spread || 56;
  var opacity = o.opacity || 0.18;
  var end = 0;
  var sceneDur = o.dur || 3;
  
  for (var i = 0; i < count; i++) {
    var rayLayer = ellipse(comp, {cx:x, cy:y, d:spread, fill:theme.colors.accent, comment:'decor', name:'ray' + i});
    var rayDur = 2 + (i * 0.2);
    var start = (i / count) * Math.max(0, sceneDur - rayDur);
    var op = rayLayer.transform.opacity;
    op.setValueAtTime(0, 0);
    if (start > 0) op.setValueAtTime(start, 0);
    op.setValueAtTime(start + 0.2, opacity * 100);
    op.setValueAtTime(start + rayDur, 0);
    animate(rayLayer.transform.position, start, start + rayDur, [x, y], [x + (i % 2 === 0 ? spread : -spread), y + 420], theme.easing);
    end = Math.max(end, start + rayDur);
  }
  
  return end;
}

function fog(comp, theme, o) {
  o = o || {};
  var y = o.y !== undefined ? o.y : 900;
  var height = o.height !== undefined ? o.height : 900;
  var opacity = o.opacity !== undefined ? o.opacity : 0.55;
  var clearAt = o.clearAt !== undefined ? o.clearAt : 0.6;
  
  var fogLayer = comp.layers.addSolid([0.5, 0.5, 0.5], 'fog', 1080, 1920, 1);
  fogLayer.comment = 'decor';
  animate(fogLayer.transform.opacity, 0, clearAt, opacity * 100, 0, theme.easing);
  
  return clearAt;
}

function particles(comp, theme, o) {
  o = o || {};
  var count = o.count !== undefined ? Math.min(o.count, 120) : 120;
  var target = o.target || 'none';
  var text = o.text || '';
  var gatherAt = o.gatherAt !== undefined ? o.gatherAt : 0.1;
  var scatterAt = o.scatterAt !== undefined ? o.scatterAt : 0.62;
  var drift = o.drift !== undefined ? o.drift : 1;
  var end = 0;
  
  for (var i = 0; i < count; i++) {
    var seed = (i * 12345) % 32768;
    var angle = (seed / 32768) * Math.PI * 2;
    var radius = 50 + (seed % 200);
    var x = CX + Math.cos(angle) * radius;
    var y = 1200 + Math.sin(angle) * (seed % 200);
    
    var particleLayer = ellipse(comp, {cx:x, cy:y, d:4, fill:theme.colors.accent, comment:'decor', name:'particle' + i});
    particleLayer.transform.opacity.setValue(50);
    
    var gatherDur = gatherAt;
    
    if (target === 'circle') {
      animate(particleLayer.transform.position, 0, gatherDur, [x, y], [CX, 1100], theme.easing);
      animate(particleLayer.transform.scale, 0, gatherDur, [100, 100], [120, 120], theme.easing);
      animate(particleLayer.transform.opacity, 0, gatherDur, 50, 100, theme.easing);
    } else if (target === 'word' && text) {
      var box = wordBox({lines: [text], x: CX, y: 900, w: 850, h: 100, font: theme.fonts.body, size: 64}, text);
      if (box) {
        animate(particleLayer.transform.position, 0, gatherDur, [x, y], [box.x + box.w / 2, box.y + box.h / 2], theme.easing);
        animate(particleLayer.transform.scale, 0, gatherDur, [100, 100], [120, 120], theme.easing);
        animate(particleLayer.transform.opacity, 0, gatherDur, 50, 100, theme.easing);
      }
    } else {
      for (var j = 0; j < drift; j++) {
        var dx = (Math.sin(i + j) * 20 - 10);
        var dy = (Math.cos(i + j) * 20 - 10);
        animate(particleLayer.transform.position, j * 0.1, (j + 1) * 0.1, [x + j * 0.5, y + j * 0.5], [x + j * 0.5 + dx, y + j * 0.5 + dy], theme.easing);
      }
    }
    
    end = Math.max(end, gatherDur + 0.5);
  }
  
  return end;
}

function cracks(comp, theme, o) {
  o = o || {};
  var x = o.x !== undefined ? o.x : CX;
  var y = o.y !== undefined ? o.y : 820;
  var ring = o.ring !== undefined ? o.ring : 220;
  var count = o.count !== undefined ? o.count : 12;
  var color = o.color || '#e0452e';
  var grow = o.grow !== undefined ? o.grow : 1.6;
  var end = 0;
  
  for (var i = 0; i < count; i++) {
    var crackLayer = rect(comp, {x:x, y:y, w:2, h:ring, fill:color, comment:'decor', name:'crack' + i});
    crackLayer.transform.rotation.setValue(i * (360 / count));
    
    var crackDur = grow;
    animate(crackLayer.transform.scale, 0, crackDur, [100, 0], [100, 100], theme.easing);
    
    if (i % 3 === 0) {
      var hitLayer = ellipse(comp, {cx:x + Math.cos(i * 0.5) * ring, cy:y + Math.sin(i * 0.5) * ring, d:20, fill:'#ffffff', comment:'decor', name:'crack-hit' + i});
      hitLayer.transform.opacity.setValue(0);
      animate(hitLayer.transform.opacity, crackDur, crackDur + 0.2, 0, 100, theme.easing);
      animate(hitLayer.transform.scale, crackDur, crackDur + 0.2, [0, 0], [100, 100], theme.easing);
    }
    
    end = Math.max(end, crackDur);
  }
  
  return end;
}

function lightning(comp, theme, o) {
  o = o || {};
  var x0 = o.x0 !== undefined ? o.x0 : CX - 100;
  var y0 = o.y0 !== undefined ? o.y0 : 300;
  var x1 = o.x1 !== undefined ? o.x1 : CX + 100;
  var y1 = o.y1 !== undefined ? o.y1 : 500;
  var branches = o.branches !== undefined ? o.branches : 3;
  var color = o.color || '#ffffff';
  var glow = o.glow !== false;
  var flash = o.flash !== false;
  var end = 0;
  
  var boltLayer = rect(comp, {x:x0, y:y0, w:x1 - x0, h:y1 - y0, stroke:color, strokeW:3, comment:'decor', name:'lightning'});
  
  var boltDur = 0.08;
  animate(boltLayer.transform.opacity, 0, boltDur, 0, 100, theme.easing);
  
  for (var i = 0; i < branches; i++) {
    var branchLayer = rect(comp, {x:x0, y:y0, w:40, h:80, fill:color, stroke:color, strokeW:2, comment:'decor', name:'lightning-branch' + i});
    branchLayer.transform.rotation.setValue(i * 30);
    
    var branchDur = boltDur * (0.5 + (i * 0.1));
    animate(branchLayer.transform.opacity, 0, branchDur, 0, 100, theme.easing);
    
    end = Math.max(end, branchDur);
  }
  
  if (flash) {
    var flashLayer = comp.layers.addSolid([1, 1, 1], 'lightning-flash', 1080, 1920, 1);
    flashLayer.comment = 'decor';
    animate(flashLayer.transform.opacity, 0, boltDur * 1.5, 0, 50, theme.easing);
    animate(flashLayer.transform.opacity, boltDur * 1.5, boltDur * 2, 50, 0, theme.easing);
    end = Math.max(end, boltDur * 2);
  }
  
  return end;
}

function fire(comp, theme, o) {
  o = o || {};
  var x = o.x !== undefined ? o.x : CX;
  var y = o.y !== undefined ? o.y : 1250;
  var width = o.width !== undefined ? o.width : 760;
  var height = o.height !== undefined ? o.height : 560;
  var count = o.count !== undefined ? o.count : 120;
  var color = o.color || '#e2541f';
  var colorHi = o.colorHi || '#ffd27a';
  var end = 0;
  var sceneDur = o.dur || 3;
  
  for (var i = 0; i < count; i++) {
    var seed = (i * 12345) % 32768;
    var emberLayer = ellipse(comp, {cx:x, cy:y, d:6, fill:i === 0 ? colorHi : color, comment:'decor', name:'ember' + i});
    
    var emberDur = 0.5 + (seed % 200) / 200;
    var riseDist = 200 + (seed % 400);
    // Stagger the embers across the scene so the fire burns for its whole length instead of
    // dying after the first ember's 1.5 s life.
    var start = (i / count) * Math.max(0, sceneDur - emberDur);
    var op = emberLayer.transform.opacity;
    op.setValueAtTime(0, 0);
    if (start > 0) op.setValueAtTime(start, 0);
    op.setValueAtTime(start + 0.08, 80);
    op.setValueAtTime(start + emberDur, 0);
    
    animate(emberLayer.transform.position, start, start + emberDur, [x, y], [x + (Math.sin(i) * 20 - 10), y - riseDist], theme.easing);
    animate(emberLayer.transform.scale, start, start + emberDur, [100, 100], [50, 50], theme.easing);
    
    end = Math.max(end, start + emberDur);
  }
  
  return end;
}

function water(comp, theme, o) {
  o = o || {};
  var x = o.x !== undefined ? o.x : CX;
  var y = o.y !== undefined ? o.y : 1100;
  var width = o.width !== undefined ? o.width : 760;
  var lines = o.lines !== undefined ? o.lines : 9;
  var gap = o.gap !== undefined ? o.gap : 26;
  var amp = o.amp !== undefined ? o.amp : 10;
  var color = o.color || '#5fb3d9';
  var end = 0;
  var sceneDur = o.dur || 3;
  
  for (var i = 0; i < lines; i++) {
    var px = x + (i - lines/2) * gap;
    var waveLayer = ellipse(comp, {cx:px, cy:y, d:amp, fill:color, comment:'decor', name:'wave' + i});
    
    var waveDur = 2.0;
    var start = (i / lines) * Math.max(0, sceneDur - waveDur);
    var op = waveLayer.transform.opacity;
    op.setValueAtTime(0, 0);
    if (start > 0) op.setValueAtTime(start, 0);
    op.setValueAtTime(start + 0.15, 70);
    op.setValueAtTime(start + waveDur, 0);
    
    animate(waveLayer.transform.position, start, start + waveDur, [px, y], [px, y + amp], theme.easing);
    animate(waveLayer.transform.scale, start, start + waveDur, [100, 100], [120, 120], theme.easing);
    
    end = Math.max(end, start + waveDur);
  }
  
  return end;
}

// Helper functions needed by the elements
function wordBox(res, word) {
  var idx = -1, prefix = '', line = '', low = String(word).toLowerCase();
  for (var i = 0; i < res.lines.length; i++) {
    var at = res.lines[i].toLowerCase().indexOf(low);
    if (at >= 0) { idx = i; prefix = res.lines[i].slice(0, at); line = res.lines[i].slice(at, at + word.length); break; }
  }
  if (idx < 0) return null;
  var lineH = res.h / res.lines.length, lineW = measure(line, res.font, res.size);
  var x = res.x + (res.align === 'center' ? -lineW / 2 : 0) + measure(prefix, res.font, res.size);
  return {x:x, y:res.y + idx * lineH, w:measure(line, res.font, res.size), h:lineH};
}

function measure(str, font, size) {
  var c = app.project.items.addComp('__measure', 1080, 1920, 1, 1, 30), l = c.layers.addText(String(str));
  var d = l.property('Source Text'), f = d.value;
  f.font = font; f.fontSize = size; f.fillColor = [0,0,0];
  d.setValue(f); var r = l.sourceRectAtTime(0, false), w = r.width;
  l.remove(); c.remove(); return w;
}

function colorRange(layer, start, end, hex) {
  var a = layer.property('Text').property('Animators').addProperty('ADBE Text Animator'), f = a.property('Properties').addProperty('ADBE Text Fill Color');
  f.setValue(rgb(hex));
  var s = a.property('Selectors').addProperty('ADBE Text Selector');
  s.property('Advanced').property('Units').setValue(2); s.property('Start').setValue(start); s.property('End').setValue(end);
  return a;
}

function rgb(hex) {
  var h = String(hex).replace(/^#/, '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
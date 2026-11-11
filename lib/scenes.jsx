function contentTop(comp, theme, scene) {
  return scene.title ? title(comp, theme, scene).bottom + 40 : 300;
}
function title(comp, theme, scene, n) {
  n = n || SCENE_N;
  var label = String(n < 10 ? '0' + n : n) + '  ' + String(scene.title);
  var lineLabel = motif(theme, 'lineLabel'), x = lineLabel ? SAFE.x0 : CX;
  if (lineLabel) {
    var lineColor = !scene.bg || scene.bg === 'base' ? theme.colors.muted : textColor(theme, scene);
    rect(comp, {x:SAFE.x0, y:300, w:130, h:4, fill:lineColor, origin:'left', comment:'decor'});
    var l = text(comp, label, {font:theme.fonts.label, size:36, min:36, color:lineColor, x:x, y:320, maxW:SAFE.x1-SAFE.x0, maxH:100, name:'title'});
    if (scene.bg && scene.bg !== 'base') l.layer.transform.opacity.setValue(70);
    return {bottom:l.y + l.h};
  }
  var centered = theme.align === 'center';
  var t = text(comp, scene.title, {font:theme.fonts.display, size:84, min:56, color:textColor(theme, scene), align:centered ? 'center' : 'left', x:centered ? CX : SAFE.x0, y:300, maxW:SAFE.x1-SAFE.x0, maxH:180, name:'title'});
  return {bottom:t.y + t.h};
}
function addGlow(comp, theme, cx, cy, dur) {
  if (!motif(theme, 'glow')) return 0;
  [520,390,260].forEach(function(d, i) { var l = ellipse(comp, {cx:cx, cy:cy, d:d, fill:theme.colors.accent, comment:'decor'}); animate(l.transform.opacity, 0, 1.2, 0, [8,11,15][i], theme.easing); });
  return 1.2;
}
function slab(comp, theme, y, h, dur) {
  if (!motif(theme, 'slab')) return;
  var l = rect(comp, {x:0, y:y + h / 2, w:1080, h:h + 100, fill:theme.colors.ink, origin:'left', comment:'decor', name:'slab'});
  animate(l.transform.position, 0, 0.4, [-1080, y + h / 2], [0, y + h / 2], theme.easing);
  l.moveAfter(comp.layer('text'));
}
function markEmphasis(comp, theme, res, scene, revealEnd) {
  if (!scene.emphasis || scene.bg === 'accent') return 0;
  var idx = emphasisIndex(scene.text, scene.emphasis), end = idx + scene.emphasis.length, box = wordBox(res, scene.emphasis);
  if (!box) { colorRange(res.layer, idx, end, theme.colors.accent); return 0; }
  if (motif(theme, 'highlighter')) {
    var hl = rect(comp, {x:box.x + box.w / 2, y:box.y + box.h / 2, w:box.w + 36, h:box.h + 36, fill:theme.colors.marker || theme.colors.accent, stroke:theme.colors.ink, strokeW:6, radius:14, origin:'center', comment:'decor', name:'highlighter'});
    hl.transform.rotation.setValue(-2.3); hl.moveAfter(res.layer); hl.transform.scale.setValueAtTime(revealEnd, [0,100]); animate(hl.transform.scale, revealEnd, revealEnd + 0.35, [0,100], [100,100], 'pop');
    return revealEnd + 0.35;
  }
  if (motif(theme, 'underline')) {
    colorRange(res.layer, idx, end, theme.colors.accent);
    var u = rect(comp, {x:box.x, y:box.y + box.h + 10, w:box.w, h:14, fill:theme.colors.accent, origin:'left', name:'underline'});
    u.transform.scale.setValueAtTime(revealEnd, [0,100]); animate(u.transform.scale, revealEnd, revealEnd + 0.35, [0,100], [100,100], 'pop');
    return revealEnd + 0.35;
  }
  colorRange(res.layer, idx, end, theme.colors.accent);
  return 0;
}
function textColor(theme, scene) { return onColor(theme, theme.colors[scene.bg || 'base']); }
function shadow(layer, color, opacity, direction, distance, softness) {
  var e = layer.property('Effects').addProperty('Drop Shadow');
  e.property('Shadow Color').setValue(rgb(color)); e.property('Opacity').setValue(opacity);
  e.property('Direction').setValue(direction); e.property('Distance').setValue(distance); e.property('Softness').setValue(softness);
}
var DEFAULT_LAYOUT = {hook:'center', kinetic:'slide', quote:'center', stat:'center', bars:'vertical', donut:'ring', steps:'list', compare:'stack', outro:'center'};
function sceneLayout(theme, scene) {
  if (scene.layout) return scene.layout;
  var base = (theme.layouts && theme.layouts[scene.type]) || DEFAULT_LAYOUT[scene.type];
  // A reel with three stat scenes used to get the same composition three times, because the
  // theme pins one layout per scene type. Rotate by how many scenes of this type came before:
  // the first keeps the theme's own pin, later ones move through the other valid layouts.
  var opts = LAYOUTS[scene.type], i = opts ? opts.indexOf(base) : -1;
  return i < 0 ? base : opts[(i + (SCENE_NTH || 0)) % opts.length];
}
var SCENES = {
  hook: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var bgHex = theme.colors[scene.bg || 'base'], ink = onColor(theme, bgHex), align = theme.align === 'center' ? 'center' : 'left';
    if (layout === 'split') {
      var res = text(comp, scene.text, {font:theme.fonts.display, size:150, min:72, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'left', x:SAFE.x0, y:850, maxW:600, maxH:900, name:'text'});
      var stop = Math.max(SAFE.y0, Math.min(SAFE.y1 - res.h, 850 - res.h / 2));
      res.layer.transform.position.setValue([res.layer.transform.position.value[0], stop]); res.y = stop;
      slab(comp, theme, res.y, res.h, dur);
      var bar = rect(comp, {x:720, y:stop + res.h / 2, w:8, h:Math.max(360, res.h * 1.2), fill:theme.colors.accent, origin:'center', comment:'decor', name:'hook-bar'});
      animate(bar.transform.scale, 0.15, 0.6, [100,0], [100,100], theme.easing);
      var g = addGlow(comp, theme, res.x + res.w / 2, res.y + res.h / 2, dur);
      var settle = 0.75; revealText(res.layer, 0.15, 0.6, theme.easing); var m = markEmphasis(comp, theme, res, scene, settle); return Math.max(settle, m, g);
    }
    if (layout === 'bottom') {
      var res = text(comp, scene.text, {font:theme.fonts.display, size:130, min:72, color:motif(theme, 'slab') ? theme.colors.base : ink, align:align, x:align === 'center' ? CX : SAFE.x0, y:1150, maxW:850, maxH:500, name:'text'});
      var btop = Math.max(SAFE.y0, Math.min(SAFE.y1 - res.h, 1150 - res.h / 2));
      res.layer.transform.position.setValue([res.layer.transform.position.value[0], btop]); res.y = btop;
      text(comp, String(SCENE_N < 10 ? '0' + SCENE_N : SCENE_N) + '  ' + (scene.title || 'KICKER'), {font:theme.fonts.label, size:36, min:36, color:ink, align:align === 'center' ? 'center' : 'left', x:align === 'center' ? CX : SAFE.x0, y:300, maxW:850, maxH:100, name:'kicker'});
      slab(comp, theme, res.y, res.h, dur);
      var g = addGlow(comp, theme, align === 'center' ? CX : res.x + res.w / 2, res.y + res.h / 2, dur);
      var settle = 0.75; revealText(res.layer, 0.15, 0.6, theme.easing); var m = markEmphasis(comp, theme, res, scene, settle); return Math.max(settle, m, g);
    }
    var res = text(comp, scene.text, {font:theme.fonts.display, size:150, min:72, color:motif(theme, 'slab') ? theme.colors.base : ink, align:align, x:align === 'center' ? CX : SAFE.x0, y:820, maxW:760, maxH:500, name:'text'});
    var topY = Math.max(SAFE.y0, Math.min(SAFE.y1 - res.h, 820 - res.h / 2));
    res.layer.transform.position.setValue([res.layer.transform.position.value[0], topY]); res.y = topY;
    slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, align === 'center' ? CX : res.x + res.w / 2, res.y + res.h / 2, dur);
    var settle = 0.15 + 0.6; revealText(res.layer, 0.15, 0.6, theme.easing); var markerEnd = markEmphasis(comp, theme, res, scene, settle); return Math.max(settle, markerEnd, glowEnd);
  },
  kinetic: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var align = theme.align === 'center' ? 'center' : 'left', tx = contentTop(comp, theme, scene);
    var max = 120, n = scene.lines.length, i, widest = 0;
    for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
    max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
    if (layout === 'slide') {
      var res = [], settle = 0;
      for (i = 0; i < n; i++) {
        var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
        var at = 0.15 + 0.35 * i, p = r.layer.transform.position.value; animate(r.layer.transform.position, at, at + 0.45, [p[0], p[1] + 60], [p[0], p[1]], theme.easing); animate(r.layer.transform.opacity, at, at + 0.45, 0, 100, theme.easing); res.push(r); settle = at + 0.45;
        if (scene.emphasis) { var joined = scene.lines[i], ei = emphasisIndex(joined, scene.emphasis); if (ei >= 0) { var markerEnd = markEmphasis(comp, theme, r, {emphasis:scene.emphasis, text:joined, bg:scene.bg}, settle); settle = Math.max(settle, markerEnd); } }
      }
      return settle;
    }
    if (layout === 'mask') {
      var align = theme.align === 'center' ? 'center' : 'left', tx = contentTop(comp, theme, scene);
      var max = 120, n = scene.lines.length, i, widest = 0;
      for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
      max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
      var lines = [];
      for (i = 0; i < n; i++) {
        var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
        lines.push(r);
      }
      return Math.max(0.15, MOTION.maskReveal(comp, theme, {lines:lines}, {size:max, stagger:0.2, lineDur:0.55, accentLine:scene.emphasis ? lines.length - 1 : -1}));
    }
    if (layout === 'stagger') {
      var align = theme.align === 'center' ? 'center' : 'left', tx = contentTop(comp, theme, scene);
      var max = 120, n = scene.lines.length, i, widest = 0;
      for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
      max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
      var lines = [], lineColor = textColor(theme, scene);
      for (i = 0; i < n; i++) {
        var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:lineColor, align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
        r.layer.transform.opacity.setValue(0);
        lines.push(r);
      }
      return Math.max(0.15, MOTION.wordStagger(comp, theme, {lines:lines}, {size:max, stagger:0.08, keyWord:scene.emphasis || '', color:lineColor}));
    }
    if (layout === 'morph') {
      var align = theme.align === 'center' ? 'center' : 'left', tx = contentTop(comp, theme, scene);
      var max = 120, n = scene.lines.length, i, widest = 0;
      for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
      max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
      var l1 = scene.lines[0], l2 = scene.lines[scene.lines.length - 1];
      var m = text(comp, l1, {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:tx, maxW:850, maxH:max*1.3, name:'morph'});
      var mend = MOTION.textMorph(comp, theme, m, {from:l1, to:l2, hold:0.8, size:max});
      var mset = Math.max(0.2, mend);
      if (scene.emphasis) { var mmarker = markEmphasis(comp, theme, m, {emphasis:scene.emphasis, text:l1, bg:scene.bg}, mset); mset = Math.max(mset, mmarker); }
      return mset;
    }
    if (layout === 'world') {
      var align = theme.align === 'center' ? 'center' : 'left', tx = contentTop(comp, theme, scene);
      var max = 120, n = scene.lines.length, i, widest = 0;
      for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
      max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
      var lines = [];
      for (i = 0; i < n; i++) {
        var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
        lines.push(r);
      }
      return Math.max(0.15, MOTION.inWorld(comp, theme, {lines:lines}, {size:max, surface:'page'}));
    }
    var res = [], settle = 0;
    for (i = 0; i < n; i++) {
      var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
      var at = 0.15 + 0.35 * i, p = r.layer.transform.position.value; animate(r.layer.transform.position, at, at + 0.45, [p[0], p[1] + 60], [p[0], p[1]], theme.easing); animate(r.layer.transform.opacity, at, at + 0.45, 0, 100, theme.easing); res.push(r); settle = at + 0.45;
      if (scene.emphasis) { var joined = scene.lines[i], ei = emphasisIndex(joined, scene.emphasis); if (ei >= 0) { var markerEnd = markEmphasis(comp, theme, r, {emphasis:scene.emphasis, text:joined, bg:scene.bg}, settle); settle = Math.max(settle, markerEnd); } }
    }
    return settle;
  },
  quote: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene), q = text(comp, '“', {font:theme.fonts.display, size:300, min:300, color:theme.colors.accent, align:'center', x:CX, y:270, maxW:850, maxH:340, name:'quote-mark'}); q.layer.comment = 'decor';
    if (layout === 'rule') {
      var res = text(comp, scene.text, {font:theme.fonts.quote || theme.fonts.display, size:96, min:56, color:ink, align:'left', x:SAFE.x0 + 60, y:600, maxW:740, maxH:550, name:'text'});
      var rule = rect(comp, {x:SAFE.x0 + 20, y:res.y + res.h / 2, w:6, h:res.h, fill:theme.colors.accent, origin:'center', comment:'decor', name:'quote-rule'});
      animate(rule.transform.scale, 0.15, 0.7, [100,0], [100,100], theme.easing);
      if (scene.source) { var sY2 = res.y + res.h + 30; text(comp, '— ' + scene.source, {font:theme.fonts.label, size:36, min:36, color:motif(theme, 'slab') ? theme.colors.muted : ink, align:'left', x:SAFE.x0 + 60, y:sY2, maxW:740, maxH:80, name:'source'}); }
      revealText(res.layer, 0.15, 0.9, theme.easing); var m = markEmphasis(comp, theme, res, scene, 1.05); return Math.max(1.05, m);
    }
    if (layout === 'card') {
      var res = text(comp, scene.text, {font:theme.fonts.quote || theme.fonts.display, size:84, min:56, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'left', x:SAFE.x0 + 80, y:600, maxW:820 - 160, maxH:550, name:'text'});
      var card = rect(comp, {x:CX, y:res.y + res.h / 2, w:res.w + 80, h:res.h + 80, fill:motif(theme, 'slab') ? theme.colors.ink : theme.colors.base, radius:24, origin:'center', comment:'decor', name:'quote-card'});
      card.moveAfter(res.layer);
      card.transform.opacity.setValueAtTime(0, motif(theme, 'slab') ? 100 : 10); animate(card.transform.opacity, 0.15, 0.75, motif(theme, 'slab') ? 0 : 0, motif(theme, 'slab') ? 100 : 10, theme.easing);
      if (scene.source) { var scY = res.y + res.h + 30; text(comp, '— ' + scene.source, {font:theme.fonts.label, size:36, min:36, color:motif(theme, 'slab') ? theme.colors.muted : ink, align:'center', x:CX, y:scY, maxW:740, maxH:80, name:'source'}); }
      revealText(res.layer, 0.15, 0.9, theme.easing); var m = markEmphasis(comp, theme, res, scene, 1.05); return Math.max(1.05, m);
    }
    var res = text(comp, scene.text, {font:theme.fonts.quote || theme.fonts.display, size:96, min:56, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:600, maxW:820, maxH:550, name:'text'});
    slab(comp, theme, res.y, res.h, dur);
    if (scene.source) { var sourceY = res.y + res.h + (motif(theme, 'slab') ? 80 : 30), sourceColor = motif(theme, 'slab') ? theme.colors.muted : ink; text(comp, '— ' + scene.source, {font:theme.fonts.label, size:36, min:36, color:sourceColor, align:'center', x:CX, y:sourceY, maxW:820, maxH:80, name:'source'}); }
    revealText(res.layer, 0.15, 0.9, theme.easing); var markerEnd = markEmphasis(comp, theme, res, scene, 1.05); return Math.max(1.05, markerEnd);
  },
  stat: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene), finalValue = (scene.prefix || '') + fmtID(scene.value) + (scene.suffix || '');
    if (layout === 'ring') {
      var rtrack = ring(comp, {cx:CX,cy:820,d:560,strokeW:40,color:theme.colors.data,name:'ring-track'});
      rtrack.layer.transform.opacity.setValue(30);
      var rprog = ring(comp, {cx:CX,cy:820,d:560,strokeW:40,color:scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent,name:'ring-arc'});
      rprog.trim.property('Start').setValue(0); animate(rprog.trim.property('End'), 0.2, 1.4, 0, scene.value, theme.easing);
      var v = text(comp, finalValue, {font:theme.fonts.display, size:150, min:96, color:ink, align:'center', x:CX, y:820, maxW:400, maxH:220, name:'value'});
      v.layer.property('Source Text').expression = counterExpr(0.2,1.4,scene.value,scene.prefix || '',scene.suffix || '',scene.from);
      animate(v.layer.opacity,0.2,0.6,0,100,theme.easing); animate(v.layer.transform.scale,0.2,0.6,[0,0],[100,100],theme.easing);
      if (scene.label) text(comp, scene.label, {font:theme.fonts.body, size:48, min:36, color:ink, align:'center', x:CX, y:1190, maxW:850, maxH:140, name:'label'});
      return 1.4;
    }
    if (layout === 'left') {
      var svSize = 260, svX = SAFE.x0, svY = 820, svAlign = 'left', slX = SAFE.x0, slAlign = 'left';
      var svh = svSize; while (svh > 72 && measure(finalValue, theme.fonts.display, svh) > 850) svh = Math.max(72, Math.floor(svh * 0.94));
      var sv = text(comp, finalValue, {font:theme.fonts.display, size:svh, min:svh, color:ink, align:svAlign, x:svX, y:svY, maxW:1e6, maxH:400, name:'value'});
      sv.layer.property('Source Text').expression = counterExpr(0.2, 1.4, scene.value, scene.prefix || '', scene.suffix || '', scene.from);
      animate(sv.layer.transform.scale, 0.2, 0.65, [70,70], [100,100], theme.easing);
      var label = scene.label ? text(comp, scene.label, {font:theme.fonts.body, size:56, min:48, color:ink, align:slAlign, x:slX, y:sv.y + sv.h + 40, maxW:850, maxH:150, name:'label'}) : null;
      if (motif(theme, 'hardShadow')) shadow(sv.layer, theme.colors.ink, 100, 135, 9, 0);
      if (motif(theme, 'softShadow')) shadow(sv.layer, '#2b2a28', 16, 135, 7, 12);
      animate(sv.layer.opacity, 0.2, 0.65, 0, 100, theme.easing); if (label) animate(label.layer.opacity, 0.25, 0.65, 0, 100, theme.easing);
      return 1.4;
    }
    if (layout === 'split') {
      var svSize = 300, svX = CX, svY = 700, svAlign = 'center', slX = CX, slAlign = 'center';
      var rule = rect(comp, {x:CX, y:980, w:850, h:4, fill:theme.colors.muted || theme.colors.accent, origin:'center', comment:'decor', name:'stat-rule'});
      animate(rule.transform.scale, 0.2, 0.7, [0,100], [100,100], theme.easing);
      var svh = svSize; while (svh > 72 && measure(finalValue, theme.fonts.display, svh) > 850) svh = Math.max(72, Math.floor(svh * 0.94));
      var sv = text(comp, finalValue, {font:theme.fonts.display, size:svh, min:svh, color:ink, align:svAlign, x:svX, y:svY, maxW:1e6, maxH:400, name:'value'});
      sv.layer.property('Source Text').expression = counterExpr(0.2, 1.4, scene.value, scene.prefix || '', scene.suffix || '', scene.from);
      animate(sv.layer.transform.scale, 0.2, 0.65, [70,70], [100,100], theme.easing);
      var label = scene.label ? text(comp, scene.label, {font:theme.fonts.body, size:56, min:48, color:ink, align:'center', x:CX, y:1050, maxW:850, maxH:150, name:'label'}) : null;
      if (motif(theme, 'hardShadow')) shadow(sv.layer, theme.colors.ink, 100, 135, 9, 0);
      if (motif(theme, 'softShadow')) shadow(sv.layer, '#2b2a28', 16, 135, 7, 12);
      animate(sv.layer.opacity, 0.2, 0.65, 0, 100, theme.easing); if (label) animate(label.layer.opacity, 0.25, 0.65, 0, 100, theme.easing);
      return 1.4;
    }
    var svSize = 300, svX = CX, svY = 820, svAlign = 'center', slX = CX, slAlign = 'center';
    var svh = svSize; while (svh > 72 && measure(finalValue, theme.fonts.display, svh) > 850) svh = Math.max(72, Math.floor(svh * 0.94));
    var sv = text(comp, finalValue, {font:theme.fonts.display, size:svh, min:svh, color:ink, align:svAlign, x:svX, y:svY, maxW:1e6, maxH:400, name:'value'});
    sv.layer.property('Source Text').expression = counterExpr(0.2, 1.4, scene.value, scene.prefix || '', scene.suffix || '', scene.from);
    animate(sv.layer.transform.scale, 0.2, 0.65, [70,70], [100,100], theme.easing);
    var label = scene.label ? text(comp, scene.label, {font:theme.fonts.body, size:56, min:48, color:ink, align:'center', x:CX, y:sv.y + sv.h + 40, maxW:850, maxH:150, name:'label'}) : null;
    if (motif(theme, 'hardShadow')) shadow(sv.layer, theme.colors.ink, 100, 135, 9, 0);
    if (motif(theme, 'softShadow')) shadow(sv.layer, '#2b2a28', 16, 135, 7, 12);
    animate(sv.layer.opacity, 0.2, 0.65, 0, 100, theme.easing); if (label) animate(label.layer.opacity, 0.25, 0.65, 0, 100, theme.easing);
    return 1.4;
  },
  bars: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene), top = contentTop(comp, theme, scene) + 30, base = 1250, maxH = Math.min(650, base - top), n = scene.items.length, gap = 36, strokeW = motif(theme, 'thin') ? 3 : 6, inset = (motif(theme, 'outline') || motif(theme, 'thin')) ? 26 : 0, chartW = 850 - inset, w = (chartW - gap * (n - 1)) / n, max = Math.max.apply(null, scene.items.map(function (it) { return it.value; })), settle = 0;
    if (layout === 'horizontal') {
      var rowH = (1250 - top) / n, hMax = 850 - 220 - 120 - 16;
      scene.items.forEach(function (it, i) {
        var ry = top + rowH * i + rowH / 2, at = 0.3 + 0.07 * i, end = at + 0.5;
        var fill = i === scene.highlight ? (scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent) : theme.colors.data;
        var bw = it.value / max * hMax;
        text(comp, it.label, {font:theme.fonts.label, size:40, min:36, color:ink, align:'left', x:SAFE.x0, y:ry, maxW:200, maxH:60, name:'bar-label'});
        if (bw > 0) {
          var bar = rect(comp, {x:SAFE.x0 + 220 + bw / 2, y:ry, w:bw, h:Math.min(56, rowH - 24), fill:fill, radius:motif(theme, 'square') ? 0 : 8, origin:'center', name:'bar'});
          animate(bar.transform.scale, at, end, [0,100], [100,100], theme.easing);
        }
        var hv = text(comp, fmtID(it.value), {font:theme.fonts.body, size:44, min:36, color:ink, align:'left', x:SAFE.x0 + 220 + bw + 16, y:ry, maxW:120, maxH:60, name:'bar-value'});
        animate(hv.layer.opacity, end, end + 0.2, 0, 100, theme.easing);
        settle = Math.max(settle, end + 0.2);
      });
      return settle;
    }
    if (layout === 'lollipop') {
      var loW = chartW - gap * (n - 1);
      scene.items.forEach(function (it, i) {
        var center = CX - loW / 2 + loW / (2 * n) + i * (loW / n), h = it.value / max * maxH, at = 0.3 + 0.07 * i, end = at + 0.5;
        var fill = i === scene.highlight ? (scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent) : theme.colors.data;
        if (h > 0) {
          var stem = rect(comp, {x:center, y:base - h / 2, w:6, h:h, fill:fill, origin:'center', name:'bar-stem'});
          animate(stem.transform.scale, at, end, [100,0], [100,100], theme.easing);
        }
        var dot = ellipse(comp, {cx:center, cy:base - h, d:28, fill:fill, name:'bar-dot'});
        animate(dot.transform.scale, end, end + 0.25, [70,70], [100,100], theme.easing);
        var lv = text(comp, fmtID(it.value), {font:theme.fonts.body, size:44, min:36, color:ink, align:'center', x:center, y:base - h - 40, maxW:w + 30, maxH:60, name:'bar-value'});
        animate(lv.layer.opacity, end, end + 0.2, 0, 100, theme.easing);
        text(comp, it.label, {font:theme.fonts.label, size:40, min:36, color:ink, align:'center', x:center, y:1270, maxW:w + 30, maxH:90, name:'bar-label'});
        settle = Math.max(settle, end + 0.25);
      });
      return settle;
    }
    if (layout === 'race') {
      var hi = scene.items.reduce(function (best, it, i) { return it.value > scene.items[best].value ? i : best; }, 0);
      scene.items.forEach(function (it, i) {
        var center = CX - chartW / 2 + w / 2 + i * (w + gap), h = it.value / max * maxH, at = 0.3 + 0.07 * i, end = at + 0.5;
        var fill = i === scene.highlight ? (scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent) : theme.colors.data;
        if (h > 0) {
          var bar = rect(comp, {x:center, y:base, w:w, h:h, fill:fill, radius:motif(theme, 'square') ? 0 : 10, origin:'bottom', name:'bar'});
          animate(bar.transform.scale, at, end, [100,0], [100,100], theme.easing);
          if (i === hi) { addGlow(comp, theme, center, base - h, dur); }
        }
        var rv = text(comp, fmtID(it.value), {font:theme.fonts.body, size:44, min:36, color:ink, align:'center', x:center, y:base - h - 12 - 54, maxW:w + 20, maxH:60, name:'bar-value'});
        rv.layer.property('Source Text').expression = counterExpr(at, end, it.value, '', '');
        animate(rv.layer.opacity, end, end + 0.2, 0, 100, theme.easing);
        text(comp, it.label, {font:theme.fonts.label, size:40, min:36, color:ink, align:'center', x:center, y:1270, maxW:w + 30, maxH:90, name:'bar-label'});
        settle = Math.max(settle, end + 0.2);
      });
      return settle;
    }
    scene.items.forEach(function (it, i) {
      var center = CX - chartW / 2 + w / 2 + i * (w + gap), h = it.value / max * maxH, at = 0.3 + 0.07 * i, end = at + 0.5;
      var fill = i === scene.highlight ? (scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent) : theme.colors.data;
      var outline = motif(theme, 'outline'), thin = motif(theme, 'thin') && i !== scene.highlight;
      if (h > 0) {
        var bar = rect(comp, {x:center,y:base,w:w,h:h,fill:thin ? null : fill,stroke:outline || thin ? theme.colors.ink : null,strokeW:thin ? 3 : strokeW,radius:motif(theme, 'square') ? 0 : 10,origin:'bottom',name:'bar'});
        animate(bar.transform.scale, at, end, [100,0], [100,100], theme.easing);
        if (motif(theme, 'hardShadow')) shadow(bar, theme.colors.ink, 100, 135, 9, 0);
        if (motif(theme, 'softShadow')) shadow(bar, '#2b2a28', 16, 135, 7, 12);
      }
      var val = text(comp, fmtID(it.value), {font:theme.fonts.body,size:44,min:36,color:ink,align:'center',x:center,y:base-h-12-54,maxW:w+20,maxH:60,name:'bar-value'});
      animate(val.layer.opacity, end, end + 0.2, 0, 100, theme.easing);
      text(comp, it.label, {font:theme.fonts.label,size:40,min:36,color:ink,align:'center',x:center,y:1270,maxW:w+30,maxH:90,name:'bar-label'});
      settle = end + 0.2;
    });
    return settle;
  },
  donut: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene);
    if (layout === 'ring') {
      var track = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:theme.colors.data,name:'donut-track'}), progress = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent,name:'donut-progress'});
      track.layer.transform.opacity.setValue(30);
      progress.trim.property('Start').setValue(0); animate(progress.trim.property('End'), 0.2, 1.4, 0, scene.value, theme.easing);
      var v = text(comp, String(scene.value) + '%', {font:theme.fonts.display,size:150,min:96,color:ink,align:'center',x:CX,y:820,maxW:500,maxH:220,name:'value'});
      v.layer.property('Source Text').expression = counterExpr(0.2,1.4,scene.value,'','%');
      animate(v.layer.opacity,0.2,0.6,0,100,theme.easing); animate(v.layer.transform.scale,0.2,0.6,[0,0],[100,100],theme.easing);
      if (scene.label) { text(comp, scene.label, {font:theme.fonts.body,size:48,min:36,color:ink,align:'center',x:CX,y:1190,maxW:850,maxH:140,name:'label'}); }
      return 1.4;
    }
    if (layout === 'gauge') {
      var track = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:theme.colors.data,name:'donut-track'});
      track.layer.transform.opacity.setValue(30);
      var prog = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent,name:'donut-progress'});
      prog.trim.property('Start').setValue(180); animate(prog.trim.property('End'), 0.2, 1.4, 180, 180 + scene.value * 1.8, theme.easing);
      var v = text(comp, fmtID(scene.value), {font:theme.fonts.display,size:150,min:96,color:ink,align:'center',x:CX,y:1050,maxW:400,maxH:220,name:'value'});
      animate(v.layer.opacity,0.2,0.6,0,100,theme.easing); animate(v.layer.transform.scale,0.2,0.6,[0,0],[100,100],theme.easing);
      return 1.4;
    }
    if (layout === 'multi') {
      ring(comp, {cx:CX,cy:820,d:560,strokeW:40,color:theme.colors.accent,name:'donut-outer'});
      ring(comp, {cx:CX,cy:820,d:340,strokeW:40,color:scene.second || theme.colors.data,name:'donut-inner'});
      var v = text(comp, fmtID(scene.value), {font:theme.fonts.display,size:150,min:96,color:ink,align:'center',x:CX,y:820,maxW:400,maxH:220,name:'value'});
      animate(v.layer.opacity,0.2,0.6,0,100,theme.easing); animate(v.layer.transform.scale,0.2,0.6,[0,0],[100,100],theme.easing);
      if (scene.label) text(comp, scene.label, {font:theme.fonts.body,size:48,min:36,color:ink,align:'center',x:CX,y:1190,maxW:850,maxH:140,name:'label'});
      return 1.4;
    }
    var track = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:theme.colors.data,name:'donut-track'}), progress = ring(comp, {cx:CX,cy:820,d:560,strokeW:56,color:scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent,name:'donut-progress'});
    track.layer.transform.opacity.setValue(30);
    progress.trim.property('Start').setValue(0); animate(progress.trim.property('End'), 0.2, 1.4, 0, scene.value, theme.easing);
    var v = text(comp, String(scene.value) + '%', {font:theme.fonts.display,size:150,min:96,color:ink,align:'center',x:CX,y:820,maxW:500,maxH:220,name:'value'});
    v.layer.property('Source Text').expression = counterExpr(0.2,1.4,scene.value,'','%');
    animate(v.layer.opacity,0.2,0.6,0,100,theme.easing); animate(v.layer.transform.scale,0.2,0.6,[0,0],[100,100],theme.easing);
    if (scene.label) { text(comp, scene.label, {font:theme.fonts.body,size:48,min:36,color:ink,align:'center',x:CX,y:1190,maxW:850,maxH:140,name:'label'}); }
    return 1.4;
  },
  steps: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene), top = contentTop(comp, theme, scene), n = scene.items.length;
    var rowH = Math.min(200, (1400 - top) / n), settle = 0;
    if (layout === 'list') {
      scene.items.forEach(function (item, i) {
        var center = top + rowH * i + rowH / 2, at = 0.3 + 0.07 * i, end = at + 0.45;
        var badge, filled = !motif(theme, 'thin'), outline = motif(theme, 'outline');
        if (motif(theme, 'slab')) {
          badge = null;
          var bar = rect(comp, {x:515,y:center,w:850,h:rowH - 24,fill:theme.colors.ink,radius:0,origin:'center',name:'step-bar'});
          animate(bar.transform.position, at, end, [bar.transform.position.value[0] - 60, bar.transform.position.value[1]], [515, center], theme.easing);
          animate(bar.transform.opacity, at, end, 0, 100, theme.easing);
          if (motif(theme, 'hardShadow')) shadow(bar, theme.colors.ink, 100, 135, 9, 0);
          if (motif(theme, 'softShadow')) shadow(bar, '#2b2a28', 16, 135, 7, 12);
          var sn = text(comp, String(i + 1), {font:theme.fonts.display,size:52,min:52,color:theme.colors.accent,align:'center',x:SAFE.x0 + 56,y:center - 29,maxW:96,maxH:70,name:'step-number'});
          animate(sn.layer.opacity, at, end, 0, 100, theme.easing);
          animate(sn.layer.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
        } else {
          var bx = SAFE.x0 + 56, by = center;
          if (motif(theme, 'tag')) {
            badge = rect(comp, {x:bx,y:by,w:96,h:96,fill:theme.colors.accent,radius:0,origin:'center',name:'step-badge'});
            badge.transform.rotation.setValue(-4);
            var pin = ellipse(comp, {cx:bx,cy:by - 48,d:14,fill:theme.colors.ink,name:'step-pin'});
            animate(pin.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
          } else if (motif(theme, 'square')) {
            badge = rect(comp, {x:bx,y:by,w:96,h:96,fill:filled ? theme.colors.accent : null,stroke:filled && !outline ? null : theme.colors.ink,strokeW:motif(theme, 'thin') ? 3 : 4,radius:0,origin:'center',name:'step-badge'});
          } else {
            badge = ellipse(comp, {cx:bx,cy:by,d:96,fill:filled ? theme.colors.accent : null,stroke:(!filled || outline) ? theme.colors.ink : null,strokeW:motif(theme, 'thin') ? 3 : 4,name:'step-badge'});
          }
          if (badge) {
            animate(badge.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
            if (motif(theme, 'hardShadow')) shadow(badge, theme.colors.ink, 100, 135, 9, 0);
            if (motif(theme, 'softShadow')) shadow(badge, '#2b2a28', 16, 135, 7, 12);
          }
          var numColor = filled ? onColor(theme, theme.colors.accent) : ink;
          var num = text(comp, String(i + 1), {font:theme.fonts.display,size:52,min:52,color:numColor,align:'center',x:bx,y:center - 29,maxW:96,maxH:70,name:'step-number'});
          animate(num.layer.opacity, at, end, 0, 100, theme.easing);
          animate(num.layer.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
        }
        var itemColor = motif(theme, 'slab') ? theme.colors.base : ink;
        var itemRes = text(comp, item, {font:theme.fonts.body,size:60,min:48,color:itemColor,x:SAFE.x0 + 140,y:center,maxW:710,maxH:rowH - 24,name:'step-item'});
        var itemPos = itemRes.layer.transform.position.value;
        itemRes.layer.transform.position.setValue([itemPos[0], center - itemRes.h / 2]);
        itemRes.y = center - itemRes.h / 2;
        animate(itemRes.layer.transform.position, at, end, [itemPos[0] - 60, itemRes.y], [itemPos[0], itemRes.y], theme.easing);
        animate(itemRes.layer.transform.opacity, at, end, 0, 100, theme.easing);
        settle = Math.max(settle, end, at + 0.35);
      });
      return settle;
    }
    if (layout === 'timeline') {
      rect(comp, {x:SAFE.x0 + 56, y:top, w:4, h:(1400 - top), fill:theme.colors.accent, origin:'top', comment:'decor', name:'step-timeline'});
      scene.items.forEach(function (item, i) {
        var cy = top + rowH * i + rowH / 2, at = 0.3 + 0.07 * i, end = at + 0.45;
        var dot = ellipse(comp, {cx:SAFE.x0 + 56, cy:cy, d:24, fill:theme.colors.accent, name:'step-dot'});
        animate(dot.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
        var txt = text(comp, item, {font:theme.fonts.body,size:60,min:48,color:ink,x:SAFE.x0 + 140,y:cy,maxW:710,maxH:rowH - 24,name:'step-item'});
        animate(txt.layer.transform.position, at, end, [txt.layer.transform.position.value[0] - 60, txt.layer.transform.position.value[1]], [txt.layer.transform.position.value[0], txt.layer.transform.position.value[1]], theme.easing);
        animate(txt.layer.transform.opacity, at, end, 0, 100, theme.easing);
        settle = Math.max(settle, end, at + 0.35);
      });
      return settle;
    }
    if (layout === 'cards') {
      scene.items.forEach(function (item, i) {
        var at = 0.3 + 0.07 * i, end = at + 0.45, cy = top + rowH * i + rowH / 2;
        var card = rect(comp, {x:CX, y:cy, w:850, h:rowH - 24, fill:theme.colors.ink, radius:12, origin:'center', comment:'decor', name:'step-card'});
        animate(card.transform.scale, at, end, [90,90], [100,100], theme.easing);
        var txt = text(comp, item, {font:theme.fonts.body,size:60,min:48,color:theme.colors.base,x:SAFE.x0 + 40, y:cy, maxW:770, maxH:rowH - 24, name:'step-item'});
        var tx = txt.layer.transform.position.value[0], ty = cy - txt.h / 2;
        txt.layer.transform.position.setValue([tx, ty]);
        txt.y = ty;
        animate(txt.layer.transform.position, at, end, [tx - 60, ty], [tx, ty], theme.easing);
        animate(txt.layer.transform.opacity, at, end, 0, 100, theme.easing);
        settle = Math.max(settle, end, at + 0.35);
      });
      return settle;
    }
    var rowH = Math.min(200, (1400 - top) / n), settle = 0;
    scene.items.forEach(function (item, i) {
      var center = top + rowH * i + rowH / 2, at = 0.3 + 0.07 * i, end = at + 0.45;
      var badge, filled = !motif(theme, 'thin'), outline = motif(theme, 'outline');
      if (motif(theme, 'slab')) {
        badge = null;
        var bar = rect(comp, {x:515,y:center,w:850,h:rowH - 24,fill:theme.colors.ink,radius:0,origin:'center',name:'step-bar'});
        animate(bar.transform.position, at, end, [bar.transform.position.value[0] - 60, bar.transform.position.value[1]], [515, center], theme.easing);
        animate(bar.transform.opacity, at, end, 0, 100, theme.easing);
        if (motif(theme, 'hardShadow')) shadow(bar, theme.colors.ink, 100, 135, 9, 0);
        if (motif(theme, 'softShadow')) shadow(bar, '#2b2a28', 16, 135, 7, 12);
        var sn = text(comp, String(i + 1), {font:theme.fonts.display,size:52,min:52,color:theme.colors.accent,align:'center',x:SAFE.x0 + 56,y:center - 29,maxW:96,maxH:70,name:'step-number'});
        animate(sn.layer.opacity, at, end, 0, 100, theme.easing);
        animate(sn.layer.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
      } else {
        var bx = SAFE.x0 + 56, by = center;
        if (motif(theme, 'tag')) {
          badge = rect(comp, {x:bx,y:by,w:96,h:96,fill:theme.colors.accent,radius:0,origin:'center',name:'step-badge'});
          badge.transform.rotation.setValue(-4);
          var pin = ellipse(comp, {cx:bx,cy:by - 48,d:14,fill:theme.colors.ink,name:'step-pin'});
          animate(pin.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
        } else if (motif(theme, 'square')) {
          badge = rect(comp, {x:bx,y:by,w:96,h:96,fill:filled ? theme.colors.accent : null,stroke:filled && !outline ? null : theme.colors.ink,strokeW:motif(theme, 'thin') ? 3 : 4,radius:0,origin:'center',name:'step-badge'});
        } else {
          badge = ellipse(comp, {cx:bx,cy:by,d:96,fill:filled ? theme.colors.accent : null,stroke:(!filled || outline) ? theme.colors.ink : null,strokeW:motif(theme, 'thin') ? 3 : 4,name:'step-badge'});
        }
        if (badge) {
          animate(badge.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
          if (motif(theme, 'hardShadow')) shadow(badge, theme.colors.ink, 100, 135, 9, 0);
          if (motif(theme, 'softShadow')) shadow(badge, '#2b2a28', 16, 135, 7, 12);
        }
        var numColor = filled ? onColor(theme, theme.colors.accent) : ink;
        var num = text(comp, String(i + 1), {font:theme.fonts.display,size:52,min:52,color:numColor,align:'center',x:bx,y:center - 29,maxW:96,maxH:70,name:'step-number'});
        animate(num.layer.opacity, at, end, 0, 100, theme.easing);
        animate(num.layer.transform.scale, at, at + 0.35, [70,70], [100,100], theme.easing);
      }
      var itemColor = motif(theme, 'slab') ? theme.colors.base : ink;
      var itemRes = text(comp, item, {font:theme.fonts.body,size:60,min:48,color:itemColor,x:SAFE.x0 + 140,y:center,maxW:710,maxH:rowH - 24,name:'step-item'});
      var itemPos = itemRes.layer.transform.position.value;
      itemRes.layer.transform.position.setValue([itemPos[0], center - itemRes.h / 2]);
      itemRes.y = center - itemRes.h / 2;
      animate(itemRes.layer.transform.position, at, end, [itemPos[0] - 60, itemRes.y], [itemPos[0], itemRes.y], theme.easing);
      animate(itemRes.layer.transform.opacity, at, end, 0, 100, theme.easing);
      settle = Math.max(settle, end, at + 0.35);
    });
    return settle;
  },
  compare: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene), fill = scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent;
    if (layout === 'stack') {
      var cardW = (SAFE.x1 - SAFE.x0) - 26, cardX = CX;
      var cards = [{data:scene.left, top:300, from:-120}, {data:scene.right, top:880, from:120}], settle = 0;
      cards.forEach(function (cardInfo, ci) {
        var cardTop = cardInfo.top, cardBottom = cardTop + 520, at = ci ? 0.45 : 0.2, cardEnd = at + 0.45;
        var card = rect(comp, {x:cardX,y:cardTop + 260,w:cardW,h:520,fill:ci ? fill : null,stroke:ci ? null : ink,strokeW:4,radius:motif(theme, 'square') ? 0 : 18,origin:'center',name:ci ? 'right-card' : 'left-card'});
        if (motif(theme, 'hardShadow')) shadow(card, theme.colors.ink, 100, 135, 9, 0);
        if (motif(theme, 'softShadow')) shadow(card, '#2b2a28', 16, 135, 7, 12);
        var cardPos = card.transform.position.value;
        animate(card.transform.position, at, cardEnd, [cardPos[0] + cardInfo.from, cardPos[1]], [cardPos[0], cardPos[1]], theme.easing);
        animate(card.transform.opacity, at, cardEnd, 0, 100, theme.easing);
        var titleRes = text(comp, cardInfo.data.title, {font:theme.fonts.display,size:72,min:56,color:ci ? onColor(theme, fill) : ink,x:SAFE.x0 + 40,y:cardTop + 40,maxW:770,maxH:180,name:ci ? 'right-title' : 'left-title'});
        var titlePos = titleRes.layer.transform.position.value;
        animate(titleRes.layer.transform.position, at, cardEnd, [titlePos[0] + cardInfo.from, titlePos[1]], [titlePos[0], titlePos[1]], theme.easing);
        animate(titleRes.layer.opacity, at, cardEnd, 0, 100, theme.easing);
        var pointColor = ci ? onColor(theme, fill) : ink, pointY = titleRes.y + titleRes.h + 16;
        cardInfo.data.points.forEach(function (point, pi) {
          var p = text(comp, '• ' + point, {font:theme.fonts.body,size:52,min:48,color:pointColor,x:SAFE.x0 + 40,y:pointY,maxW:770,maxH:cardBottom - pointY - 40,name:(ci ? 'right-point-' : 'left-point-') + (pi + 1)});
          var pp = p.layer.transform.position.value, pointAt = cardEnd + 0.07 * pi, pointEnd = pointAt + 0.3;
          animate(p.layer.transform.position, at, cardEnd, [pp[0] + cardInfo.from, pp[1]], [pp[0], pp[1]], theme.easing);
          p.layer.opacity.setValueAtTime(at, 0); p.layer.opacity.setValueAtTime(pointAt, 0); p.layer.opacity.setValueAtTime(pointEnd, 100);
          pointY += p.h + 16; settle = Math.max(settle, pointEnd);
        });
        settle = Math.max(settle, cardEnd);
      });
      var vs = ellipse(comp, {cx:CX,cy:850,d:120,fill:ink,name:'vs-badge'});
      var vsText = text(comp, 'VS', {font:theme.fonts.display,size:44,min:44,color:theme.colors[scene.bg || 'base'],align:'center',x:CX,y:826,maxW:120,maxH:70,name:'vs-text'});
      animate(vs.transform.scale, 0.7, 1.05, [70,70], [100,100], theme.easing); animate(vs.transform.opacity, 0.7, 1.05, 0, 100, theme.easing);
      animate(vsText.layer.transform.scale, 0.7, 1.05, [70,70], [100,100], theme.easing); animate(vsText.layer.opacity, 0.7, 1.05, 0, 100, theme.easing);
      return Math.max(settle, 1.05);
    }
    if (layout === 'split') {
      var left = {title:scene.left.title, points:scene.left.points}, right = {title:scene.right.title, points:scene.right.points};
      var cw = 400, lw = SAFE.x0, rw = SAFE.x1 - cw, settle = 0;
      var nPts = Math.max(left.points.length, right.points.length);
      var blockH = 180 + nPts * 132;
      var y0 = SAFE.y0 + Math.max(0, (SAFE.y1 - SAFE.y0 - blockH) / 2);
      // Both columns are left-aligned with the check outside the text: text() anchors at the
      // box centre, so a right-aligned column put the check on top of its own words.
      var renderColumn = function (col, x, dir, side) {
        var y = y0;
        var title = text(comp, col.title, {font:theme.fonts.display,size:72,min:56,color:ink,align:'left',x:x,y:y,maxW:cw - 40,maxH:180,name:side+'-title'});
        var tp = title.layer.transform.position.value;
        animate(title.layer.transform.position, 0.2, 0.6, [tp[0] + dir*60, tp[1]], [tp[0], tp[1]], theme.easing);
        animate(title.layer.opacity, 0.2, 0.6, 0, 100, theme.easing);
        y += 180;
        col.points.forEach(function (pt, pi) {
          var at = 0.45 + pi * 0.15, end = at + 0.35;
          var sym = text(comp, '✓', {font:theme.fonts.body,size:52,min:48,color:ink,align:'left',x:x,y:y,maxW:cw - 40,maxH:80,name:side+'-sym-'+(pi+1)});
          var sp = sym.layer.transform.position.value;
          animate(sym.layer.transform.position, at, end, [sp[0] + dir*40, sp[1]], [sp[0], sp[1]], theme.easing);
          animate(sym.layer.opacity, at, end, 0, 100, theme.easing);
          var txt = text(comp, pt, {font:theme.fonts.body,size:52,min:48,color:ink,align:'left',x:x + 60,y:y,maxW:cw - 120, maxH:160,name:side+'-point-'+(pi+1)});
          var xp = txt.layer.transform.position.value;
          animate(txt.layer.transform.position, at, end, [xp[0] + dir*40, xp[1]], [xp[0], xp[1]], theme.easing);
          animate(txt.layer.opacity, at, end, 0, 100, theme.easing);
          y += Math.max(sym.h, txt.h) + 16; settle = Math.max(settle, end);
        });
      };
      renderColumn(left, lw, -1, 'left');
      renderColumn(right, rw, 1, 'right');
      return Math.max(settle, 1.0);
    }
    var cardW = (SAFE.x1 - SAFE.x0) - 26, cardX = CX;
    var cards = [{data:scene.left, top:300, from:-120}, {data:scene.right, top:880, from:120}], settle = 0;
    cards.forEach(function (cardInfo, ci) {
      var cardTop = cardInfo.top, cardBottom = cardTop + 520, at = ci ? 0.45 : 0.2, cardEnd = at + 0.45;
      var card = rect(comp, {x:cardX,y:cardTop + 260,w:cardW,h:520,fill:ci ? fill : null,stroke:ci ? null : ink,strokeW:4,radius:motif(theme, 'square') ? 0 : 18,origin:'center',name:ci ? 'right-card' : 'left-card'});
      if (motif(theme, 'hardShadow')) shadow(card, theme.colors.ink, 100, 135, 9, 0);
      if (motif(theme, 'softShadow')) shadow(card, '#2b2a28', 16, 135, 7, 12);
      var cardPos = card.transform.position.value;
      animate(card.transform.position, at, cardEnd, [cardPos[0] + cardInfo.from, cardPos[1]], [cardPos[0], cardPos[1]], theme.easing);
      animate(card.transform.opacity, at, cardEnd, 0, 100, theme.easing);
      var titleRes = text(comp, cardInfo.data.title, {font:theme.fonts.display,size:72,min:56,color:ci ? onColor(theme, fill) : ink,x:SAFE.x0 + 40,y:cardTop + 40,maxW:770,maxH:180,name:ci ? 'right-title' : 'left-title'});
      var titlePos = titleRes.layer.transform.position.value;
      animate(titleRes.layer.transform.position, at, cardEnd, [titlePos[0] + cardInfo.from, titlePos[1]], [titlePos[0], titlePos[1]], theme.easing);
      animate(titleRes.layer.opacity, at, cardEnd, 0, 100, theme.easing);
      var pointColor = ci ? onColor(theme, fill) : ink, pointY = titleRes.y + titleRes.h + 16;
      cardInfo.data.points.forEach(function (point, pi) {
        var p = text(comp, '• ' + point, {font:theme.fonts.body,size:52,min:48,color:pointColor,x:SAFE.x0 + 40,y:pointY,maxW:770,maxH:cardBottom - pointY - 40,name:(ci ? 'right-point-' : 'left-point-') + (pi + 1)});
        var pp = p.layer.transform.position.value, pointAt = cardEnd + 0.07 * pi, pointEnd = pointAt + 0.3;
        animate(p.layer.transform.position, at, cardEnd, [pp[0] + cardInfo.from, pp[1]], [pp[0], pp[1]], theme.easing);
        p.layer.opacity.setValueAtTime(at, 0); p.layer.opacity.setValueAtTime(pointAt, 0); p.layer.opacity.setValueAtTime(pointEnd, 100);
        pointY += p.h + 16; settle = Math.max(settle, pointEnd);
      });
      settle = Math.max(settle, cardEnd);
    });
    var vs = ellipse(comp, {cx:CX,cy:850,d:120,fill:ink,name:'vs-badge'});
    var vsText = text(comp, 'VS', {font:theme.fonts.display,size:44,min:44,color:theme.colors[scene.bg || 'base'],align:'center',x:CX,y:826,maxW:120,maxH:70,name:'vs-text'});
    animate(vs.transform.scale, 0.7, 1.05, [70,70], [100,100], theme.easing); animate(vs.transform.opacity, 0.7, 1.05, 0, 100, theme.easing);
    animate(vsText.layer.transform.scale, 0.7, 1.05, [70,70], [100,100], theme.easing); animate(vsText.layer.opacity, 0.7, 1.05, 0, 100, theme.easing);
    return Math.max(settle, 1.05);
  },
  outro: function (comp, theme, scene, dur) {
    var layout = sceneLayout(theme, scene);
    var ink = textColor(theme, scene);
    if (layout === 'center') {
      var res = text(comp, scene.text, {font:theme.fonts.display, size:120, min:64, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:700, maxW:850, maxH:500, name:'text'});
      slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, CX, res.y + res.h / 2, dur);
      revealText(res.layer, 0.15, 0.6, theme.easing); var settle = 0.75;
      if (scene.cta) { var pillFill = scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent, pillText = onColor(theme, pillFill), pillGap = motif(theme, 'slab') ? 40 : 0, cta = text(comp, scene.cta, {font:theme.fonts.body, size:52, min:48, color:pillText, align:'center', x:CX, y:res.y + res.h + 80 + pillGap, maxW:780, maxH:100, name:'cta'}), pill = rect(comp, {x:CX, y:cta.y + cta.h / 2, w:cta.w + 60, h:cta.h + 32, fill:pillFill, radius:(cta.h + 32) / 2, origin:'center', name:'cta-pill'}); pill.moveAfter(cta.layer); cta.layer.transform.opacity.setValueAtTime(0, 0); animate(cta.layer.transform.opacity, settle + 0.15, settle + 0.4, 0, 100, theme.easing); pill.transform.scale.setValueAtTime(settle, [0,0]); animate(pill.transform.scale, settle, settle + 0.4, [70,70], [100,100], theme.easing); }
      var markerEnd = markEmphasis(comp, theme, res, scene, settle), pillEnd = scene.cta ? settle + 0.4 : 0; return Math.max(settle, pillEnd, markerEnd, glowEnd);
    }
    if (layout === 'pill') {
      var res = text(comp, scene.text, {font:theme.fonts.display, size:120, min:64, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:700, maxW:850, maxH:500, name:'text'});
      slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, CX, res.y + res.h / 2, dur);
      revealText(res.layer, 0.15, 0.6, theme.easing); var settle = 0.75;
      var pillFill = scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent, pillText = onColor(theme, pillFill), cta = text(comp, scene.cta || 'CTA', {font:theme.fonts.body, size:60, min:48, color:pillText, align:'center', x:CX, y:res.y + res.h + 80, maxW:780, maxH:100, name:'cta'}), pill = rect(comp, {x:CX, y:cta.y + cta.h / 2, w:cta.w + 100, h:cta.h + 50, fill:pillFill, radius:(cta.h + 50) / 2, origin:'center', name:'cta-pill'}); pill.moveAfter(cta.layer);
      animate(pill.transform.scale, settle, settle + 0.4, [70,70], [100,100], theme.easing);
      var markerEnd = markEmphasis(comp, theme, res, scene, settle), pillEnd = scene.cta ? settle + 0.4 : 0; return Math.max(settle, pillEnd, markerEnd, glowEnd);
    }
    if (layout === 'handle') {
      var res = text(comp, scene.text, {font:theme.fonts.display, size:120, min:64, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:700, maxW:850, maxH:500, name:'text'});
      slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, CX, res.y + res.h / 2, dur);
      revealText(res.layer, 0.15, 0.6, theme.easing); var settle = 0.75;
      var cta = text(comp, scene.cta || 'CTA', {font:theme.fonts.body, size:52, min:48, color:ink, align:'center', x:CX, y:res.y + res.h + 80, maxW:780, maxH:100, name:'cta'});
      var handle = text(comp, 'Follow for more', {font:theme.fonts.label, size:48, min:36, color:ink, align:'center', x:CX, y:1300, maxW:780, maxH:100, name:'handle'});
      var markerEnd = markEmphasis(comp, theme, res, scene, settle); return Math.max(settle, markerEnd, glowEnd);
    }
    var res = text(comp, scene.text, {font:theme.fonts.display, size:120, min:64, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:700, maxW:850, maxH:500, name:'text'});
    slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, CX, res.y + res.h / 2, dur);
    revealText(res.layer, 0.15, 0.6, theme.easing); var settle = 0.75;
    if (scene.cta) { var pillFill = scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent, pillText = onColor(theme, pillFill), pillGap = motif(theme, 'slab') ? 40 : 0, cta = text(comp, scene.cta, {font:theme.fonts.body, size:52, min:48, color:pillText, align:'center', x:CX, y:res.y + res.h + 80 + pillGap, maxW:780, maxH:100, name:'cta'}), pill = rect(comp, {x:CX, y:cta.y + cta.h / 2, w:cta.w + 60, h:cta.h + 32, fill:pillFill, radius:(cta.h + 32) / 2, origin:'center', name:'cta-pill'}); pill.moveAfter(cta.layer); cta.layer.transform.opacity.setValueAtTime(0, 0); animate(cta.layer.transform.opacity, settle + 0.15, settle + 0.4, 0, 100, theme.easing); pill.transform.scale.setValueAtTime(settle, [0,0]); animate(pill.transform.scale, settle, settle + 0.4, [70,70], [100,100], theme.easing); }
    var markerEnd = markEmphasis(comp, theme, res, scene, settle), pillEnd = scene.cta ? settle + 0.4 : 0; return Math.max(settle, pillEnd, markerEnd, glowEnd);
  }
};

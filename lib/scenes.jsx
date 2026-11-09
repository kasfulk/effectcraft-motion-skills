function emphasisIndex(str, word) {
  return word ? String(str).toLowerCase().indexOf(String(word).toLowerCase()) : -1;
}
function wordBox(res, word) {
  var idx = -1, prefix = '', line = '', low = String(word).toLowerCase();
  for (var i = 0; i < res.lines.length; i++) {
    var at = res.lines[i].toLowerCase().indexOf(low);
    if (at >= 0) { idx = i; prefix = res.lines[i].slice(0, at); line = res.lines[i].slice(at, at + word.length); break; }
  }
  if (idx < 0) return null;
  var lineH = res.h / res.lines.length, lineW = measure(res.lines[idx], res.font, res.size);
  var x = res.x + (res.align === 'center' ? -lineW / 2 : 0) + measure(prefix, res.font, res.size);
  return {x:x, y:res.y + idx * lineH, w:measure(line, res.font, res.size), h:lineH};
}
function title(comp, theme, scene, n) {
  n = n || SCENE_N;
  var label = String(n < 10 ? '0' + n : n) + '  ' + String(scene.title);
  var lineLabel = motif(theme, 'lineLabel'), x = lineLabel ? SAFE.x0 : CX;
  if (lineLabel) {
    rect(comp, {x:SAFE.x0, y:300, w:130, h:4, fill:theme.colors.muted, origin:'left', comment:'decor'});
    var l = text(comp, label, {font:theme.fonts.label, size:36, min:36, color:theme.colors.muted, x:x, y:320, maxW:SAFE.x1-SAFE.x0, maxH:100, name:'title'});
    return {bottom:l.y + l.h};
  }
  var centered = theme.align === 'center';
  var t = text(comp, scene.title, {font:theme.fonts.display, size:84, min:56, color:theme.colors.ink, align:centered ? 'center' : 'left', x:centered ? CX : SAFE.x0, y:300, maxW:SAFE.x1-SAFE.x0, maxH:180, name:'title'});
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
    hl.transform.rotation.setValue(-2.3); hl.moveAfter(res.layer); hl.transform.scale.setValueAtTime(revealEnd, [0,100]); animate(hl.transform.scale, revealEnd, revealEnd + 0.35, [0,100], [100,100], theme.easing);
    return revealEnd + 0.35;
  }
  if (motif(theme, 'underline')) {
    colorRange(res.layer, idx, end, theme.colors.accent);
    var u = rect(comp, {x:box.x, y:box.y + box.h + 10, w:box.w, h:14, fill:theme.colors.accent, origin:'left', name:'underline'});
    u.transform.scale.setValueAtTime(revealEnd, [0,100]); animate(u.transform.scale, revealEnd, revealEnd + 0.35, [0,100], [100,100], theme.easing);
    return revealEnd + 0.35;
  }
  colorRange(res.layer, idx, end, theme.colors.accent);
  return 0;
}
function textColor(theme, scene) { return onColor(theme, theme.colors[scene.bg || 'base']); }
var SCENES = {
  hook: function (comp, theme, scene, dur) {
    var bgHex = theme.colors[scene.bg || 'base'], ink = onColor(theme, bgHex), align = theme.align === 'center' ? 'center' : 'left';
    var res = text(comp, scene.text, {font:theme.fonts.display, size:150, min:72, color:motif(theme, 'slab') ? theme.colors.base : ink, align:align, x:align === 'center' ? CX : SAFE.x0, y:820, maxW:760, maxH:500, name:'text'});
    var topY = Math.max(SAFE.y0, Math.min(SAFE.y1 - res.h, 820 - res.h / 2));
    res.layer.transform.position.setValue([res.layer.transform.position.value[0], topY]); res.y = topY;
    slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, align === 'center' ? CX : res.x + res.w / 2, res.y + res.h / 2, dur);
    var settle = 0.15 + 0.6; revealText(res.layer, 0.15, 0.6, theme.easing); var markerEnd = markEmphasis(comp, theme, res, scene, settle); return Math.max(settle, markerEnd, glowEnd);
  },
  kinetic: function (comp, theme, scene, dur) {
    var align = theme.align === 'center' ? 'center' : 'left', tx = scene.title ? title(comp, theme, scene).bottom + 40 : 300;
    var max = 120, n = scene.lines.length, i, widest = 0;
    for (i = 0; i < n; i++) widest = Math.max(widest, measure(scene.lines[i], theme.fonts.display, 120));
    max = Math.max(64, Math.min(120, Math.floor(120 * 850 / widest)));
    var res = [], settle = 0;
    for (i = 0; i < n; i++) {
      var y = tx + i * (max * 1.12 + 36), r = text(comp, scene.lines[i], {font:theme.fonts.display, size:max, min:64, color:textColor(theme, scene), align:align, x:align === 'center' ? CX : SAFE.x0, y:y, maxW:850, maxH:max*1.3, name:'line' + (i + 1)});
      var at = 0.15 + 0.35 * i, p = r.layer.transform.position.value; animate(r.layer.transform.position, at, at + 0.45, [p[0], p[1] + 60], [p[0], p[1]], theme.easing); animate(r.layer.transform.opacity, at, at + 0.45, 0, 100, theme.easing); res.push(r); settle = at + 0.45;
      if (scene.emphasis) { var joined = scene.lines[i], ei = emphasisIndex(joined, scene.emphasis); if (ei >= 0) { var markerEnd = markEmphasis(comp, theme, r, {emphasis:scene.emphasis, text:joined, bg:scene.bg}, settle); settle = Math.max(settle, markerEnd); } }
    }
    return settle;
  },
  quote: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene), q = text(comp, '“', {font:theme.fonts.display, size:300, min:300, color:theme.colors.accent, align:'center', x:CX, y:270, maxW:850, maxH:340, name:'quote-mark'}); q.layer.comment = 'decor';
    var res = text(comp, scene.text, {font:theme.fonts.quote || theme.fonts.display, size:96, min:56, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:600, maxW:820, maxH:550, name:'text'});
    slab(comp, theme, res.y, res.h, dur);
    if (scene.source) { var sourceY = res.y + res.h + (motif(theme, 'slab') ? 80 : 30), sourceColor = motif(theme, 'slab') ? theme.colors.muted : ink; text(comp, '— ' + scene.source, {font:theme.fonts.label, size:36, min:36, color:sourceColor, align:'center', x:CX, y:sourceY, maxW:820, maxH:80, name:'source'}); }
    revealText(res.layer, 0.15, 0.9, theme.easing); var markerEnd = markEmphasis(comp, theme, res, scene, 1.05); return Math.max(1.05, markerEnd);
  },
  outro: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene), res = text(comp, scene.text, {font:theme.fonts.display, size:120, min:64, color:motif(theme, 'slab') ? theme.colors.base : ink, align:'center', x:CX, y:700, maxW:850, maxH:500, name:'text'});
    slab(comp, theme, res.y, res.h, dur); var glowEnd = addGlow(comp, theme, CX, res.y + res.h / 2, dur);
    revealText(res.layer, 0.15, 0.6, theme.easing); var settle = 0.75;
    if (scene.cta) { var pillFill = scene.bg === 'accent' ? theme.colors.ink : theme.colors.accent, pillText = onColor(theme, pillFill), pillGap = motif(theme, 'slab') ? 40 : 0, cta = text(comp, scene.cta, {font:theme.fonts.body, size:52, min:48, color:pillText, align:'center', x:CX, y:res.y + res.h + 80 + pillGap, maxW:780, maxH:100, name:'cta'}), pill = rect(comp, {x:CX, y:cta.y + cta.h / 2, w:cta.w + 60, h:cta.h + 32, fill:pillFill, radius:(cta.h + 32) / 2, origin:'center', name:'cta-pill'}); pill.moveAfter(cta.layer); pill.transform.scale.setValueAtTime(settle, [0,0]); animate(pill.transform.scale, settle, settle + 0.4, [0,0], [100,100], theme.easing); }
    var markerEnd = markEmphasis(comp, theme, res, scene, settle), pillEnd = scene.cta ? settle + 0.4 : 0; return Math.max(settle, pillEnd, markerEnd, glowEnd);
  }
};

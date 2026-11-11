// core
var SCENE_N = 0;
var SCENE_NTH = 0;
var SAFE = {x0:90, x1:940, y0:250, y1:1450};
var CX = 515;
function fmtID(value, decimals) {
  var digits = Math.min(decimals === undefined ? (String(value).split('.')[1] ? String(value).split('.')[1].length : 0) : decimals, 2);
  var parts = Number(value).toFixed(digits).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.length > 1 ? parts[0] + ',' + parts[1] : parts[0];
}
function counterExpr(t0, t1, value, prefix, suffix, from) {
  var dec = String(value).split('.')[1], fmt = fmtID.toString();
  return '(function(){var fmt=' + fmt + ';return ' + JSON.stringify(prefix || '') + '+fmt(ease(time,' + t0 + ',' + t1 + ',' + (from || 0) + ',' + value + '),' + (dec ? dec.length : 0) + ')+' + JSON.stringify(suffix || '') + ';})()';
}
function rgb(hex) {
  var h = String(hex).replace(/^#/, '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
function lum(hex) {
  var c = rgb(hex).map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function onColor(theme, bgHex) {
  var bg = lum(bgHex), base = theme.colors.base, ink = theme.colors.ink;
  return (Math.max(bg, lum(base)) - Math.min(bg, lum(base)) + 0.05) / (Math.min(bg, lum(base)) + 0.05) >= (Math.max(bg, lum(ink)) - Math.min(bg, lum(ink)) + 0.05) / (Math.min(bg, lum(ink)) + 0.05) ? base : ink;
}
function shade(hex, amt) {
  var h = String(hex).replace(/^#/, ''), out = '#';
  for (var i = 0; i < 3; i++) {
    var v = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    v = Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    out += ('0' + v.toString(16)).slice(-2);
  }
  return out;
}
function bgFor(comp, theme, variant) {
  var fill = theme.colors[variant || 'base'] || theme.colors.base;
  var text = onColor(theme, fill);
  var b = comp.layers.addSolid(rgb(fill), 'background', 1080, 1920, 1);
  b.comment = 'bg';
  var deep = shade(fill, -0.08);
  var e = b.property('Effects').addProperty('4-Color Gradient'), pc = e.property('Positions & Colors');
  pc.property('Point 1').setValue([0, 0]); pc.property('Color 1').setValue(rgb(fill));
  pc.property('Point 2').setValue([1080, 0]); pc.property('Color 2').setValue(rgb(fill));
  pc.property('Point 3').setValue([0, 1920]); pc.property('Color 3').setValue(rgb(deep));
  pc.property('Point 4').setValue([1080, 1920]); pc.property('Color 4').setValue(rgb(deep));
  if (theme.motifs.indexOf('sheet') >= 0 && fill === theme.colors.base && theme.colors.sheet) rect(comp, {x:60, y:200, w:960, h:1300, fill:theme.colors.sheet, radius:18, origin:'topLeft', name:'sheet', comment:'bg'});
  return {fill:fill, text:text, layer:b};
}
function setText(layer, str, font, size, color, align) {
  var p = layer.property('Source Text'), d = p.value;
  d.text = String(str).replace(/\n/g, '\r'); d.font = font; d.fontSize = size; d.fillColor = rgb(color);
  d.justification = align === 'center' ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
  p.setValue(d);
}
function measure(str, font, size) {
  var c = app.project.items.addComp('__measure', 1080, 1920, 1, 1, 30), l = c.layers.addText(String(str));
  setText(l, str, font, size, '#000000', 'left'); var r = l.sourceRectAtTime(0, false), w = r.width; l.remove(); c.remove(); return w;
}
function wrapWords(str, font, size, maxW) {
  var words = String(str).split(/\s+/), lines = [], line = '';
  for (var i = 0; i < words.length; i++) { var next = line ? line + ' ' + words[i] : words[i]; if (line && measure(next, font, size) > maxW) { lines.push(line); line = words[i]; } else line = next; }
  if (line || !lines.length) lines.push(line);
  return lines;
}
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
function text(comp, str, o) {
  o = o || {}; var font = o.font || THEME.fonts.body, size = o.size || 64, min = o.min || 36, color = o.color || THEME.colors.ink;
  var maxW = o.maxW || (SAFE.x1 - SAFE.x0), maxH = o.maxH || (SAFE.y1 - SAFE.y0), lines, h, w;
  for (;;) {
    lines = wrapWords(str, font, size, maxW); w = 0; for (var i=0;i<lines.length;i++) w = Math.max(w, measure(lines[i], font, size)); h = lines.length * size * 1.12;
    if (w <= maxW && h <= maxH) break;
    var next = Math.max(min, Math.floor(size * 0.94));
    if (next === size) throw new Error('text too long');
    size = next;
  }
  var l = comp.layers.addText(lines.join('\r')); l.name = o.name || 'text'; setText(l, lines.join('\r'), font, size, color, o.align || 'left');
  var r = l.sourceRectAtTime(0, false), x = o.x === undefined ? CX : o.x, y = o.y === undefined ? SAFE.y0 : o.y;
  l.transform.anchorPoint.setValue([r.left + r.width / 2, r.top]); l.transform.position.setValue([o.align === 'center' ? x : x + r.width / 2, y]);
  return {layer:l, x:x, y:y, w:w, h:h, size:size, lines:lines, font:font, align:o.align || 'left'};
}
function motif(theme, name) { return (theme.motifs || []).indexOf(name) >= 0; }
function shapeLayer(comp, name) { var l = comp.layers.addShape(); l.name = name || 'shape'; return l; }
function rect(comp, o) {
  var l = shapeLayer(comp, o.name || 'rect'), g = l.property('Contents').addProperty('ADBE Vector Group'), c = g.property('Contents');
  var p = c.addProperty('ADBE Vector Shape - Rect'); p.property('Size').setValue([o.w, o.h]);
  var pos = o.origin === 'bottom' ? [0, -o.h/2] : o.origin === 'left' ? [o.w/2, 0] : o.origin === 'topLeft' ? [o.w/2, o.h/2] : [0,0]; p.property('Position').setValue(pos);
  if (o.radius) p.property('Roundness').setValue(o.radius);
  if (o.fill) { var f = c.addProperty('ADBE Vector Graphic - Fill'); f.property('Color').setValue(rgb(o.fill)); }
  if (o.stroke) { var st = c.addProperty('ADBE Vector Graphic - Stroke'); st.property('Color').setValue(rgb(o.stroke)); st.property('Stroke Width').setValue(o.strokeW || 2); }
  l.transform.position.setValue([o.x, o.y]); l.comment = o.comment || '';
  return l;
}
function ellipse(comp, o) {
  var l = shapeLayer(comp, o.name || 'ellipse'), g = l.property('Contents').addProperty('ADBE Vector Group'), c = g.property('Contents');
  var p = c.addProperty('ADBE Vector Shape - Ellipse'); p.property('Size').setValue([o.d, o.d]);
  if (o.fill) { var f = c.addProperty('ADBE Vector Graphic - Fill'); f.property('Color').setValue(rgb(o.fill)); }
  if (o.stroke) { var st = c.addProperty('ADBE Vector Graphic - Stroke'); st.property('Color').setValue(rgb(o.stroke)); st.property('Stroke Width').setValue(o.strokeW || 2); }
  if (!o.fill && !o.stroke) { var fallback = c.addProperty('ADBE Vector Graphic - Fill'); fallback.property('Color').setValue(rgb(THEME.colors.ink)); }
  l.transform.position.setValue([o.cx, o.cy]); l.comment = o.comment || ''; return l;
}
function ring(comp, o) {
  var l = shapeLayer(comp, o.name || 'ring'), g = l.property('Contents').addProperty('ADBE Vector Group'), c = g.property('Contents');
  var p = c.addProperty('ADBE Vector Shape - Ellipse'); p.property('Size').setValue([o.d, o.d]); var st = c.addProperty('ADBE Vector Graphic - Stroke'); st.property('Color').setValue(rgb(o.color || THEME.colors.ink)); st.property('Stroke Width').setValue(o.strokeW || 12); var trim = c.addProperty('ADBE Vector Filter - Trim'); l.transform.position.setValue([o.cx, o.cy]); l.comment = o.comment || ''; return {layer:l, trim:trim};
}
function easeProfile(name) {
  return name === 'calm' ? {out:60, in:60} : name === 'smooth' ? {out:30, in:75} : {out:0.1, in:90};
}
function easeArray(influence, dims) {
  var out = []; for (var i = 0; i < dims; i++) out.push(new KeyframeEase(0, influence)); return out;
}
function animate(prop, t0, t1, v0, v1, easing) {
  var dims = Array.isArray(v0) ? v0.length : 1, name = easing || THEME.easing, profile = easeProfile(name), free = easeArray(profile.out, dims);
  var grows = false; for (var gi = 0; gi < dims; gi++) if (v1[gi] > v0[gi]) grows = true;
  var overshoot = name === 'pop' && prop.matchName === 'ADBE Scale' && Array.isArray(v1) && grows;
  prop.setValueAtTime(t0, v0); var k1 = prop.numKeys;
  if (overshoot) {
    // Squash and stretch: the axis that grows overshoots 12 %, and when that is the only axis
    // moving the perpendicular one dips 6 %, so the shape stretches along its motion instead of
    // scaling uniformly. Both axes growing means a plain zoom -- no perpendicular to squash.
    var over = [], moving = [];
    for (var i = 0; i < dims; i++) { over.push(v1[i]); if (v1[i] !== v0[i]) moving.push(i); }
    if (moving.length === 1) { for (var j = 0; j < dims; j++) if (j !== moving[0] && v1[j] !== 0) over[j] = v1[j] * 0.94; over[moving[0]] = v1[moving[0]] * 1.12; }
    else { for (var k = 0; k < moving.length; k++) over[moving[k]] = v1[moving[k]] * 1.12; }
    prop.setValueAtTime(t0 + 0.7 * (t1 - t0), over);
  }
  prop.setValueAtTime(t1, v1); var k2 = prop.numKeys, outEase = easeArray(profile.out, dims), inEase = easeArray(profile.in, dims);
  prop.setTemporalEaseAtKey(k1, free, outEase); prop.setTemporalEaseAtKey(k2, inEase, free);
  if (overshoot) { var ko = k2 - 1; prop.setTemporalEaseAtKey(ko, outEase, inEase); }
}
function revealText(layer, t0, dur, easing) {
  var easingName = easing || THEME.easing;
  var a = layer.property('Text').property('Animators').addProperty('ADBE Text Animator'), op = a.property('Properties').addProperty('ADBE Text Opacity'), po = a.property('Properties').addProperty('ADBE Text Position 3D'); op.setValue(-100);
  // Words rise from below and overshoot the baseline before settling. A static 60 px offset
  // reads as a plain slide; the extra travel plus the 9 px overshoot is what reads as motion.
  animate(po, t0, t0 + 0.72 * dur, [0, 76, 0], [0, -9, 0], 'calm');
  animate(po, t0 + 0.72 * dur, t0 + dur, [0, -9, 0], [0, 0, 0], 'calm'); var s = a.property('Selectors').addProperty('ADBE Text Selector'); s.property('Start').setValue(0); s.property('End').setValue(100); var off = s.property('Offset'); off.setValueAtTime(t0, 0); var k0 = off.numKeys; off.setValueAtTime(t0 + dur, 100); var k1 = off.numKeys, profile = easeProfile(easingName), e = easeArray(profile.out, 1), ei = easeArray(profile.in, 1); off.setTemporalEaseAtKey(k0, e, e); off.setTemporalEaseAtKey(k1, ei, e); return layer;
}
function colorRange(layer, start, end, hex) { var a = layer.property('Text').property('Animators').addProperty('ADBE Text Animator'), f = a.property('Properties').addProperty('ADBE Text Fill Color'); f.setValue(rgb(hex)); var s = a.property('Selectors').addProperty('ADBE Text Selector'); s.property('Advanced').property('Units').setValue(2); s.property('Start').setValue(start); s.property('End').setValue(end); return a; }
function exitAll(comp, dur) { for (var i=1;i<=comp.numLayers;i++) { var l=comp.layer(i); if (l.comment !== 'bg') { var o = l.transform.opacity, t = Math.max(0, dur - 0.3), v0 = o.numKeys === 0 ? o.value : (typeof o.valueAtTime === 'function' ? o.valueAtTime(t, false) : o.keyValue(o.numKeys)); animate(o, t, dur, v0, 0, THEME.easing); } } }
function checkSafe(comp, t) {
  for (var i=1;i<=comp.numLayers;i++) {
    var l=comp.layer(i); if (l.comment === 'bg' || l.comment === 'decor' || l.name === 'text') continue;
    var r=l.sourceRectAtTime(t, false), p=l.transform.position.valueAtTime(t, false), a=l.transform.anchorPoint.valueAtTime(t, false), sc=l.transform.scale.valueAtTime(t, false), rot=l.transform.rotation.valueAtTime(t, false) * Math.PI / 180, cs=Math.cos(rot), sn=Math.sin(rot);
    var corners=[[r.left,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height],[r.left,r.top+r.height]], x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity;
    for (var j=0;j<corners.length;j++) { var dx=(corners[j][0]-a[0])*sc[0]/100, dy=(corners[j][1]-a[1])*sc[1]/100, xx=p[0]+dx*cs-dy*sn, yy=p[1]+dx*sn+dy*cs; x0=Math.min(x0,xx); x1=Math.max(x1,xx); y0=Math.min(y0,yy); y1=Math.max(y1,yy); }
    if (x0 < SAFE.x0-2 || x1 > SAFE.x1+2 || y0 < SAFE.y0-2 || y1 > SAFE.y1+2) throw new Error(l.name + ' outside safe area');
  }
}

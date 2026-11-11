// transitions: between-scene wipes driven by TRANSITIONS.apply(main, THEME, t, a, b, o).
// a = outgoing precomp layer (Main), b = incoming precomp layer; both span [start-dur, start].
// Each entry returns the end time (start + o.dur is already set upstream; we return it for chaining).
// 3D/rotation unavailable in engine: fold/pageTurn approximated with anchor-pointed scale swings.

function _trSolid(comp, name, color) {
  var s = comp.layers.addSolid(rgb(color), name, 1080, 1920, 1);
  s.comment = 'decor';
  return s;
}
function _trKeyOpacity(layer, t0, t1, v0, v1, easing) {
  var op = layer.transform.opacity;
  op.setValueAtTime(t0, v0);
  animate(op, t0, t1, v0, v1, easing);
}
function _trKeyScale(layer, t0, t1, v0, v1, easing) {
  var sc = layer.transform.scale;
  sc.setValueAtTime(t0, v0);
  animate(sc, t0, t1, v0, v1, easing);
}
function _trAnchorCenter(layer) {
  layer.transform.anchorPoint.setValue([540, 960]);
}

function trFold(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 0.9, axis = o.axis || 'y';
  var end = t0 + dur;
  // scale collapses around the centre; moving the anchor would shift the scene outside the transition window
  var axisKey = axis === 'y' ? [0, 100] : [100, 0];
  _trKeyScale(a, t0, end, [100, 100], axisKey, 'calm');
  // a holds opaque until the cut: fading it while b ramps up leaves the comp background showing
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  // shadow falling on b as a turns: dark solid above b so it darkens the incoming scene
  var sh = _trSolid(comp, 'fold-shadow', theme.colors.ink || '#000000');
  sh.moveBefore(b); sh.startTime = t0; sh.outPoint = end;
  var shop = sh.transform.opacity;
  shop.setValueAtTime(t0, 0);
  animate(shop, t0, end, 0, 28, 'calm');
  sh.outPoint = end; shop.setValueAtTime(end, 28);
  // b ramps in: the collapsing a is what covers its own area, so a hard 100% hides the fold
  _trKeyOpacity(b, t0, end, 0, 100, 'calm');
  return end;
}

function trMaskWipe(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 0.9, shape = o.shape || 'circle';
  var x = o.x !== undefined ? o.x : 540, y = o.y !== undefined ? o.y : 960;
  var soft = o.soft || 0, rim = o.rim !== undefined ? o.rim : true;
  var end = t0 + dur;
  // keep the outgoing scene opaque behind the wipe: fading it to 0 across the
  // whole transition lets the comp background show through the half-revealed
  // incoming layer, which reads as a dark dip mid-wipe
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  // wipe on b: use Radial Scale Wipe for circle/arch, Linear Wipe for line
  var e;
  if (shape === 'line') {
    e = b.property('Effects').addProperty('Linear Wipe');
    e.property('Wipe Angle').setValue(theme.align === 'left' ? 0 : 90);
    e.property('Feather').setValue(soft || 8);
    animate(e.property('Transition Completion'), t0, end, 100, 0, 'smooth');
  } else {
    e = b.property('Effects').addProperty('Radial Wipe');
    var wp = e.property('Wipe'); if (wp) wp.setValue(2);
    var sa = e.property('Start Angle'); if (sa) sa.setValue(shape === 'arch' ? 180 : 0);
    animate(e.property('Transition Completion'), t0, end, 100, 0, 'smooth');
  }
  if (rim) {
    var rm = _trSolid(comp, 'wipe-rim', theme.colors.accent || theme.colors.ink);
    rm.moveAfter(b); rm.startTime = t0; rm.outPoint = end;
    var ro = rm.transform.opacity;
    ro.setValueAtTime(t0, 0);
    animate(ro, t0, end - 0.15, 0, 22, 'calm');
    animate(ro, end - 0.15, end, 22, 0, 'calm');
  }
  // the wipe is the reveal: b must be opaque, otherwise the not-yet-revealed
  // area crossfades instead of wiping and the comp background shows through
  b.transform.opacity.setValueAtTime(t0, 100);
  return end;
}

function trPageTurn(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 1.0, corner = o.corner || 'br', angle = o.angle || 30;
  var end = t0 + dur;
  // peel: scale down toward corner with slight rotation for the page feel
  _trKeyScale(a, t0, end, [100, 100], [40 + angle, 40 + angle], 'smooth');
  // a holds opaque until the cut so the peel never exposes the comp background
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  // moving highlight sweep: thin accent bar crosses a during the peel, above a to be visible
  var hl = _trSolid(comp, 'turn-glint', theme.colors.accent || theme.colors.ink);
  hl.moveBefore(a); hl.startTime = t0; hl.outPoint = end;
  hl.transform.anchorPoint.setValue([540, 960]);
  hl.transform.scale.setValue([100, 4]); // thin band
  var hpos = hl.transform.position;
  var hx0 = corner === 'bl' || corner === 'tl' ? 200 : 880;
  var hx1 = corner === 'bl' || corner === 'tl' ? 880 : 200;
  hpos.setValueAtTime(t0, [hx0, 960]);
  animate(hpos, t0, end - 0.2, [hx0, 960], [hx1, 960], 'smooth');
  var hop = hl.transform.opacity;
  hop.setValueAtTime(t0, 0);
  animate(hop, t0, end - 0.3, 0, 30, 'calm');
  animate(hop, end - 0.3, end, 30, 0, 'calm');
  // shadow the page leaves: dark solid above b so it darkens the incoming scene
  var sh = _trSolid(comp, 'turn-shadow', theme.colors.ink || '#000000');
  sh.moveBefore(b); sh.startTime = t0; sh.outPoint = end;
  var sopo = sh.transform.opacity;
  sopo.setValueAtTime(t0, 30);
  animate(sopo, t0, end, 30, 0, 'calm');
  // b ramps in under the shrinking page; a holds the frame until the cut
  _trKeyOpacity(b, t0, end, 0, 100, 'calm');
  _trKeyScale(b, t0, end, [106, 106], [100, 100], 'calm');
  return end;
}

function trZoom(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 0.7;
  var end = t0 + dur;
  _trKeyScale(a, t0, end, [103, 103], [140, 140], 'calm');
  // a stays opaque: b starts at 92% scale and cannot cover the frame edges
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  _trKeyScale(b, t0, end, [92, 92], [100, 100], 'calm');
  _trKeyOpacity(b, t0, end, 0, 100, 'calm');
  return end;
}

// Whip pan: both scenes travel a full frame width in the same direction, with a horizontal
// directional blur that exists only while they move. Without the blur the pan reads as a slide.
function trWhip(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 0.55, dir = o.dir || (theme.align === 'left' ? -1 : 1);
  // travel must equal the comp width: the two precomps are 1080 wide, so 1080 of offset puts
  // a's right edge exactly on b's left edge. Any larger number opens a strip of background
  // between them for the whole move.
  var end = t0 + dur, travel = 1080, blurLen = 45;
  var ae = a.property('Effects').addProperty('Directional Blur');
  ae.property('Direction').setValue(90);
  var be = b.property('Effects').addProperty('Directional Blur');
  be.property('Direction').setValue(90);
  // Blur tracks speed, not the window: zero at the start (the layers are still), peak at the
  // midpoint where the eased velocity is highest, zero again on landing so both frames are sharp.
  var peak = t0 + 0.4 * dur;
  animate(ae.property('Blur Length'), t0, peak, 0, blurLen, 'smooth');
  animate(ae.property('Blur Length'), peak, end, blurLen, 0, 'smooth');
  animate(be.property('Blur Length'), t0, peak, 0, blurLen, 'smooth');
  animate(be.property('Blur Length'), peak, end, blurLen, 0, 'smooth');
  var ap = a.transform.position, bp = b.transform.position;
  ap.setValueAtTime(t0, [540, 960]);
  animate(ap, t0, end, [540, 960], [540 - dir * travel, 960], 'smooth');
  bp.setValueAtTime(t0, [540 + dir * travel, 960]);
  animate(bp, t0, end, [540 + dir * travel, 960], [540, 960], 'smooth');
  // both stay opaque: two half-transparent frames would show the comp background between them
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  b.transform.opacity.setValueAtTime(t0, 100);
  return end;
}

function trGlitch(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 0.7, strength = o.strength || 1;
  var end = t0 + dur;
  var se = strength * 24;
  // two offset copies of the outgoing layer, flickering
  var r = a.duplicate(); r.name = 'glitch-r'; r.comment = 'decor';
  var c = a.duplicate(); c.name = 'glitch-c'; c.comment = 'decor';
  [r, c].forEach(function (l, i) {
    var off = i === 0 ? 1 : -1;
    var p = l.transform.position;
    p.setValueAtTime(t0, [540 + off * se, 960]);
    var j1 = t0 + dur * 0.35, j2 = t0 + dur * 0.65;
    animate(p, t0, j1, [540 + off * se, 960], [540 - off * se * 0.5, 960], 'snap');
    animate(p, j1, j2, [540 - off * se * 0.5, 960], [540 + off * se * 0.3, 960], 'snap');
    animate(p, j2, end, [540 + off * se * 0.3, 960], [540, 960], 'calm');
    var op = l.transform.opacity;
    op.setValueAtTime(t0, 70);
    animate(op, t0 + dur * 0.5, end, 70, 0, 'calm');
  });
  // a itself: quick horizontal slice via position jitter
  var ap = a.transform.position;
  ap.setValueAtTime(t0, [540, 960]);
  animate(ap, t0, t0 + dur * 0.3, [540, 960], [540 + 14 * strength, 960], 'snap');
  animate(ap, t0 + dur * 0.3, t0 + dur * 0.6, [540 + 14 * strength, 960], [540 - 10 * strength, 960], 'snap');
  animate(ap, t0 + dur * 0.6, end, [540 - 10 * strength, 960], [540, 960], 'calm');
  // a stays opaque until the end: fading it while b is still ramping leaves
  // the comp background showing through both half-transparent layers
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  _trKeyOpacity(b, t0, end, 0, 100, 'calm');
  return end;
}

function trDipSeed(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 1.6, seed = o.seed || 'dot';
  var x = o.x !== undefined ? o.x : 540, y = o.y !== undefined ? o.y : 960;
  var end = t0 + dur;
  // a stays opaque until b has grown to full frame: b starts at 40% scale, so
  // fading a out early leaves the comp background (black) around the growing
  // rectangle for most of the transition
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  // seed grows out of the point
  var sl;
  if (seed === 'zero') {
    sl = _trSolid(comp, 'dip-seed', theme.colors.accent || theme.colors.ink);
    sl.moveAfter(b); sl.startTime = t0; sl.outPoint = end;
    // turn it into a ring by scaling a thin donut: use a stroked ellipse instead
    sl.remove();
    var r = ellipse(comp, {cx: x, cy: y, d: 120, stroke: theme.colors.accent || theme.colors.ink, strokeW: 8, name: 'dip-seed', comment: 'decor'});
    sl = r;
  } else if (typeof seed === 'string' && seed !== 'dot') {
    sl = text(comp, seed, {font: theme.fonts.display, size: 120, min: 120, color: theme.colors.accent || theme.colors.ink, align: 'center', x: x, y: y, maxW: 400, maxH: 200, name: 'dip-seed', min: 48});
    sl = sl.layer; sl.comment = 'decor';
  } else {
    sl = ellipse(comp, {cx: x, cy: y, d: 90, fill: theme.colors.accent || theme.colors.ink, name: 'dip-seed', comment: 'decor'});
  }
  sl.startTime = t0; sl.outPoint = end;
  var sc = sl.transform.scale;
  sc.setValueAtTime(t0, [0, 0]);
  animate(sc, t0, t0 + dur * 0.45, [0, 0], [120, 120], 'pop');
  var so = sl.transform.opacity;
  so.setValueAtTime(t0, 0);
  animate(so, t0, t0 + dur * 0.3, 0, 100, 'calm');
  animate(so, t0 + dur * 0.5, end, 100, 0, 'calm');
  // b grows out of the seed point
  _trKeyScale(b, t0, end, [40, 40], [100, 100], 'pop');
  b.transform.opacity.setValueAtTime(t0, 100);
  return end;
}

function trColorShift(comp, theme, a, b, o) {
  o = o || {};
  var t0 = o.start, dur = o.dur || 2.5;
  var fromHex = o.from || theme.colors.base || '#111111';
  var toHex = o.to || theme.colors.accent || theme.colors.base || '#111111';
  var end = t0 + dur;
  // approximate: two full-screen solids crossfading (from -> to) on top during the shift
  var g1 = _trSolid(comp, 'cshift-a', fromHex);
  g1.moveBefore(b); g1.startTime = t0; g1.outPoint = end;
  var g2 = _trSolid(comp, 'cshift-b', toHex);
  g2.moveBefore(g1); g2.startTime = t0; g2.outPoint = end;
  var o1 = g1.transform.opacity, o2 = g2.transform.opacity;
  o1.setValueAtTime(t0, 55);
  animate(o1, t0, end, 55, 0, 'calm');
  o2.setValueAtTime(t0, 0);
  animate(o2, t0, end, 0, 55, 'calm');
  // a stays opaque until the end: the two tint solids peak at 55% each, so a
  // simultaneous fade of both scenes leaves the comp background showing
  a.transform.opacity.setValueAtTime(t0, 100);
  a.transform.opacity.setValueAtTime(end - 0.04, 100);
  a.transform.opacity.setValueAtTime(end, 0);
  _trKeyOpacity(b, t0, end, 0, 100, 'calm');
  return end;
}

var TRANSITIONS = {
  fold: trFold,
  maskWipe: trMaskWipe,
  pageTurn: trPageTurn,
  zoom: trZoom,
  glitch: trGlitch,
  whip: trWhip,
  dipSeed: trDipSeed,
  colorShift: trColorShift,
  apply: function (comp, theme, name, a, b, o) {
    o = o || {};
    o.start = o.start !== undefined ? o.start : 0;
    var fn = TRANSITIONS[name];
    if (!fn) return 0;
    return fn(comp, theme, a, b, o);
  }
};

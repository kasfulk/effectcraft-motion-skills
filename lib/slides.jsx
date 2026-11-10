// slides — deck layout for carousel templates (ES5, concatenated into ExtendScript)
var SLIDE_SIZES = { '3:4': [1080, 1440], '4:5': [1080, 1350], '1:1': [1080, 1080] };

function themeForSlide(theme, tpl) {
  var out = {
    label: theme.label, align: theme.align, easing: theme.easing, durationScale: theme.durationScale,
    motifs: theme.motifs || [],
    colors: {}, fonts: {}
  };
  for (var k in theme.colors) out.colors[k] = theme.colors[k];
  for (var f in theme.fonts) out.fonts[f] = theme.fonts[f];
  out.colors.base = tpl.bg; out.colors.ink = tpl.ink; out.colors.accent = tpl.accent;
  if (tpl.font_head) out.fonts.display = tpl.font_head;
  if (tpl.font_body) out.fonts.body = tpl.font_body;
  return out;
}

function slideSafe(W, H) {
  return { x0: 72, x1: W - 72, y0: 96, y1: H - 120 };
}

function slideMeasure(str, font, size, maxW, maxH, align) {
  var lines = wrapWords(str, font, size, maxW);
  var w = 0; for (var i = 0; i < lines.length; i++) w = Math.max(w, measure(lines[i], font, size));
  var h = lines.length * size * 1.12;
  return { w: w, h: h, fits: w <= maxW && h <= maxH };
}

function slideText(comp, tpl, theme, o, W, H) {
  if (!o || !o.text) throw new Error('slide text is required');
  var safe = slideSafe(W, H);
  var maxW = safe.x1 - safe.x0, maxH = o.maxH || safe.y1 - safe.y0;
  var size = 96;
  while (size >= 44) {
    var m = slideMeasure(o.text, o.font, size, maxW, maxH, o.align);
    if (m.fits) break;
    size -= 6;
  }
  if (size < 44) throw new Error('text overflows slide');
  var res = text(comp, o.text, { font: o.font, size: size, min: size, color: o.color, align: o.align, x: o.x, y: o.y, maxW: maxW, maxH: maxH, name: o.name || 'slide-text' });
  return res;
}

function slideGround(comp, tpl, W, H) {
  return rect(comp, { x: W / 2, y: H / 2, w: W, h: H, fill: tpl.bg, origin: 'center', name: 'background', comment: 'bg' });
}

function slideAccentBand(comp, tpl, theme, W, H, dur) {
  var band = rect(comp, { x: 0, y: 0, w: W, h: 14, fill: tpl.accent, origin: 'left', comment: 'decor', name: 'accent-band' });
  animate(band.transform.position, 0, 0.4, [0, -14], [0, 0], theme.easing);
  var foot = rect(comp, { x: 0, y: H, w: W, h: 6, fill: tpl.accent, origin: 'left', comment: 'decor', name: 'accent-foot' });
  animate(foot.transform.position, 0, 0.4, [0, H + 6], [0, H], theme.easing);
  return 0.4;
}

function slidePanel(comp, tpl, W, H) {
  return rect(comp, { x: 72, y: 96, w: W - 144, h: H - 216, fill: tpl.bg, radius: 24, origin: 'topLeft', comment: 'bg', name: 'panel' });
}

function slideProgress(comp, tpl, theme, page, total, W, H) {
  if (tpl.progress !== true) return 0;
  var bar = rect(comp, { x: 0, y: 0, w: W, h: 8, fill: tpl.accent, origin: 'left', comment: 'decor', name: 'progress' });
  bar.transform.scale.setValueAtTime(0, [0, 100]);
  animate(bar.transform.scale, 0, 1.0, [0, 100], [total > 0 ? 100 * page / total : 0, 100], theme.easing);
  bar.transform.anchorPoint.setValue([0, 0]);
  return 1.0;
}

function slideHandle(comp, tpl, theme, W, H, dur) {
  if (!tpl.handle) return 0;
  var l = text(comp, tpl.handle, { font: theme.fonts.label || theme.fonts.body, size: 30, min: 30, color: onColor(theme, tpl.bg), align: 'center', x: W / 2, y: H - 144, maxW: W - 144, maxH: 44, name: 'handle' });
  l.layer.transform.opacity.setValue(55);
  return 0;
}

function slideEmphasis(comp, tpl, theme, res, slide, revealEnd) {
  if (!slide.emphasis) return revealEnd;
  var idx = emphasisIndex(slide.text, slide.emphasis), end = idx + slide.emphasis.length, box = wordBox(res, slide.emphasis);
  if (motif(theme, 'underline')) {
    var u = rect(comp, { x: box.x, y: box.y + box.h + 10, w: box.w, h: 12, fill: tpl.accent, origin: 'left', name: 'underline' });
    u.transform.scale.setValueAtTime(revealEnd, [0, 100]); animate(u.transform.scale, revealEnd, revealEnd + 0.3, [0, 100], [100, 100], theme.easing);
    return revealEnd + 0.3;
  }
  if (idx >= 0) colorRange(res.layer, idx, end, tpl.accent);
  return revealEnd;
}

var SLIDES = {
  draw: function (comp, tpl, theme, slide, page, total, W, H) {
    var safe = slideSafe(W, H), align = theme.align === 'center' ? 'center' : 'left', settle = 0;
    slideGround(comp, tpl, W, H);
    var leadRes = null, sourceRes = null;
    if (tpl.look === 'themed' || tpl.look === 'graphic') {
      if (tpl.look === 'graphic') {
        slideAccentBand(comp, tpl, theme, W, H);
        slidePanel(comp, tpl, W, H);
      }
      if (slide.lead) {
        leadRes = text(comp, slide.lead.toUpperCase(), { font: theme.fonts.label || theme.fonts.body, size: 30, min: 30, color: tpl.accent, align: align, x: align === 'center' ? W / 2 : safe.x0, y: safe.y0 + 24, maxW: safe.x1 - safe.x0, maxH: 44, name: 'lead' });
      }
      // Bottom band: source (left) + page number (right) on one row, handle centred below it.
      var topY = safe.y0 + (slide.lead ? 84 : 0), bottomY = H - 240;
      var o = { text: slide.text, font: theme.fonts.body, color: tpl.look === 'graphic' ? tpl.ink : onColor(theme, tpl.bg), align: align, x: align === 'center' ? W / 2 : safe.x0, y: topY, maxH: bottomY - topY, name: 'slide-text' };
      var res = slideText(comp, tpl, theme, o, W, H);
      if (slide.source) {
        sourceRes = text(comp, slide.source, { font: theme.fonts.label || theme.fonts.body, size: 28, min: 28, color: onColor(theme, tpl.bg), align: align, x: align === 'center' ? W / 2 : safe.x0, y: bottomY, maxW: safe.x1 - safe.x0, maxH: 44, name: 'source' });
      }
      if (tpl.look === 'themed') {
        text(comp, String(page) + ' / ' + total, { font: theme.fonts.label || theme.fonts.body, size: 28, min: 28, color: onColor(theme, tpl.bg), align: 'right', x: safe.x1, y: H - 196, maxW: 120, maxH: 44, name: 'page-number' });
      }
      var revealEnd = 1.05;
      revealText(res.layer, 0.15, 0.9, theme.easing);
      if (leadRes) revealText(leadRes.layer, 0.1, 0.5, theme.easing);
      if (sourceRes) revealText(sourceRes.layer, 0.3, 0.7, theme.easing);
      settle = Math.max(revealEnd, slideEmphasis(comp, tpl, theme, res, slide, revealEnd));
    } else {
      var po = { text: slide.text, font: theme.fonts.display, color: onColor(theme, tpl.bg), align: align, x: align === 'center' ? W / 2 : safe.x0, y: (safe.y0 + safe.y1) / 2 - 60, maxH: safe.y1 - safe.y0, name: 'slide-text' };
      var pRes = slideText(comp, tpl, theme, po, W, H);
      revealText(pRes.layer, 0.15, 0.9, theme.easing);
      settle = Math.max(1.05, slideEmphasis(comp, tpl, theme, pRes, slide, 1.05));
    }
    settle = Math.max(settle, slideHandle(comp, tpl, theme, W, H));
    settle = Math.max(settle, slideProgress(comp, tpl, theme, page, total, W, H));
    if (typeof applyFx === 'function') applyFx(comp, theme, theme.fx || [], settle);
    exitAll(comp, 3.0);
    return 3.0;
  }
};

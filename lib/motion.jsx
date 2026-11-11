// motion primitives - helper functions
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

// Individual motion primitives
function maskReveal(comp, theme, res, o) {
  o = o || {};
  var lines = o.lines || (res.lines ? res.lines : [res.layer.name]);
  var size = o.size || 120;
  var stagger = o.stagger || 0.2;
  var lineDur = o.lineDur || 0.85;
  var dir = o.dir || 'up';
  var accentLine = o.accentLine !== undefined ? o.accentLine : -1;
  var end = 0;
  
  if (lines.length === 0) return 0;
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var lineRes = res.lines ? res.lines[i] : {layer: res.layer, x: res.x, y: res.y + i * size * 1.12, w: res.w, h: size};
    var lineLayer = lineRes.layer;
    var t0 = i * stagger;
    
    var pos = lineRes.layer.transform.position.value;
    var startPos = pos.slice();
    
    if (dir === 'up') {
      startPos[1] = lineRes.y - lineRes.h;
      animate(lineLayer.transform.position, t0, t0 + lineDur, startPos, pos, theme.easing);
      animate(lineLayer.transform.opacity, t0, t0 + lineDur, 0, 100, theme.easing);
    } else if (dir === 'down') {
      startPos[1] = lineRes.y + lineRes.h;
      animate(lineLayer.transform.position, t0, t0 + lineDur, startPos, pos, theme.easing);
      animate(lineLayer.transform.opacity, t0, t0 + lineDur, 0, 100, theme.easing);
    } else if (dir === 'left') {
      startPos[0] = lineRes.x - lineRes.w;
      animate(lineLayer.transform.position, t0, t0 + lineDur, startPos, pos, theme.easing);
      animate(lineLayer.transform.opacity, t0, t0 + lineDur, 0, 100, theme.easing);
    }
    
    if (i === accentLine) {
      colorRange(lineLayer, 0, 1, theme.colors.accent);
    }
    
    end = Math.max(end, t0 + lineDur);
  }
  
  return end;
}

function wordStagger(comp, theme, res, o) {
  o = o || {};
  var size = o.size || 120;
  var stagger = o.stagger || 0.2;
  var keyWord = o.keyWord !== undefined ? o.keyWord : '';
  var keyGap = o.keyGap || 0.5;
  var color = o.color || theme.colors.ink;
  var lineResults = (res.lines && res.lines[0] && res.lines[0].layer) ? res.lines : [res];
  var end = 0, wi = 0;

  for (var li = 0; li < lineResults.length; li++) {
    var lineRes = lineResults[li];
    var words = String(lineRes.lines ? lineRes.lines.join(' ') : '').split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (!word) continue;
      var box = wordBox(lineRes, word);
      if (!box) continue;

      var t0 = wi * stagger;
      var isKey = word === String(keyWord);
      var wordDur = isKey ? (wi > 0 ? keyGap : 0) : Math.max(0.1, size / 200);

      var wordLayer = comp.layers.addText(word);
      wordLayer.name = 'word' + wi;
      wordLayer.comment = 'decor';
      setText(wordLayer, word, lineRes.font, lineRes.size, isKey ? theme.colors.accent : color, lineRes.align);
      var wr = wordLayer.sourceRectAtTime(0, false);
      wordLayer.transform.anchorPoint.setValue([wr.left + wr.width / 2, wr.top]);
      wordLayer.transform.position.setValue([box.x + box.w / 2, box.y]);

      animate(wordLayer.transform.opacity, t0, t0 + wordDur, 0, 100, theme.easing);

      end = Math.max(end, t0 + wordDur);
      wi++;
    }
  }

  return end;
}

function textMorph(comp, theme, res, o) {
  o = o || {};
  var to = o.to || '';
  var size = o.size || 120;
  var hold = o.hold || 0.8;
  var morph = o.morph || 1.0;
  var color = o.color || theme.colors.ink;
  // lay the target text out in the same block as the source text
  var toLines = wrapWords(to, res.font, size, res.w || 850);
  var lineH = size * 1.12;
  var end = 0, wi = 0;

  animate(res.layer.transform.opacity, 0, 0.3, 100, 0, theme.easing);

  for (var li = 0; li < toLines.length; li++) {
    var lineStr = toLines[li], lineW = measure(lineStr, res.font, size), from = 0;
    var words = lineStr.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (!word) continue;
      var at = lineStr.indexOf(word, from);
      if (at < 0) at = from;
      from = at + word.length;
      var box = {
        x: res.x + (res.align === 'center' ? -lineW / 2 : 0) + measure(lineStr.slice(0, at), res.font, size),
        y: res.y + li * lineH,
        w: measure(word, res.font, size),
        h: lineH
      };

      var wordLayer = comp.layers.addText(word);
      wordLayer.name = 'morph-word' + wi;
      wordLayer.comment = 'decor';
      setText(wordLayer, word, res.font, size, color, res.align);
      var wr = wordLayer.sourceRectAtTime(0, false);
      wordLayer.transform.anchorPoint.setValue([wr.left + wr.width / 2, wr.top]);
      wordLayer.transform.position.setValue([box.x + box.w / 2, box.y]);

      var t0 = hold + wi * (morph + 0.1);
      animate(wordLayer.transform.opacity, t0, t0 + 0.3, 0, 100, theme.easing);

      end = Math.max(end, t0 + 0.3);
      wi++;
    }
  }

  return end;
}

function inWorld(comp, theme, res, o) {
  o = o || {};
  var lines = o.lines || (res.lines ? res.lines : [res]);
  var size = o.size || 120;
  var surface = o.surface || 'page';
  var rotX = o.rotX || 0;
  var rotY = o.rotY || 0;
  var z = o.z || 0;
  var persp = o.persp || 1400;
  var end = 0;
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var lineLayer = line.layer || line;
    var lineX = line.x === undefined ? CX : (line.align === 'center' ? line.x : line.x + lineLayer.sourceRectAtTime(0, false).width / 2);
    var lineY = line.y === undefined ? SAFE.y0 + i * size * 1.12 : line.y;
    
    var t0 = 0;
    var t1 = 0.5;
    
    if (surface === 'wall') {
      animate(lineLayer.transform.position, t0, t1, [lineX, SAFE.y1 + 100, -persp], [lineX, lineY, z], theme.easing);
      animate(lineLayer.transform.rotation, t0, t1, [0, 0, rotX], [rotX, rotY, 0], theme.easing);
    } else if (surface === 'floor') {
      animate(lineLayer.transform.position, t0, t1, [lineX, -100, z], [lineX, lineY, z], theme.easing);
      animate(lineLayer.transform.rotation, t0, t1, [0, rotY, 0], [rotX, rotY, 0], theme.easing);
    } else {
      animate(lineLayer.transform.position, t0, t1, [lineX, SAFE.y0 - 100, 0], [lineX, lineY, 0], theme.easing);
      animate(lineLayer.transform.scale, t0, t1, [0, 0], [100, 100], theme.easing);
    }
    
    animate(lineLayer.transform.opacity, t0, t1, 0, 100, theme.easing);
    
    end = Math.max(end, t1);
  }
  
  return end;
}

// Export MOTION object with individual primitives
var MOTION = {
  maskReveal: maskReveal,
  wordStagger: wordStagger,
  textMorph: textMorph,
  inWorld: inWorld
};
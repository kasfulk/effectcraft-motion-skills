// scenes-extra: 8 additional scene types (ES5, concatenated into ExtendScript)
// Each returns settle seconds. Content inside SAFE. Deterministic. No Math.random.
var SCENES_EXTRA = {
  // counter: {value, prefix?, suffix?, label?, from?:0, curve?:'ease'|'flicker', race?:{to,label,lead}}
  counter: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var val = scene.value, from = scene.from === undefined ? 0 : scene.from;
    var curve = scene.curve || 'ease';
    var finalStr = (scene.prefix || '') + fmtID(val) + (scene.suffix || '');
    var size = 260;
    while (size > 72 && measure(finalStr, theme.fonts.display, size) > 850) size = Math.max(72, Math.floor(size * 0.94));
    var cy = scene.race ? 760 : 880;
    var v = text(comp, finalStr, {font:theme.fonts.display,size:size,min:size,color:ink,align:'center',x:CX,y:cy,maxW:1e6,maxH:400,name:'value'});
    // Count-up via Source Text expression
    var decPart = String(val).split('.')[1], decLen = 0;
    if (decPart) decLen = decPart.length;
    if (curve === 'flicker') {
      v.layer.property('Source Text').expression =
        '(function(){var fmt=' + fmtID.toString() + ';var t0=0.2,t1=1.4,v=' + from + ',e=' + val + ';\n' +
        'var p=(time<t0)?0:(time>=t1)?1:(time-t0)/(t1-t0);var e2=1-Math.pow(1-p,3);\n' +
        'var cur=v+Math.round((e-v)*e2);return ' + JSON.stringify(scene.prefix || '') + ' + fmt(cur,' + decLen + ') + ' + JSON.stringify(scene.suffix || '') + ';})()';
    } else {
      v.layer.property('Source Text').expression = counterExpr(0.2, 1.4, val, scene.prefix || '', scene.suffix || '', from);
    }
    animate(v.layer.transform.scale, 0.2, 0.6, [70,70], [100,100], theme.easing);
    animate(v.layer.opacity, 0.2, 0.6, 0, 100, theme.easing);
    var settle = 1.4;
    // lock pulse: scale 100→106→100
    animate(v.layer.transform.scale, settle, settle+0.15, [100,100], [106,106], 'pop');
    animate(v.layer.transform.scale, settle+0.15, settle+0.3, [106,106], [100,100], theme.easing);
    // accent line under the number
    var lineY = cy + size * 0.5 + 30;
    var accent = rect(comp, {x:CX, y:lineY, w:200, h:8, fill:theme.colors.accent, radius:4, origin:'center', name:'line1', comment:'decor'});
    animate(accent.transform.opacity, settle+0.3, settle+0.5, 0, 100, theme.easing);
    animate(accent.transform.scale, settle+0.3, settle+0.5, [0,100], [100,100], theme.easing);
    // label
    if (scene.label) {
      var lab = text(comp, scene.label, {font:theme.fonts.body,size:56,min:48,color:ink,align:'center',x:CX,y:lineY+60,maxW:850,maxH:150,name:'label'});
      animate(lab.layer.opacity, settle+0.4, settle+0.7, 0, 100, theme.easing);
      settle = Math.max(settle, settle + 0.7);
    }
    // race: second counter racing above
    if (scene.race) {
      var raceVal = scene.race.to, raceFrom = scene.race.from === undefined ? 0 : scene.race.from;
      var raceStr = (scene.prefix || '') + fmtID(raceVal) + (scene.suffix || '');
      var rsize = 160; while (rsize > 56 && measure(raceStr, theme.fonts.display, rsize) > 700) rsize = Math.max(56, Math.floor(rsize*0.94));
      var ry = cy - rsize - 80;
      var rv = text(comp, raceStr, {font:theme.fonts.display,size:rsize,min:rsize,color:theme.colors.muted,align:'center',x:CX,y:ry,maxW:1e6,maxH:220,name:'value'});
      var lead = scene.race.lead === undefined ? 0.3 : scene.race.lead;
      rv.layer.property('Source Text').expression = counterExpr(0.2+lead, 1.2+lead, raceVal, scene.prefix || '', scene.suffix || '', raceFrom);
      animate(rv.layer.opacity, 0.2+lead, 0.6+lead, 0, 100, theme.easing);
      animate(rv.layer.transform.scale, 0.2+lead, 0.6+lead, [70,70], [100,100], theme.easing);
      if (scene.race.label) {
        var rl = text(comp, scene.race.label, {font:theme.fonts.label,size:40,min:36,color:theme.colors.muted,align:'center',x:CX,y:ry+rsize+16,maxW:600,maxH:60,name:'label'});
        animate(rl.layer.opacity, 0.5+lead, 0.9+lead, 0, 100, theme.easing);
      }
    }
    settle = Math.max(settle, 2.2);
    return settle;
  },

  // dotgrid: {count, cols?, rows?, order?, shape?, missing?, label?}
  dotgrid: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var cols = Math.min(21, scene.cols === undefined ? 21 : scene.cols);
    var rows = Math.min(18, scene.rows === undefined ? 18 : scene.rows);
    var total = Math.min(200, cols * rows);
    var litCount = Math.min(total, scene.count === undefined ? total : scene.count);
    var shape = scene.shape || 'dot';
    var order = scene.order || 'row';
    var missing = scene.missing || [];
    var W = SAFE.x1 - SAFE.x0, bandTop = 430, bandBot = SAFE.y1, H = bandBot - bandTop;
    var cell = Math.min(W/cols, H/rows);
    var gridW = cell*cols, gridH = cell*rows;
    var gX = CX - gridW/2 + cell/2, gY = bandTop + (H - gridH)/2;
    // lit order: which indices light up
    var litIdx = [];
    if (order === 'spiral') {
      // deterministic inward spiral; every cell exactly once
      var r0 = 0, r1 = rows-1, c0 = 0, c1 = cols-1;
      while (r0 <= r1 && c0 <= c1) {
        for (var a = c0; a <= c1; a++) litIdx.push(r0*cols+a);
        for (var b = r0+1; b <= r1; b++) litIdx.push(b*cols+c1);
        if (r0 < r1) for (var c = c1-1; c >= c0; c--) litIdx.push(r1*cols+c);
        if (c0 < c1) for (var d = r1-1; d > r0; d--) litIdx.push(d*cols+c0);
        r0++; r1--; c0++; c1--;
      }
      // keep only cells that exist in the drawn grid, then take the first litCount
      var spiral = [];
      for (var si = 0; si < litIdx.length; si++) if (litIdx[si] < total) spiral.push(litIdx[si]);
      litIdx = spiral;
    } else if (order === 'wave') {
      // diagonal sweep
      for (var s = 0; s < cols+rows-1; s++) {
        for (var wr = 0; wr < rows; wr++) {
          var wc = s - wr;
          if (wc >= 0 && wc < cols) { var widx = wr*cols+wc; if (widx < total) litIdx.push(widx); }
        }
      }
    } else {
      // row order
      for (var ri = 0; ri < rows; ri++) for (var ci2 = 0; ci2 < cols; ci2++) {
        var idx = ri*cols+ci2; if (idx < total) litIdx.push(idx);
      }
    }
    // missing indices stay dim
    var dimSet = {};
    for (var mi = 0; mi < missing.length; mi++) dimSet[missing[mi]] = true;
    // only the first litCount cells light up; reveal order: cell index -> position in the sequence
    litIdx = litIdx.slice(0, litCount);
    var litOrder = {};
    for (var lk = 0; lk < litIdx.length; lk++) litOrder[litIdx[lk]] = lk;
    var d = shape === 'square' ? cell*0.4 : cell*0.45;
    // label above grid
    if (scene.label) {
      var lab = text(comp, scene.label, {font:theme.fonts.label,size:48,min:40,color:ink,align:'center',x:CX,y:360,maxW:W,maxH:80,name:'label'});
      animate(lab.layer.opacity, 0.1, 0.4, 0, 100, theme.easing);
    }
    // count number label
    var cnt = text(comp, String(litCount), {font:theme.fonts.display,size:72,min:56,color:theme.colors.accent,align:'center',x:CX,y:270,maxW:300,maxH:120,name:'value'});
    cnt.layer.property('Source Text').expression = counterExpr(0.2, 1.4, litCount, '', '');
    animate(cnt.layer.opacity, 0.2, 0.5, 0, 100, theme.easing);
    var settle = 1.4;
    // dots: shape 'dot'=ellipse, 'bead'=ellipse with stroke, 'square'=rect
    for (var i = 0; i < total; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var x = gX + col*cell, y = gY + row*cell;
      var isMissing = !!dimSet[i];
      var isLit = litOrder[i] !== undefined && !isMissing;
      var fillC = isLit ? theme.colors.accent : (isMissing ? theme.colors.muted : theme.colors.data);
      var op = isLit ? 100 : 35;
      var at = isLit ? 0.3 + (litOrder[i] / (litCount || 1)) * 1.0 : 0.2;
      var el;
      if (shape === 'square') {
        el = rect(comp, {x:x, y:y, w:d, h:d, fill:fillC, stroke:shape==='bead'?ink:null, strokeW:2, radius:0, origin:'center', name:'shape', comment:'decor'});
      } else {
        el = ellipse(comp, {cx:x, cy:y, d:d, fill:fillC, stroke:shape==='bead'?ink:null, strokeW:2, name:'shape', comment:'decor'});
      }
      if (isLit) {
        el.transform.opacity.setValueAtTime(at, 0);
        animate(el.transform.opacity, at, at+0.15, 0, 100, theme.easing);
        animate(el.transform.scale, at, at+0.2, [40,40], [100,100], theme.easing);
        settle = Math.max(settle, at+0.2);
      } else {
        el.transform.opacity.setValue(op*0.5);
        animate(el.transform.opacity, 0.2, 0.5, 0, op*0.5, theme.easing);
      }
    }
    settle = Math.max(settle, 1.8);
    return settle;
  },

  // dial: {value, max?, marks?, labels?, label?, kind?:'clock'|'gauge'|'sun'}
  dial: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var kind = scene.kind || 'gauge';
    var val = scene.value, maxV = scene.max === undefined ? 24 : scene.max;
    var frac = Math.min(1, val / maxV);
    var marksN = scene.marks === undefined ? (kind === 'clock' ? 12 : 24) : scene.marks;
    var cy = 850, r = 280;
    // outer ring
    var ringOuter = ring(comp, {cx:CX, cy:cy, d: r*2, strokeW:4, color:theme.colors.data, name:'shape', comment:'decor'});
    ringOuter.layer.transform.opacity.setValue(50);
    // progress arc (trim)
    var arcR = ring(comp, {cx:CX, cy:cy, d: r*2, strokeW:12, color:theme.colors.accent, name:'shape', comment:'decor'});
    arcR.trim.property('Start').setValue(0);
    animate(arcR.trim.property('End'), 0.2, 1.4, 0, frac*100, theme.easing);
    animate(arcR.layer.opacity, 0.2, 0.5, 0, 100, theme.easing);
    // marks
    var labels = scene.labels || [];
    var labelsArr = [];
    for (var i = 0; i < marksN; i++) {
      var angle = i * (360 / marksN) - 90; // start from top
      var rad = angle * Math.PI / 180;
      var mx = CX + Math.cos(rad) * r, my = cy + Math.sin(rad) * r;
      var isPassed = (i / marksN) <= frac;
      var mkColor = isPassed ? theme.colors.accent : theme.colors.data;
      var mkOp = isPassed ? 100 : 50;
      var mkAt = isPassed ? 0.2 + (i/marksN)*1.2 : 0.2;
      var mk;
      if (kind === 'sun') {
        // sun: rays - use thin lines
        var line = shapeLayer(comp, 'shape');
        var grp = line.property('Contents').addProperty('ADBE Vector Group');
        var rc = grp.property('Contents');
        var rp = rc.addProperty('ADBE Vector Shape - Rect');
        rp.property('Size').setValue([6, 40]); rp.property('Position').setValue([0, 0]);
        var rf = rc.addProperty('ADBE Vector Graphic - Fill'); rf.property('Color').setValue(rgb(mkColor));
        line.transform.anchorPoint.setValue([0,0]); line.transform.position.setValue([mx, my]);
        line.transform.rotation.setValue(angle + 90);
        line.comment = 'decor';
        line.transform.opacity.setValueAtTime(mkAt, 0);
        animate(line.transform.opacity, mkAt, mkAt+0.2, 0, mkOp, theme.easing);
        mk = line;
      } else {
        mk = ellipse(comp, {cx:mx, cy:my, d:kind==='clock'?16:10, fill:mkColor, name:'shape', comment:'decor'});
        mk.transform.opacity.setValueAtTime(mkAt, 0);
        animate(mk.transform.opacity, mkAt, mkAt+0.15, 0, mkOp, theme.easing);
      }
      // labels around dial
      if (i < labels.length && labels[i]) {
        var lx = CX + Math.cos(rad) * (r + 40), ly = cy + Math.sin(rad) * (r + 40);
        var lt = text(comp, labels[i], {font:theme.fonts.label, size:36, min:32, color:ink, align:'center', x:lx, y:ly, maxW:80, maxH:50, name:'mark-label'});
        animate(lt.layer.opacity, mkAt, mkAt+0.3, 0, 100, theme.easing);
      }
    }
    // hand
    var handAngle = frac * 360 - 90;
    var hand = shapeLayer(comp, 'hand');
    var hg = hand.property('Contents').addProperty('ADBE Vector Group');
    var hc = hg.property('Contents');
    var hp = hc.addProperty('ADBE Vector Shape - Rect');
    hp.property('Size').setValue([8, r]); hp.property('Position').setValue([0, -r/2]);
    var hf = hc.addProperty('ADBE Vector Graphic - Fill'); hf.property('Color').setValue(rgb(theme.colors.ink));
    hand.transform.anchorPoint.setValue([0,0]); hand.transform.position.setValue([CX, cy]);
    hand.transform.rotation.setValueAtTime(0.2, -90);
    animate(hand.transform.rotation, 0.2, 1.4, -90, handAngle, theme.easing);
    // center dot
    var cd = ellipse(comp, {cx:CX, cy:cy, d:24, fill:theme.colors.accent, name:'shape', comment:'decor'});
    animate(cd.transform.scale, 0.2, 0.5, [70,70], [100,100], theme.easing);
    // value in center
    var vText = text(comp, fmtID(val) + (maxV !== 24 ? '/' + fmtID(maxV) : ''), {font:theme.fonts.display, size:80, min:56, color:ink, align:'center', x:CX, y:cy-120, maxW:200, maxH:100, name:'value'});
    animate(vText.layer.opacity, 1.0, 1.4, 0, 100, theme.easing);
    // label below
    var settle = 1.4;
    if (scene.label) {
      var dl = text(comp, scene.label, {font:theme.fonts.label, size:48, min:40, color:ink, align:'center', x:CX, y:cy+r+60, maxW:600, maxH:80, name:'label'});
      animate(dl.layer.opacity, settle, settle+0.3, 0, 100, theme.easing);
      settle += 0.3;
    }
    return Math.max(settle, 1.4);
  },

  // orbit: {rings:[{r,count,speed}], centre?, centreText?, tilt?, settleAt?}
  orbit: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var cx = CX, cy = 900;
    var tilt = scene.tilt === undefined ? 0.55 : scene.tilt;
    var settleAt = scene.settleAt === undefined ? 0.8 : scene.settleAt;
    // centre
    var centreType = scene.centre || 'dot';
    if (centreType === 'dot') {
      var cd = ellipse(comp, {cx:cx, cy:cy, d:60, fill:ink, name:'shape', comment:'decor'});
      animate(cd.transform.scale, 0.1, 0.4, [70,70], [100,100], theme.easing);
      animate(cd.transform.opacity, 0.1, 0.4, 0, 100, theme.easing);
    } else if (centreType === 'word' && scene.centreText) {
      var ct = text(comp, scene.centreText, {font:theme.fonts.display, size:64, min:48, color:ink, align:'center', x:cx, y:cy-24, maxW:300, maxH:80, name:'value'});
      animate(ct.layer.opacity, 0.1, 0.4, 0, 100, theme.easing);
      animate(ct.layer.transform.scale, 0.1, 0.4, [70,70], [100,100], theme.easing);
    }
    var rings = scene.rings || [];
    var settle = 0;
    for (var i = 0; i < rings.length; i++) {
      var spec = rings[i];
      var rr = spec.r || 100;
      var count = spec.count || 4;
      var speed = spec.speed === undefined ? 1 : spec.speed;
      var ringAt = 0.3 + i * 0.2;
      // ring track
      var track = ring(comp, {cx:cx, cy:cy, d:rr*2, strokeW:3, color:ink, name:'shape', comment:'decor'});
      track.layer.transform.opacity.setValue(40);
      track.layer.transform.opacity.setValueAtTime(ringAt, 0);
      animate(track.layer.transform.opacity, ringAt, ringAt+0.3, 0, 40, theme.easing);
      // orbiting bodies
      for (var b = 0; b < count; b++) {
        var angle = (b / count) * 360 - 90;
        var rad = angle * Math.PI / 180;
        var bx = cx + Math.cos(rad) * rr;
        var by = cy + Math.sin(rad) * rr * tilt;
        var bd = 20;
        var body = ellipse(comp, {cx:bx, cy:by, d:bd, fill:ink, name:'shape', comment:'decor'});
        body.transform.opacity.setValueAtTime(ringAt, 0);
        animate(body.transform.opacity, ringAt, ringAt+0.2, 0, 100, theme.easing);
        // soft trail via scale pulse
        animate(body.transform.scale, ringAt, ringAt+0.5, [70,70], [100,100], theme.easing);
        // orbit: sample the circle so the body actually travels `speed` turns
        if (speed) {
          var steps = 24, spin = 360 * speed, orbitEnd = Math.max(dur, ringAt + 1);
          for (var s = 0; s <= steps; s++) {
            var a = (angle + spin * (s / steps)) * Math.PI / 180;
            body.transform.position.setValueAtTime(ringAt + (s / steps) * (orbitEnd - ringAt), [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * tilt]);
          }
        }
        settle = Math.max(settle, ringAt + 0.5);
      }
    }
    settle = Math.max(settle, settleAt);
    return settle;
  },

  // cards: {cards:[{text,sub?}], cols?, order?, flip?, checks?, stagger?}
  cards: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var cards = scene.cards || [];
    var cols = Math.min(3, scene.cols === undefined ? 3 : scene.cols);
    var n = cards.length;
    var stagger = scene.stagger === undefined ? 0.3 : scene.stagger;
    // entrance order: row (index order) or random (deterministic shuffle)
    var rank = {};
    for (var si = 0; si < n; si++) rank[si] = si;
    if (scene.order === 'random') {
      var seq = []; for (var sq = 0; sq < n; sq++) seq.push(sq);
      var seed = (n * 7919 + 104729) % 2147483647;
      for (var sj = n - 1; sj > 0; sj--) {
        seed = (seed * 48271) % 2147483647;
        var sk = seed % (sj + 1), tmp = seq[sj]; seq[sj] = seq[sk]; seq[sk] = tmp;
      }
      for (var sr = 0; sr < n; sr++) rank[seq[sr]] = sr;
    }
    var cardW = (SAFE.x1 - SAFE.x0) / cols - 20;
    var rows = Math.ceil(n / cols);
    var cardH = Math.min(320, (SAFE.y1 - SAFE.y0 - 60) / rows);
    var startX = SAFE.x0 + (SAFE.x1 - SAFE.x0 - cardW*cols - 20*(cols-1)) / 2;
    var gridH = rows * cardH + (rows - 1) * 40;
    var startY = Math.max(SAFE.y0, (SAFE.y0 + SAFE.y1) / 2 - gridH / 2);
    var settle = 0;
    for (var i = 0; i < n; i++) {
      var card = cards[i];
      var col = i % cols, row = Math.floor(i / cols);
      var cx = startX + col*(cardW+20) + cardW/2;
      var cy = startY + row*(cardH+40) + cardH/2;
      var at = 0.2 + rank[i] * stagger;
      var end = at + 0.4;
      // card rect
      var cardFill = i < 1 && scene.bg !== 'accent' ? theme.colors.accent : null;
      var cRect = rect(comp, {x:cx, y:cy, w:cardW, h:cardH, fill:cardFill, stroke:cardFill?null:ink, strokeW:3, radius:12, origin:'center', name:'card-rect'+(i+1), comment:'decor'});
      animate(cRect.transform.position, at, end, [cx, cy+60], [cx, cy], theme.easing);
      animate(cRect.transform.opacity, at, end, 0, 100, theme.easing);
      if (card.sub) {
        var subRes = text(comp, card.sub, {font:theme.fonts.label, size:36, min:32, color:cardFill ? onColor(theme, cardFill) : ink, align:'center', x:cx, y:cy - 30, maxW:cardW-20, maxH:60, name:'card-sub'+(i+1)});
        animate(subRes.layer.opacity, at, end, 0, 100, theme.easing);
      }
      var tRes = text(comp, card.text, {font:theme.fonts.display, size:44, min:26, color:cardFill ? onColor(theme, cardFill) : ink, align:'center', x:cx, y:cy, maxW:cardW-30, maxH:cardH-60, name:'card-text'+(i+1)});
      animate(tRes.layer.opacity, at, end, 0, 100, theme.easing);
      settle = Math.max(settle, end);
      // flip
      if (scene.flip) {
        animate(cRect.transform.scale, end, end+0.4, [100,100], [100,60], 'smooth');
        animate(cRect.transform.scale, end+0.4, end+0.7, [100,60], [100,100], 'smooth');
      }
      // check mark landing
      var checks = scene.checks || [];
      if (checks.indexOf(i) >= 0) {
        var ckAt = end + 0.3;
        var ck = text(comp, '\u2713', {font:theme.fonts.display, size:48, min:48, color:theme.colors.accent, align:'center', x:cx+cardW/2-30, y:cy+cardH/2-60, maxW:60, maxH:60, name:'card-check'+(i+1)});
        animate(ck.layer.opacity, ckAt, ckAt+0.2, 0, 100, theme.easing);
        animate(ck.layer.transform.scale, ckAt, ckAt+0.3, [70,70], [100,100], 'pop');
        settle = Math.max(settle, ckAt+0.3);
      }
    }
    return Math.max(settle, 1.5);
  },

  // timeline: {span:{start,end,unit}, events:[{at:0..1,label}], runner?, fillTo?}
  timeline: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var span = scene.span || {};
    var events = scene.events || [];
    var runnerType = scene.runner || 'light';
    var fillTo = scene.fillTo === undefined ? 1 : scene.fillTo;
    var barX = SAFE.x0, barY = 950, barW = SAFE.x1 - SAFE.x0, barH = 20;
    var spanLabel = span.start + (span.unit ? ' ' + span.unit : '') + ' \u2013 ' + span.end + (span.unit ? ' ' + span.unit : '');
    var settle = 0;
    // timeline bar (track)
    var trackRect = rect(comp, {x:CX, y:barY, w:barW, h:barH, fill:theme.colors.data, radius:barH/2, origin:'center', name:'line1', comment:'decor'});
    trackRect.transform.opacity.setValue(40);
    // fill bar
    var fillRect = rect(comp, {x:barX, y:barY, w:barW*fillTo, h:barH, fill:theme.colors.accent, radius:barH/2, origin:'left', name:'line2', comment:'decor'});
    animate(fillRect.transform.scale, 0.3, 1.5, [0,100], [100,100], theme.easing);
    animate(fillRect.transform.opacity, 0.3, 0.5, 0, 100, theme.easing);
    settle = Math.max(settle, 1.5);
    // span label above
    var sl = text(comp, spanLabel, {font:theme.fonts.label, size:40, min:36, color:ink, align:'center', x:CX, y:barY-60, maxW:barW, maxH:60, name:'label'});
    animate(sl.layer.opacity, 0.2, 0.5, 0, 100, theme.easing);
    // events
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var evX = Math.min(SAFE.x1 - 20, Math.max(SAFE.x0 + 20, barX + ev.at * barW));
      var at = 0.5 + i*0.15;
      var evEnd = at + 0.3;
      // event mark
      var em = ellipse(comp, {cx:evX, cy:barY, d:28, fill:theme.colors.accent, stroke:ink, strokeW:3, name:'shape', comment:'decor'});
      animate(em.transform.scale, at, evEnd, [70,70], [100,100], 'pop');
      animate(em.transform.opacity, at, evEnd, 0, 100, theme.easing);
      // event label
      if (ev.label) {
        var el = text(comp, ev.label, {font:theme.fonts.body, size:36, min:32, color:ink, align:'center', x:Math.min(SAFE.x1 - 80, Math.max(SAFE.x0 + 80, evX)), y:barY+40, maxW:160, maxH:50, name:'event-label'+(i+1)});
        animate(el.layer.opacity, evEnd, evEnd+0.2, 0, 100, theme.easing);
        settle = Math.max(settle, evEnd+0.2);
      }
    }
    // runner: one light dot traveling the bar
    if (runnerType === 'light') {
      var rd = ellipse(comp, {cx:barX, cy:barY, d:14, fill:theme.colors.accent, name:'shape', comment:'decor'});
      rd.transform.opacity.setValueAtTime(0.3, 0);
      animate(rd.transform.position, 0.3, 1.5, [barX, barY], [barX + barW*fillTo, barY], 'smooth');
      animate(rd.transform.opacity, 0.3, 0.5, 0, 100, theme.easing);
      animate(rd.transform.opacity, 1.3, 1.5, 100, 0, theme.easing);
    }
    settle = Math.max(settle, 1.8);
    return settle;
  },

  // particles: {count?, target?, text?, gatherAt?, scatterAt?, drift?}
  particles: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var count = Math.min(120, scene.count === undefined ? 120 : scene.count);
    var target = scene.target || 'circle';
    var textStr = scene.text || '';
    var gatherAt = scene.gatherAt === undefined ? 0.1 : scene.gatherAt;
    var gatherEnd = 0.8;
    var scatterAt = scene.scatterAt === undefined ? Math.max(1.4, dur - 2.0) : scene.scatterAt;
    var drift = scene.drift === undefined ? 1 : scene.drift;
    var cx = CX, cy = 850;
    // show target word
    if (target === 'word' && textStr) {
      var tw = text(comp, textStr, {font:theme.fonts.display, size:120, min:72, color:ink, align:'center', x:CX, y:850, maxW:850, maxH:200, name:'text'});
      tw.layer.opacity.setValueAtTime(gatherEnd, 0);
      animate(tw.layer.opacity, gatherEnd, gatherEnd+0.3, 0, 100, theme.easing);
    } else if (target === 'circle') {
      var cr = ring(comp, {cx:cx, cy:cy, d:300, strokeW:4, color:theme.colors.accent, name:'shape', comment:'decor'});
      cr.layer.opacity.setValueAtTime(gatherEnd, 0);
      animate(cr.layer.opacity, gatherEnd, gatherEnd+0.3, 0, 80, theme.easing);
    }
    // deterministic particle positions
    var settle = 0;
    for (var i = 0; i < count; i++) {
      // seeded pseudo-random positions using index
      var angle = (i / count) * 360 * Math.PI / 180;
      var radius = (i % 7 === 0) ? 200 : (i % 3 === 0) ? 120 : 60;
      var startX = cx + Math.cos(angle) * (radius + 200*drift);
      var startY = cy + Math.sin(angle) * (radius + 200*drift) * 0.6;
      var endX, endY;
      if (target === 'word' && textStr) {
        var wr = 90 + ((i * 37) % 120);
        endX = cx + Math.cos(angle) * wr;
        endY = cy + Math.sin(angle) * wr * 0.6;
      } else if (target === 'circle') {
        var cr2 = 120 + ((i * 37) % 90);
        endX = cx + Math.cos(angle) * cr2;
        endY = cy + Math.sin(angle) * cr2;
      } else {
        endX = cx; endY = cy;
      }
      var pd = 6 + (i%4)*2;
      var p = ellipse(comp, {cx:startX, cy:startY, d:pd, fill:theme.colors.accent, name:'shape', comment:'decor'});
      p.transform.opacity.setValueAtTime(0, 0);
      // gather
      animate(p.transform.position, gatherAt, gatherEnd, [startX, startY], [endX, endY], 'smooth');
      animate(p.transform.opacity, gatherAt, gatherAt+0.2, 0, 60, theme.easing);
      // scatter
      var scX = endX + Math.cos(angle)*250*drift, scY = endY + Math.sin(angle)*200*drift;
      animate(p.transform.position, scatterAt, scatterAt+0.5, [endX, endY], [scX, scY], 'calm');
      animate(p.transform.opacity, scatterAt, scatterAt+0.4, 60, 0, 'calm');
      settle = Math.max(settle, scatterAt+0.5);
    }
    settle = Math.max(settle, scatterAt+0.5);
    return settle;
  },

  // zoom: {levels:[{label,kind:'dot'|'grid'|'rings',n}], speed?, holdAt?}
  zoom: function (comp, theme, scene, dur) {
    var ink = textColor(theme, scene);
    var levels = scene.levels || [];
    var speed = scene.speed === undefined ? 1 : scene.speed;
    var holdAt = scene.holdAt === undefined ? 0.8 : scene.holdAt;
    var nLevels = levels.length;
    var settle = 0;
    var cx = CX, cy = 900;
    var prevLabel = null;
    for (var i = 0; i < nLevels; i++) {
      var lv = levels[i];
      var at = 0.2 + i * (holdAt * speed);
      var end = at + holdAt * speed;
      var kind = lv.kind || 'dot';
      var n = lv.n === undefined ? 1 : lv.n;
      if (kind === 'dot') {
        var dot = ellipse(comp, {cx:cx, cy:cy, d:Math.min(100, 60 + i*40), fill:ink, name:'shape', comment:'decor'});
        animate(dot.transform.scale, at, end, [200,200], [100,100], 'calm');
        animate(dot.transform.opacity, at, at+0.2, 0, 100, theme.easing);
      } else if (kind === 'grid') {
        var gCols = Math.ceil(Math.sqrt(n)), gRows = Math.ceil(n / gCols), gCell = Math.min(120, 420 / Math.max(1, gCols - 1));
        var gX0 = cx - (gCols-1)*gCell/2, gY0 = cy - (gRows-1)*gCell*0.6/2;
        for (var gi = 0; gi < n; gi++) {
          var gx = gX0 + (gi % gCols)*gCell, gy = gY0 + Math.floor(gi / gCols)*gCell*0.6;
          var gdot = ellipse(comp, {cx:gx, cy:gy, d:16, fill:ink, name:'shape', comment:'decor'});
          gdot.transform.opacity.setValueAtTime(at, 0);
          animate(gdot.transform.opacity, at, at+0.3, 0, 100, theme.easing);
          animate(gdot.transform.scale, at, at+0.3, [200,200], [100,100], 'calm');
        }
      } else if (kind === 'rings') {
        for (var ri = 0; ri < n; ri++) {
          var rr = 90 + ri*80;
          var rr2 = ring(comp, {cx:cx, cy:cy, d:rr*2, strokeW:4, color:ink, name:'shape', comment:'decor'});
          rr2.layer.transform.opacity.setValueAtTime(at, 0);
          animate(rr2.layer.opacity, at, at+0.3, 0, ri===n-1?100:60, theme.easing);
          animate(rr2.layer.transform.scale, at, at+0.4, [150,150], [100,100], 'calm');
          rr2.trim.property('Start').setValue(0);
          rr2.trim.property('End').setValueAtTime(at, 0);
          animate(rr2.trim.property('End'), at, end, 0, 100, theme.easing);
        }
      }
      // level label
      if (lv.label) {
        var ll = text(comp, lv.label, {font:theme.fonts.label, size:44, min:36, color:ink, align:'center', x:CX, y:cy + 350, maxW:600, maxH:60, name:'line'+(i+1)});
        animate(ll.layer.opacity, at+0.3, end, 0, 100, theme.easing);
        if (prevLabel) animate(prevLabel.layer.opacity, at, at+0.2, 100, 0, theme.easing);
        prevLabel = ll;
      }
      settle = Math.max(settle, end);
    }
    // camera pull-back simulation: overall scale of all layers
    // Simulated by scaling the last set of elements down slightly at the end
    var finalAt = settle;
    var finalEnd = settle + 0.5;
    for (var li = 1; li <= comp.numLayers; li++) {
      var l = comp.layer(li);
      if (l.comment !== 'bg') {
        animate(l.transform.scale, finalAt, finalEnd, [100,100], [95,95], 'calm');
      }
    }
    settle = Math.max(settle, finalEnd);
    return Math.max(settle, 1.5);
  }
};

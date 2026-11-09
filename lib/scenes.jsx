var SCENES = {
  hook: function (comp, theme, scene, dur) {
    var x = theme.align === 'center' ? CX : SAFE.x0;
    var t = text(comp, scene.text, {font:theme.fonts.display, size:120, min:48, color:theme.colors.ink, align:theme.align === 'center' ? 'center' : 'left', x:x, y:700, maxW:850, maxH:500, name:'text'});
    revealText(t.layer, 0.15, Math.min(0.55, dur * 0.25), theme.easing);
    if (scene.emphasis) colorRange(t.layer, scene.text.toLowerCase().indexOf(scene.emphasis.toLowerCase()), scene.text.toLowerCase().indexOf(scene.emphasis.toLowerCase()) + scene.emphasis.length, theme.colors.accent);
    return 0.15 + Math.min(0.55, dur * 0.25);
  }
};

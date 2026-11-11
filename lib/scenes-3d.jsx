// scenes-3d: 3D model scene type (ES5, concatenated into ExtendScript)
// Each returns settle seconds. Content inside SAFE. Deterministic. No Math.random.
var SCENES_3D = {
  // model: {src, scale?, spin?, tilt?, position?, light?, fill?, fade?}
  model: function (comp, theme, scene, dur) {
    var absPath = scene.__src;
    var f = new File(absPath);
    var opts = new ImportOptions(f);
    var item = app.project.importFile(opts);
    var l = comp.layers.add(item);
    l.name = 'model';
    l.comment = 'decor';

    // Transform defaults
    var sc = (scene.scale === undefined || !isFinite(scene.scale)) ? 55 : scene.scale;
    var tilt = (scene.tilt === undefined || !isFinite(scene.tilt)) ? -22 : scene.tilt;
    var pos = (Array.isArray(scene.position) && scene.position.length === 2) ? scene.position : [540, 960];

    l.transform.scale.setValue([sc, sc, sc]);
    l.property("Transform").property("X Rotation").setValue(tilt);
    l.transform.position.setValue([pos[0], pos[1], 0]);

    // Spin animation
    var spin = (scene.spin === undefined || !isFinite(scene.spin)) ? 0 : scene.spin;
    if (spin !== 0) {
      animate(l.property("Transform").property("Y Rotation"), 0, dur, 0, spin, theme.easing);
    }

    // Lighting rig: without lights the model reads as a flat silhouette.
    var keyIntensity = (scene.light === undefined || !isFinite(scene.light)) ? 100 : scene.light;
    var fillIntensity = (scene.fill === undefined || !isFinite(scene.fill)) ? 25 : scene.fill;
    if (keyIntensity !== 0) {
      var keyLight = comp.layers.addLight('key', [700, 200]);
      keyLight.comment = 'decor'; // lights have no sourceRect; checkSafe must skip them
      keyLight.lightType = 4412; // Parallel
      keyLight.property('Intensity').setValue(keyIntensity);
    }
    if (fillIntensity !== 0) {
      var fillLight = comp.layers.addLight('fill', [200, 1000]);
      fillLight.comment = 'decor';
      fillLight.lightType = 4415; // Ambient
      fillLight.property('Intensity').setValue(fillIntensity);
    }

    // Fade in
    var fade = scene.fade !== false;
    if (fade) {
      animate(l.transform.opacity, 0, 0.35, 0, 100, theme.easing);
    }

    return Math.max(0.35, dur * 0.6);
  }
};

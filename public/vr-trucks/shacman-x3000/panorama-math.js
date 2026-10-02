/* Camera convention: +X right, +Y down, +Z front; angles in degrees. */
(function (root) {
  const radians = degrees => degrees * Math.PI / 180;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function camera(yaw, pitch, fov, width, height) {
    const h = radians(yaw), v = radians(pitch);
    return {
      right: [Math.cos(h), 0, -Math.sin(h)],
      down: [-Math.sin(h) * Math.sin(v), Math.cos(v), -Math.cos(h) * Math.sin(v)],
      forward: [Math.sin(h) * Math.cos(v), Math.sin(v), Math.cos(h) * Math.cos(v)],
      focal: Math.max(width, height * 4 / 3) / (2 * Math.tan(radians(fov) / 2))
    };
  }
  function project(yaw, pitch, view, width, height) {
    const h = radians(yaw), v = radians(pitch);
    const direction = [Math.sin(h) * Math.cos(v), Math.sin(v), Math.cos(h) * Math.cos(v)];
    const dot = axis => direction.reduce((sum, value, i) => sum + value * axis[i], 0);
    const depth = dot(view.forward);
    if (depth <= 0) return null;
    return { x: width / 2 + view.focal * dot(view.right) / depth, y: height / 2 + view.focal * dot(view.down) / depth };
  }
  const api = { camera, project, clamp };
  if (typeof module !== 'undefined') module.exports = api;
  else root.PanoMath = api;
})(typeof window === 'undefined' ? this : window);

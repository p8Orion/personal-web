/** Same planar fade the floor shader uses. Keep Ground and structures on these numbers. */
export const GRID_FADE = {
  start: 24,
  end: 88,
  startSkip: 16,
  endSkip: 62,
} as const

export function fadeRange(skipFx: boolean): { start: number; end: number } {
  return skipFx
    ? { start: GRID_FADE.startSkip, end: GRID_FADE.endSkip }
    : { start: GRID_FADE.start, end: GRID_FADE.end }
}

/**
 * How long a surface stays opaque relative to its horizon fade. 1 = dissolves
 * along with it. Higher keeps floor and boxes occluding the Z-panel almost to
 * the horizon, then dissolves them in the last stretch instead of leaving flat
 * bg-colored shapes stamped over the nebula.
 */
export const SOLID_RAMP = 6

export const HORIZON_FADE_GLSL = /* glsl */ `
float gridPlanarDist(vec3 worldPos, vec3 camPos) {
  return length(worldPos.xz - camPos.xz);
}

float gridHorizon(vec3 worldPos, vec3 camPos) {
  float dist = gridPlanarDist(worldPos, camPos);
  return smoothstep(0.0, 0.1, camPos.y / max(dist, 0.001));
}

float gridMajorFade(vec3 worldPos, vec3 camPos, float fadeStart, float fadeEnd) {
  float dist = gridPlanarDist(worldPos, camPos);
  return (1.0 - smoothstep(fadeStart * 0.65, fadeEnd, dist)) * gridHorizon(worldPos, camPos);
}

float gridSolid(float fade) {
  return min(1.0, fade * ${SOLID_RAMP.toFixed(2)});
}
`

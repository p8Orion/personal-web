/** Shared grid-line falloff. Ground and building edges must stay identical. */

export const GRID_GLOW_LINE_GLSL = /* glsl */ `
  float glowLineFalloff(float d, float fw, float size, float coreWidth, float haloWidth) {
    float glow = max(uGlow, 0.05);
    float lod = 1.0 - smoothstep(size * 0.1, size * 0.42, fw);
    float haloKeep = 1.0 - smoothstep(size * 0.03, size * 0.18, fw);
    float haloW = mix(haloWidth * 0.12, haloWidth, haloKeep) * glow;
    float core = exp(-pow(d / max(coreWidth * glow + fw * 0.3, 1e-5), 2.0));
    float halo = exp(-pow(d / max(haloW + fw * 0.5, 1e-5), 2.0));
    return max(core, halo * 0.38 * haloKeep) * lod;
  }

  float glowLine(float coord, float size, float coreWidth, float haloWidth) {
    float d = abs(fract(coord / size - 0.5) - 0.5) * size;
    return glowLineFalloff(d, fwidth(coord), size, coreWidth, haloWidth);
  }
`

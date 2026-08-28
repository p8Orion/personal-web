import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from 'three'
import { PANEL_ALPHA, PANEL_GHOST_ALPHA, PRIMARY_HUE_AT_Z0 } from '../content/debug.ts'

export const COLORS = {
  bg: '#050706',
  phosphor: '#7cffb2',
  phosphorDim: '#1c3d30',
  cyan: '#7ee0e0',
  amber: '#e8b86d',
  metal: '#0c1612',
} as const

/**
 * SC_1 sits next to PRIMARIO. SC_2 is a near-opposite of that neighbour
 * (210° from SC_1, not 180°) so the pair contrasts without fighting the grid.
 */
export const SC_1_HUE = 20 / 360
export const SC_2_HUE = 160 / 360

export function wrapHue(hue: number): number {
  return ((hue % 1) + 1) % 1
}

export function hueToCss(
  hue: number,
  sat = 0.82,
  light = 0.55,
  alpha?: number,
): string {
  const h = Math.round(wrapHue(hue) * 360)
  const s = Math.round(sat * 100)
  const l = Math.round(light * 100)
  if (alpha === undefined) return `hsl(${h} ${s}% ${l}%)`
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

/** HUD + copy panels: SC_2 hue, grayish chrome, accents at full SC_2. */
export function applySc1Ui(hue: number, style: CSSStyleDeclaration): void {
  style.setProperty('--phosphor', hueToCss(hue, 0.82, 0.55))
  style.setProperty('--phosphor-dim', hueToCss(hue, 0.22, 0.22))
  style.setProperty('--text', hueToCss(hue, 0.16, 0.82))
  style.setProperty('--text-dim', hueToCss(hue, 0.12, 0.52))
  style.setProperty('--panel', hueToCss(hue, 0.1, 0.05, PANEL_ALPHA))
  style.setProperty('--panel-ghost', hueToCss(hue, 0.1, 0.05, PANEL_GHOST_ALPHA))
  style.setProperty('--line', hueToCss(hue, 0.28, 0.55, 0.28))
  style.setProperty('--cyan', hueToCss(hue, 0.22, 0.62))
}

const hueColor = new Color()

export function hueToRgb(
  hue: number,
  sat = 0.82,
  light = 0.55,
): [number, number, number] {
  hueColor.setHSL(wrapHue(hue), sat, light)
  return [hueColor.r, hueColor.g, hueColor.b]
}

export type PaletteName = 'PRIMARIO' | 'SC_1' | 'SC_2'

export function paletteHues(primario: number): Record<PaletteName, number> {
  const PRIMARIO = wrapHue(primario + PRIMARY_HUE_AT_Z0)
  return {
    PRIMARIO,
    SC_1: wrapHue(PRIMARIO + SC_1_HUE),
    SC_2: wrapHue(PRIMARIO + SC_2_HUE),
  }
}

/** Extra swatches shown in the debug dots (not used on the grid). */
export const DEBUG_SWATCHES: PaletteName[] = ['SC_1', 'SC_2']

const CODE_LINES = [
  'fn boot_sequence() {',
  '  init_gpu();',
  '  mount_hud();',
  '  sync_clock();',
  '}',
  '',
  'loop {',
  '  read_scroll();',
  '  lerp_camera();',
  '  present_frame();',
  '}',
  '',
  '// no gltf. primitives only.',
  'const dpr = cap(1.5);',
  'fog.set("#050706", 12, 42);',
]

export function createCodeTexture(): CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  ctx.fillStyle = '#070b09'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#7cffb2'
  ctx.globalAlpha = 0.18
  ctx.fillRect(0, 0, size, 3)
  ctx.globalAlpha = 1
  ctx.font = '18px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillStyle = '#7cffb2'

  let y = 26
  let index = 0
  while (y < size - 6) {
    const line = CODE_LINES[index % CODE_LINES.length]
    ctx.globalAlpha = line.startsWith('//') ? 0.5 : 0.92
    ctx.fillText(line, 18, y)
    y += 22
    index += 1
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

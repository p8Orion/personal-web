import { SECTIONS } from '../scene/stations.ts'

/** Color dots, top-right. */
export const DEBUG_PALETTE = false

/** Rotating cube in the Z-panel. */
export const DEBUG_STAGE_CUBE = false

/** Building clusters on the grid. */
export const DEBUG_BUILDINGS = true

/**
 * Z windows. Inclusive ranges where each layer is on stage.
 * Fade knobs live with their layer below.
 */
export const GRID_Z_START = 0
export const GRID_Z_END = 1

export const FRACTAL_Z_START = 0.08
export const FRACTAL_Z_END = 0.5

export const MATRIX_Z_START = 0.4
export const MATRIX_Z_END = 0.8

export const NEBULA_Z_START = 0.75
export const NEBULA_Z_END = 1

/** PRIMARIO hue at Z = 0, in turns. Walks one full turn as Z goes 0 → 1. */
export const PRIMARY_HUE_AT_Z0 = 330 / 360

/** Peak opacity. 1 = solid. */
export const FRACTAL_ALPHA = 0.6

/** Zoom pace across the fractal window. 1 = uses the whole window. */
export const FRACTAL_ZOOM_SPEED = 1

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const FRACTAL_Z_FADE = 0.2

/** Edge fade in UV 0–0.5. Desktop: four sides; mobile: bottom only. */
export const FRACTAL_EDGE_FADE = 0.5

/** Zoom-axis seed. 0 = shallow, 1 = already at max zoom. */
export const FRACTAL_SEED = 0.3

/** Hue walk across the fractal window, in turns. 1 = a full circle. */
export const FRACTAL_HUE_SPAN = 1

/** Spin across the fractal window, in turns. Negative = reverse. */
export const FRACTAL_SPIN = 1

/** Peak opacity. 1 = solid. */
export const MATRIX_ALPHA = 0.55

/** Glyph scroll. 2 = twice as fast. */
export const MATRIX_SPEED = 1.5

/** Trail hold. 1 = short wipe; higher = longer streaks + persistence. */
export const MATRIX_TRAIL = 2.5

/** Fade-in/out in Z. 0 = hard cut. */
export const MATRIX_Z_FADE = 0.08

/** Edge fade in UV 0–0.5. Desktop: four sides; mobile: bottom only. */
export const MATRIX_EDGE_FADE = 0.16

/** Hue walk across the matrix window, in turns. 1 = a full circle. */
export const MATRIX_HUE_SPAN = 1

/** Desktop glyph-row density. 1 = same as mobile; 2 = twice as many rows. */
export const MATRIX_DENSITY_DESKTOP = 4

/** Peak opacity. 1 = solid. */
export const NEBULA_ALPHA = 0.8

/** CCW turns across the nebula window. Negative = clockwise. */
export const NEBULA_SPIN = 0.4

/** Spin pole, viewport X. 0 = left edge. Negative = off-screen. */
export const NEBULA_PIVOT_X = 0

/** Spin pole as a fraction of Z-panel height. 0.5 = middle. */
export const NEBULA_PIVOT_Y = 0.5

/** Orbit radius in viewport widths, pole → photo center. */
export const NEBULA_RADIUS = 1

/** Photo zoom. 1 = covers the Z-panel. */
export const NEBULA_ZOOM = 2

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const NEBULA_Z_FADE = 0.05

/** Edge fade in UV 0–0.5. Desktop: four sides; mobile: bottom only. */
export const NEBULA_EDGE_FADE = 0.16

/** Soft crop of the photo, as a fraction of its radius. 0 = hard square. */
export const NEBULA_SOFT_EDGE = 0.45

/** Hue walk of SC_1 on field stars, in turns. */
export const NEBULA_HUE_SPAN = 1

/** Field stars. 0 = nebula only. */
export const NEBULA_STAR_COUNT = 180

/** Twinkle speed. 2 = twice as fast. */
export const NEBULA_TWINKLE = 1

/** Page length in viewports: SECTIONS.length / this. Grid and camera follow. */
export const SCROLL_SPEED = 1 / 2

/** Cards fly in/out within CARD_Z. 0 = cut (no travel). */
export const SCROLL_STICK = 1

/** Travel per leg. 1 = far edge just clears the fold. */
export const SCROLL_TRAVEL = 1

/** Scale at belt edges. 1 = no shrink. Center is always 1. */
export const SCROLL_BELT_SCALE = 0.8

/** rotateX at belt edges, degrees. Far edge leans away. */
export const SCROLL_BELT_TILT = 10

/** Opacity at belt edges. 1 = no fade. */
export const SCROLL_BELT_FADE = 0.7

/** CARD_Z split: fly-in / stick / fly-out. 1 → thirds. */
export const SCROLL_STICK_DURATION = 1

/** Eyebrow sweep length, seconds. */
export const SHINE_DURATION = 0.9

/** Sweep strength 0–1. White band, width, and glow. */
export const SHINE_STRENGTH = 0.95

/** Sweeps per card. Each costs another SHINE_DURATION. */
export const SHINE_REPEATS = 2

/** Photo modal edge fade, % of its size. 0 = hard square; higher = rounder + softer. */
export const PIC_FEATHER = 8

/** Zoom from the thumbnail to the modal, seconds. */
export const PIC_OPEN_TIME = 0.5

/** Zoom back on close, seconds. */
export const PIC_EXIT_TIME = 0.5

export function applyDebugVars(): void {
  const root = document.documentElement.style
  const speed = Math.min(2, Math.max(0.08, SCROLL_SPEED))
  const strength = Math.min(1, Math.max(0, SHINE_STRENGTH))
  const band = 0.3 + strength * 0.4

  root.setProperty('--scroll-speed', String(speed))
  root.setProperty('--page-length', String(SECTIONS.length / speed))
  root.setProperty('--shine-duration', `${Math.max(0, SHINE_DURATION)}s`)
  root.setProperty('--shine-strength', String(strength))
  root.setProperty('--shine-repeats', String(Math.max(1, Math.round(SHINE_REPEATS))))
  root.setProperty('--shine-band', `${band * 100}%`)
  root.setProperty('--shine-from', `${(-band / (1 - band)) * 100}%`)
  root.setProperty('--shine-to', `${(1 / (1 - band)) * 100}%`)
  root.setProperty('--pic-feather', `${Math.min(49, Math.max(0, PIC_FEATHER))}%`)
}

/** Floor-line spread. 0.5 = tighter, 2 = wider glow. */
export const GRID_GLOW = 1

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const GRID_Z_FADE = 0.03

/** Card background opacity. Blur stays even at 0. */
export const PANEL_ALPHA = 0.8

/** Same for the ghost variant (intro). */
export const PANEL_GHOST_ALPHA = 0.42

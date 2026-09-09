import { SECTIONS } from '../scene/stations.ts'

/** Color dots, top-right. */
export const DEBUG_PALETTE = false

/** Rotating cube in the Z-panel. */
export const DEBUG_STAGE_CUBE = false

/** Building clusters on the grid. */
export const DEBUG_BUILDINGS = true

/** City layout seed. Negative = a fresh random city on every load. */
export const CITY_SEED = -1

/** Bias toward low buildings. 1 = every height equally likely; higher = more low. */
export const CITY_HEIGHT_BIAS = 3.5

/** Same for the footprint. Higher = more 1x1 boxes, fewer wide ones. */
export const CITY_BASE_BIAS = 2.2

/**
 * Z windows. Inclusive ranges where each layer is on stage.
 * Fade knobs live with their layer below.
 */
export const GRID_Z_START = 0
export const GRID_Z_END = 1

export const FRACTAL_Z_START = 0.025
export const FRACTAL_Z_END = 0.45

export const MATRIX_Z_START = 0.4
export const MATRIX_Z_END = 0.8

export const NEBULA_Z_START = 0.75
export const NEBULA_Z_END = 1.05

/** PRIMARIO hue at Z = 0, in turns. Walks one full turn as Z goes 0 → 1. */
export const PRIMARY_HUE_AT_Z0 = 330 / 360

/** Peak opacity. 1 = solid. */
export const FRACTAL_ALPHA = 0.75

/**
 * Zoom pace across the fractal window. 1 = uses the whole window. Above 1 the
 * zoom hits its floor early and then only the spin moves, so raise it knowing
 * that is the trade.
 */
export const FRACTAL_ZOOM_SPEED = 1

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const FRACTAL_Z_FADE = 0.2

/** Edge fade in UV 0–0.5. Desktop: four sides; mobile: bottom only. */
export const FRACTAL_EDGE_FADE = 0.5

/** Zoom-axis seed. 0 = shallow, 1 = already at max zoom. */
export const FRACTAL_SEED = 0.3

/** Random spread added to that seed, drawn once per load. 0 = same view always. */
export const FRACTAL_SEED_JITTER = 0.35

/**
 * Which boundary point the zoom heads for, 0-9, best-scoring first. Negative =
 * a random one per load. See TARGETS in MandelbrotField, and the script that
 * found them at scripts/fractal-targets.mjs.
 */
export const FRACTAL_TARGET = -1

/**
 * Pan onto the target, as a fraction of whatever is on screen at the time, so
 * it holds up at any depth. 0.5 starts the target at the frame edge. 0 = none.
 */
export const FRACTAL_DRIFT = 0.35

/** Device-pixel cap of the fractal buffer. 2 = full detail on a retina screen. */
export const FRACTAL_MAX_DPR = 2

/** Longest edge of that buffer, in pixels. The real cap on most desktops. */
export const FRACTAL_MAX_EDGE = 2560

/**
 * Samples per pixel per axis. 2 = 4 samples. Kills the speckle where the escape
 * bands get thinner than a pixel. Costs its own square: 2 is 4x the shader work.
 */
export const FRACTAL_SUPERSAMPLE = 2

/** Softening blur over the fractal, in CSS pixels. 0 = off. */
export const FRACTAL_BLUR = 0.5

/** Escape-loop ceiling. Raise it if deep zoom looks mushy rather than blurry. */
export const FRACTAL_MAX_ITER = 256

/** Hue walk across the fractal window, in turns. 1 = a full circle. */
export const FRACTAL_HUE_SPAN = 1

/** Hue wobble around that walk, in turns. 0 = off. 0.03 is about 11 degrees. */
export const FRACTAL_PULSE = 0.05

/** Seconds of the slowest wobble layer. Higher = lazier drift. */
export const FRACTAL_PULSE_PERIOD = 5

/** Irregularity. 0 = clean sine; 1 = faster layers at full strength. */
export const FRACTAL_PULSE_DRIFT = 0.65

/** Spin across the fractal window, in turns. Negative = reverse. */
export const FRACTAL_SPIN = 1

/** Peak opacity. 1 = solid. */
export const MATRIX_ALPHA = 0.75

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
export const MATRIX_DENSITY_DESKTOP = 3

/** Soft cloud wash behind the glyphs. 0 = off. */
export const MATRIX_CLOUD_ALPHA = 0.25

/** Cloud drift. 0 = still. */
export const MATRIX_CLOUD_SPEED = 0.5

/**
 * Hue offset from SC_2, in turns. Grid is PRIMARIO, glyphs are SC_1, so the
 * clouds sit on the leftover voice unless you shift them.
 */
export const MATRIX_CLOUD_HUE = 0

/** Peak opacity. 1 = solid. */
export const NEBULA_ALPHA = 0.8
/** CCW turns across the nebula window. Negative = clockwise. */
export const NEBULA_SPIN = 0.4

/**
 * Desktop spin vs mobile. The pole is the left edge, so the same 0.4 turn
 * that reads as a drift on a phone throws the photo off a 16:9 frame.
 */
export const NEBULA_SPIN_DESKTOP = 0.25

/** Spin pole, viewport X. 0 = left edge. Negative = off-screen. */
export const NEBULA_PIVOT_X = 0

/** Spin pole as a fraction of Z-panel height. 0.5 = middle. */
export const NEBULA_PIVOT_Y = 0.5

/** Orbit radius in viewport widths, pole → photo center. */
export const NEBULA_RADIUS = 1

/** Photo zoom. 1 = covers the Z-panel. */
export const NEBULA_ZOOM = 1.2

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const NEBULA_Z_FADE = 0.05

/** Edge fade in UV 0–0.5. Desktop: four sides; mobile: bottom only. */
export const NEBULA_EDGE_FADE = 0.16

/** Soft crop of the photo, as a fraction of its radius. 0 = hard square. */
export const NEBULA_SOFT_EDGE = 0.45

/** Hue walk of SC_1 on field stars, in turns. */
export const NEBULA_HUE_SPAN = 1

/** Same grid-glow wash as the matrix clouds. 0 = off. */
export const NEBULA_CLOUD_ALPHA = 0.3

/** Field stars. 0 = nebula only. */
export const NEBULA_STAR_COUNT = 180

/** Desktop count vs mobile. 1 = same; 2 = twice as many. */
export const NEBULA_STAR_COUNT_DESKTOP = 5

/** Desktop star size vs mobile. 1 = same; 0.2 = five times smaller. */
export const NEBULA_STAR_SCALE_DESKTOP = 0.3

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

/** Zoom from the thumbnail to the modal, seconds. */
export const PIC_OPEN_TIME = 0.5

/** Zoom back on close, seconds. Shorter than the open: a dismissal should feel answered. */
export const PIC_EXIT_TIME = 0.3

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
  root.setProperty(
    '--nebula-edge',
    `${Math.min(49, Math.max(0, NEBULA_EDGE_FADE) * 100)}%`,
  )
}

/** Energy orbs running along the grid lines, in SC_1 and SC_2. 0 = off. */
export const ORB_COUNT = 48

/** World units per second on the major lines. */
export const ORB_SPEED = 7

/** Fraction of ORB_SPEED on the thin lines. 1 = same pace. */
export const ORB_MINOR_SPEED = 0.4

/** Random spread around that speed. 0 = every orb runs at the same pace. */
export const ORB_SPEED_JITTER = 0.55

/** Diameter in world units. A floor cell is 0.2. */
export const ORB_SIZE = 0.5

/** Half-extent of the patrolled area, in world units. */
export const ORB_SPAN = 48

/** Chance of turning 90 degrees at each intersection. 0 = dead straight. */
export const ORB_TURN = 0.2

/** How long a grid click steers every orb toward that cell. */
export const ORB_SEEK_TIME = 0.55

/** Floor-line spread. 0.5 = tighter, 2 = wider glow. */
export const GRID_GLOW = 1

/** Fade-in/out in Z. 0 = hard cut. Capped at half the window. */
export const GRID_Z_FADE = 0.03

/** Card background opacity. Blur stays even at 0. */
export const PANEL_ALPHA = 0.8

/** Same for the ghost variant (intro). */
export const PANEL_GHOST_ALPHA = 0.42

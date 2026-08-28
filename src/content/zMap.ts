import { SECTIONS, type SectionId } from '../scene/stations.ts'

export type ZWindow = { start: number; end: number }

/**
 * Z window where each scroll-panel card is on stage (including fly-in / fly-out).
 * Gaps = empty. Overlap = handoff (una sale, la otra entra).
 */
export const CARD_Z: Partial<Record<SectionId, ZWindow>> = {
  intro: { start: 0.05, end: 0.2 },
  //about: { start: 0.7, end: 0.8 },
  interests: { start: 0.2, end: 0.4 },
  projects: { start: 0.4, end: 0.6 },
  stack: { start: 0.6, end: 0.8 },
  contact: { start: 0.8, end: 0.97 },
}

/**
 * Nav / hash jump targets. Independent of CARD_Z.
 * Missing keys = that section is out of the nav (same as a CARD_Z gap).
 */
export const NAV_Z: Partial<Record<SectionId, number>> = {
  intro: 0.0,
  //about: 0.7,
  interests: 0.32,
  projects: 0.42,
  stack: 0.62,
  contact: 0.82,
}

export function clamp01(z: number): number {
  if (z < 0) return 0
  if (z > 1) return 1
  return z
}

function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * 0 outside `[start, end]`, 1 inside, with a smooth band of `fade` on each edge.
 * `fade` is capped at half the window. 0 = hard cut.
 */
export function zWindowFade(z: number, start: number, end: number, fade: number): number {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const span = Math.max(hi - lo, 1e-4)
  const band = Math.min(span * 0.5, Math.max(0, fade))
  if (band < 1e-6) return z >= lo && z <= hi ? 1 : 0
  return smooth01(lo, lo + band, z) * (1 - smooth01(hi - band, hi, z))
}

/** Scroll the document so Z equals `z`. */
export function scrollToZ(z: number, behavior: ScrollBehavior = 'smooth'): void {
  const root = document.scrollingElement ?? document.documentElement
  const max = Math.max(0, root.scrollHeight - window.innerHeight)
  root.scrollTo({ top: clamp01(z) * max, behavior })
}

export function sectionFromHash(hash: string): SectionId | null {
  const id = hash.replace(/^#/, '')
  if (!SECTIONS.some((section) => section.id === id)) return null
  const key = id as SectionId
  return NAV_Z[key] === undefined ? null : key
}

/** Last nav stop at or before Z. */
export function navActiveId(z: number): SectionId {
  let current: SectionId = SECTIONS[0].id
  for (const section of SECTIONS) {
    const stop = NAV_Z[section.id]
    if (stop === undefined) continue
    if (z + 1e-6 >= stop) current = section.id
  }
  return current
}

/** Card whose CARD_Z window contains Z (last match if overlap). Missing windows are gaps. */
export function cardAtZ(z: number): SectionId | null {
  let found: SectionId | null = null
  for (const section of SECTIONS) {
    const slot = CARD_Z[section.id]
    if (!slot) continue
    const lo = Math.min(slot.start, slot.end)
    const hi = Math.max(slot.start, slot.end)
    if (z >= lo && z <= hi) found = section.id
  }
  return found
}

/**
 * Travel factor, −reach..reach. 0 = parked at center, 1 = just past the bottom fold,
 * −1 = just past the top one. `null` = offstage.
 *
 * Unitless on purpose: the caller multiplies it by `(50vh + 50%)`, so half the distance
 * comes from the card's own height and any card clears the fold. A fixed vh cannot —
 * a tall card or a short viewport leaves it peeking.
 *
 * `duration` splits the window: 1 → ⅓ in, ⅓ parked, ⅓ out.
 */
export function cardTravel(
  z: number,
  start: number,
  end: number,
  duration: number,
  reach: number,
): number | null {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  if (z < lo || z > hi) return null
  const span = hi - lo
  const leg = span / (2 + Math.max(0, duration))
  if (leg < 1e-6 || reach <= 0) return 0
  const t = z - lo
  if (t < leg) return (1 - t / leg) * reach
  if (t > span - leg) return -((t - (span - leg)) / leg) * reach
  return 0
}

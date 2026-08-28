export const SECTIONS = [
  { id: 'intro', index: '00' },
  { id: 'about', index: '01' },
  { id: 'interests', index: '01' },
  { id: 'projects', index: '02' },
  { id: 'stack', index: '03' },
  { id: 'contact', index: '04' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export const EYE = 1.76
export const LOOK_Y = 0.26
export const YAW = Math.PI / 4
export const FORWARD_X = Math.sin(YAW)
export const FORWARD_Z = -Math.cos(YAW)

export function xzAlong(distance: number): { x: number; z: number } {
  return { x: FORWARD_X * distance, z: FORWARD_Z * distance }
}

const STATION_DIST: Record<SectionId, number> = {
  intro: 0,
  about: 16,
  interests: 32,
  projects: 48,
  stack: 64,
  contact: 80,
}

const CAM_BACK = 10
const LOOK_AHEAD = 22

function waypointAt(stationDist: number): {
  pos: [number, number, number]
  look: [number, number, number]
} {
  const cam = xzAlong(stationDist - CAM_BACK)
  const look = xzAlong(stationDist - CAM_BACK + LOOK_AHEAD)
  return {
    pos: [cam.x, EYE, cam.z],
    look: [look.x, LOOK_Y, look.z],
  }
}

/** Derived so it can never fall out of sync with SECTIONS when a station is added. */
export const WAYPOINTS = SECTIONS.map((section) => waypointAt(STATION_DIST[section.id]))

export function sampleWaypoints(
  progress: number,
  posOut: { set: (x: number, y: number, z: number) => void },
  lookOut: { set: (x: number, y: number, z: number) => void },
): void {
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress
  const last = WAYPOINTS.length - 1
  const x = clamped * last
  const i = Math.min(Math.floor(x), last - 1)
  const f = x - i
  const a = WAYPOINTS[i]
  const b = WAYPOINTS[i + 1]

  posOut.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * f,
    a.pos[1] + (b.pos[1] - a.pos[1]) * f,
    a.pos[2] + (b.pos[2] - a.pos[2]) * f,
  )
  lookOut.set(
    a.look[0] + (b.look[0] - a.look[0]) * f,
    a.look[1] + (b.look[1] - a.look[1]) * f,
    a.look[2] + (b.look[2] - a.look[2]) * f,
  )
}

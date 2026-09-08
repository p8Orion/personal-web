import { type Camera, Vector3 } from 'three'

/** Full-page clockwise-or-current spin; uses document scroll 0..1. */
export const GRID_SPIN = (270 * Math.PI) / 180

export function gridYaw(scroll: number): number {
  return scroll * GRID_SPIN
}

export function setFloorPivotAtScreenBottom(
  camera: Camera,
  ndc: Vector3,
  ray: Vector3,
  out: Vector3,
): void {
  ndc.set(0, -1, 0.5).unproject(camera)
  ray.copy(ndc).sub(camera.position)
  if (Math.abs(ray.y) < 1e-5) {
    out.set(camera.position.x, 0, camera.position.z)
    return
  }
  const t = -camera.position.y / ray.y
  if (t < 0.02) {
    out.set(camera.position.x, 0, camera.position.z)
    return
  }
  out.copy(camera.position).addScaledVector(ray, t)
  out.y = 0
}

/** Minor cell size of the floor grid — world objects snap to this. */
export const GRID_CELL = 0.2

/** Major-line spacing. Thin cells tile this exactly (5 per major). */
export const GRID_MAJOR = 1

export function gridSpacing(skipFx: boolean): { cell: number; major: number } {
  return skipFx ? { cell: 0.27, major: 1.35 } : { cell: GRID_CELL, major: GRID_MAJOR }
}

export function snapToGrid(value: number, cell = GRID_CELL): number {
  return Math.round(value / cell) * cell
}

/** World pose of a rest point after the floor yaw — matches GridWorld + Ground. */
export function applyFloorSpin(
  rest: Vector3,
  pivot: Vector3,
  yaw: number,
  out: Vector3,
): void {
  const dx = rest.x - pivot.x
  const dz = rest.z - pivot.z
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  out.set(pivot.x + c * dx + s * dz, rest.y, pivot.z - s * dx + c * dz)
}

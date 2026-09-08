import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
  type Camera,
} from 'three'
import {
  GRID_Z_END,
  GRID_Z_FADE,
  GRID_Z_START,
  ORB_COUNT,
  ORB_MINOR_SPEED,
  ORB_SEEK_TIME,
  ORB_SIZE,
  ORB_SPAN,
  ORB_SPEED,
  ORB_SPEED_JITTER,
  ORB_TURN,
} from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { gridSpacing, gridYaw, snapToGrid } from './gridTransform.ts'
import { useGridWorld } from './GridWorld.tsx'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { paletteHues } from './materials.ts'

/**
 * Flush with the floor. The plane sits at y = 0.002 but never writes depth and
 * draws first, so the orbs still paint over it.
 */
const ORB_HEIGHT = 0
/** A tab switch can hand us a huge delta; without this the orbs teleport. */
const MAX_STEP = 0.05
/** Heading as [dx, dz]. A turn is ±1 step around this ring. */
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]

type Orb = {
  x: number
  z: number
  /** Index into DIRS. */
  dir: number
  speed: number
  /** Distance left until the next intersection, where it may turn. */
  next: number
}

const VERT = /* glsl */ `
  attribute float aPick;
  uniform vec3 uCamPos;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uZFade;
  uniform float uSize;
  uniform float uProject;
  varying float vPick;
  varying float vFade;

  ${HORIZON_FADE_GLSL}

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vFade = gridMajorFade(world.xyz, uCamPos, uFadeStart, uFadeEnd) * uZFade;
    vPick = aPick;
    vec4 view = viewMatrix * world;
    gl_Position = projectionMatrix * view;
    // uSize is world units. uProject carries the pixels-per-unit-at-one-unit
    // factor, so the orb shrinks with distance like real geometry.
    gl_PointSize = uSize * uProject / max(-view.z, 0.1);
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uSC1;
  uniform vec3 uSC2;
  varying float vPick;
  varying float vFade;

  void main() {
    if (vFade <= 0.001) discard;
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = pow(max(1.0 - r, 0.0), 3.0);
    float halo = pow(max(1.0 - r, 0.0), 1.2) * 0.3;
    float a = (core + halo) * vFade;
    gl_FragColor = vec4(mix(uSC1, uSC2, vPick) * a, a);
  }
`

type OrbMaterial = ShaderMaterial & {
  uniforms: {
    uCamPos: { value: Vector3 }
    uFadeStart: { value: number }
    uFadeEnd: { value: number }
    uZFade: { value: number }
    uSize: { value: number }
    uProject: { value: number }
    uSC1: { value: Color }
    uSC2: { value: Color }
  }
}

function onStep(value: number, step: number): boolean {
  return Math.abs(value - snapToGrid(value, step)) <= step * 1e-3
}

/** Moving on X rides the line at z; moving on Z rides the line at x. */
function onMajorLine(orb: Orb, major: number): boolean {
  const [dx] = DIRS[orb.dir]
  return onStep(dx !== 0 ? orb.z : orb.x, major)
}

function travelSpeed(orb: Orb, major: number): number {
  const pace = onMajorLine(orb, major) ? 1 : Math.max(0.05, ORB_MINOR_SPEED)
  return orb.speed * pace
}

function turnChance(orb: Orb, cell: number, major: number, turn: number): number {
  if (onStep(orb.x, major) && onStep(orb.z, major)) return turn
  // Same expected turns per world-unit as when they only walked the majors.
  return turn * (cell / major)
}

/** Whole multiples of the lane spacing, or the orb rides between two lines. */
function randomLane(lanes: number, lane: number): number {
  return (Math.floor(Math.random() * lanes) - Math.floor(lanes / 2)) * lane
}

/** Cards, nav and overlays sit over the canvas; those clicks are not the floor. */
const UI_BLOCK =
  'a, button, input, textarea, select, [role="dialog"], .overlay, .pic-modal, .boot, .hud__nav, .panel'

function isBlockedClick(x: number, y: number): boolean {
  return document
    .elementsFromPoint(x, y)
    .some((el) => el instanceof Element && el.closest(UI_BLOCK))
}

function hitFloor(
  camera: Camera,
  ndcX: number,
  ndcY: number,
  ndc: Vector3,
  ray: Vector3,
  out: Vector3,
): boolean {
  ndc.set(ndcX, ndcY, 0.5).unproject(camera)
  ray.copy(ndc).sub(camera.position)
  if (Math.abs(ray.y) < 1e-5) return false
  const t = -camera.position.y / ray.y
  if (t < 0.05) return false
  out.copy(camera.position).addScaledVector(ray, t)
  out.y = 0
  return true
}

/** Same xz unwind Ground uses to paint the cells. */
function worldToLane(
  worldX: number,
  worldZ: number,
  pivot: Vector3,
  yaw: number,
  lane: number,
  edge: number,
): { x: number; z: number } {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const wx = worldX - pivot.x
  const wz = worldZ - pivot.z
  const lx = c * wx - s * wz
  const lz = s * wx + c * wz
  return {
    x: Math.min(edge, Math.max(-edge, snapToGrid(lx, lane))),
    z: Math.min(edge, Math.max(-edge, snapToGrid(lz, lane))),
  }
}

function dirToward(
  x: number,
  z: number,
  tx: number,
  tz: number,
  current: number,
): number | null {
  const ax = tx - x
  const az = tz - z
  const xDir = ax > 1e-4 ? 0 : ax < -1e-4 ? 2 : -1
  const zDir = az > 1e-4 ? 1 : az < -1e-4 ? 3 : -1
  if (xDir < 0 && zDir < 0) return null
  if (xDir < 0) return zDir
  if (zDir < 0) return xDir
  if (current === xDir || current === zDir) return current
  return Math.abs(ax) >= Math.abs(az) ? xDir : zDir
}

function turnRandom(orb: Orb, turn: number): void {
  if (Math.random() < turn) {
    orb.dir = (orb.dir + (Math.random() < 0.5 ? 1 : 3)) % 4
  }
}

/** Mid-cell they can only reverse; 90° waits for the next intersection. */
function reverseIfFleeing(orb: Orb, tx: number, tz: number, lane: number): void {
  const [dx, dz] = DIRS[orb.dir]
  if (dx !== 0) {
    const need = Math.sign(tx - orb.x)
    if (need !== 0 && need === -dx) {
      orb.dir = (orb.dir + 2) % 4
      orb.next = Math.max(lane - orb.next, 1e-4)
    }
    return
  }
  const need = Math.sign(tz - orb.z)
  if (need !== 0 && need === -dz) {
    orb.dir = (orb.dir + 2) % 4
    orb.next = Math.max(lane - orb.next, 1e-4)
  }
}

function spawn(orb: Orb, lanes: number, lane: number, fresh: boolean): void {
  const edge = Math.floor(lanes / 2) * lane
  orb.dir = Math.floor(Math.random() * 4)
  // Floored: a jitter above 1 would otherwise hand out negative speeds, and the
  // hop loop only advances forward.
  orb.speed =
    ORB_SPEED * Math.max(0.05, 1 + (Math.random() * 2 - 1) * ORB_SPEED_JITTER)
  orb.next = lane
  if (fresh) {
    // Scattered over the lattice on the first build.
    orb.x = randomLane(lanes, lane)
    orb.z = randomLane(lanes, lane)
    return
  }
  // Afterwards enter from the edge its heading points away from.
  const [dx, dz] = DIRS[orb.dir]
  orb.x = dx === 0 ? randomLane(lanes, lane) : -dx * edge
  orb.z = dz === 0 ? randomLane(lanes, lane) : -dz * edge
}

export function GridOrbs({ skipFx }: { skipFx: boolean }) {
  const { camera, gl } = useThree()
  const { pivot } = useGridWorld()
  const count = Math.max(0, Math.round(ORB_COUNT))
  const { cell, major } = gridSpacing(skipFx)
  const lanes = Math.max(4, Math.round(Math.max(cell * 4, ORB_SPAN) / cell))
  const edge = Math.floor(lanes / 2) * cell
  const seekUntil = useRef(0)
  const seekAt = useRef({ x: 0, z: 0 })
  const clickNdc = useMemo(() => new Vector3(), [])
  const clickRay = useMemo(() => new Vector3(), [])
  const clickHit = useMemo(() => new Vector3(), [])

  const orbs = useMemo(() => {
    const list: Orb[] = []
    for (let i = 0; i < count; i += 1) {
      const orb: Orb = { x: 0, z: 0, dir: 0, speed: 0, next: cell }
      spawn(orb, lanes, cell, true)
      list.push(orb)
    }
    return list
  }, [count, lanes, cell])

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const pick = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      pos[i * 3 + 1] = ORB_HEIGHT
      pick[i] = Math.random() < 0.5 ? 0 : 1
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('aPick', new BufferAttribute(pick, 1))
    return geo
  }, [count])

  const material = useMemo(() => {
    const mat = new ShaderMaterial({
      uniforms: {
        uCamPos: { value: new Vector3() },
        uFadeStart: { value: 24 },
        uFadeEnd: { value: 88 },
        uZFade: { value: 1 },
        uSize: { value: ORB_SIZE },
        uProject: { value: 1000 },
        uSC1: { value: new Color() },
        uSC2: { value: new Color() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    }) as OrbMaterial
    mat.toneMapped = false
    mat.fog = false
    mat.transparent = true
    mat.depthWrite = false
    mat.blending = AdditiveBlending
    mat.premultipliedAlpha = true
    return mat
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useEffect(() => {
    const fade = fadeRange(skipFx)
    material.uniforms.uFadeStart.value = fade.start
    material.uniforms.uFadeEnd.value = fade.end
  }, [material, skipFx])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (isBlockedClick(event.clientX, event.clientY)) return
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1
      if (!hitFloor(camera, ndcX, ndcY, clickNdc, clickRay, clickHit)) return
      seekAt.current = worldToLane(
        clickHit.x,
        clickHit.z,
        pivot,
        gridYaw(getSmoothedScrollProgress()),
        cell,
        edge,
      )
      seekUntil.current = performance.now() / 1000 + Math.max(0, ORB_SEEK_TIME)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [camera, cell, clickHit, clickNdc, clickRay, edge, gl, pivot])

  useFrame(({ camera, gl }, delta) => {
    const scroll = getSmoothedScrollProgress()
    const hues = paletteHues(scroll)
    const u = material.uniforms
    u.uCamPos.value.copy(camera.position)
    // Drawing-buffer height already carries the pixel ratio.
    const fov = 'fov' in camera ? (camera.fov as number) : 58
    u.uProject.value = gl.domElement.height / (2 * Math.tan((fov * Math.PI) / 360))
    u.uZFade.value = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)
    u.uSC1.value.setHSL(hues.SC_1, 0.9, 0.62)
    u.uSC2.value.setHSL(hues.SC_2, 0.9, 0.62)

    const attr = geometry.getAttribute('position') as BufferAttribute
    const array = attr.array as Float32Array
    const step = Math.min(MAX_STEP, delta)
    const turn = Math.min(1, Math.max(0, ORB_TURN))
    const seeking = performance.now() / 1000 < seekUntil.current
    const target = seekAt.current
    for (let i = 0; i < orbs.length; i += 1) {
      const orb = orbs[i]
      if (seeking) reverseIfFleeing(orb, target.x, target.z, cell)
      // Time budget, not distance: a hop onto a minor line must slow immediately.
      let time = step
      while (time > 0) {
        const speed = Math.max(1e-4, travelSpeed(orb, major))
        const hop = Math.min(orb.next, speed * time)
        if (hop <= 1e-8) break
        const [dx, dz] = DIRS[orb.dir]
        orb.x += dx * hop
        orb.z += dz * hop
        orb.next -= hop
        time -= hop / speed
        if (orb.next > 1e-6) break
        // Re-snap to the lattice: the float drift would walk it off the line.
        orb.x = snapToGrid(orb.x, cell)
        orb.z = snapToGrid(orb.z, cell)
        if (seeking) {
          const nextDir = dirToward(orb.x, orb.z, target.x, target.z, orb.dir)
          if (nextDir !== null) orb.dir = nextDir
          else turnRandom(orb, turnChance(orb, cell, major, turn))
        } else {
          turnRandom(orb, turnChance(orb, cell, major, turn))
        }
        orb.next = cell
      }
      if (Math.abs(orb.x) > edge || Math.abs(orb.z) > edge) {
        spawn(orb, lanes, cell, false)
      }
      array[i * 3] = orb.x
      array[i * 3 + 2] = orb.z
    }
    attr.needsUpdate = true
  })

  if (count === 0) return null

  // frustumCulled: the bounding sphere is built from the initial buffer, which
  // is all zeros, so the whole cloud gets culled once the origin leaves view.
  // renderOrder: the boxes are transparent too and must write depth first, or
  // the orbs show through them.
  return (
    <points
      frustumCulled={false}
      geometry={geometry}
      material={material}
      renderOrder={1}
    />
  )
}

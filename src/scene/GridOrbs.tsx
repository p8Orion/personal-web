import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
} from 'three'
import {
  GRID_Z_END,
  GRID_Z_FADE,
  GRID_Z_START,
  ORB_COUNT,
  ORB_SIZE,
  ORB_SPAN,
  ORB_SPEED,
  ORB_SPEED_JITTER,
  ORB_TURN,
} from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { paletteHues } from './materials.ts'

/** Orbs ride the major lines, so lanes snap to the same spacing Ground paints. */
function laneSize(skipFx: boolean): number {
  return skipFx ? 1.35 : 1
}

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

/** Whole multiples of the lane spacing, or the orb rides between two lines. */
function randomLane(lanes: number, lane: number): number {
  return (Math.floor(Math.random() * lanes) - Math.floor(lanes / 2)) * lane
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
  const count = Math.max(0, Math.round(ORB_COUNT))
  const lane = laneSize(skipFx)
  const lanes = Math.max(4, Math.round(Math.max(lane * 4, ORB_SPAN) / lane))

  const orbs = useMemo(() => {
    const list: Orb[] = []
    for (let i = 0; i < count; i += 1) {
      const orb: Orb = { x: 0, z: 0, dir: 0, speed: 0, next: lane }
      spawn(orb, lanes, lane, true)
      list.push(orb)
    }
    return list
  }, [count, lanes, lane])

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
    const edge = Math.floor(lanes / 2) * lane
    const turn = Math.min(1, Math.max(0, ORB_TURN))
    for (let i = 0; i < orbs.length; i += 1) {
      const orb = orbs[i]
      // Walk in hops that stop on every intersection, so a fast orb can still
      // turn twice in one frame instead of overshooting the corner.
      let travel = orb.speed * step
      while (travel > 0) {
        const hop = Math.min(travel, orb.next)
        const [dx, dz] = DIRS[orb.dir]
        orb.x += dx * hop
        orb.z += dz * hop
        orb.next -= hop
        travel -= hop
        if (orb.next > 1e-6) break
        // Re-snap to the lattice: the float drift would walk it off the line.
        orb.x = Math.round(orb.x / lane) * lane
        orb.z = Math.round(orb.z / lane) * lane
        if (Math.random() < turn) {
          orb.dir = (orb.dir + (Math.random() < 0.5 ? 1 : 3)) % 4
        }
        orb.next = lane
      }
      if (Math.abs(orb.x) > edge || Math.abs(orb.z) > edge) {
        spawn(orb, lanes, lane, false)
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

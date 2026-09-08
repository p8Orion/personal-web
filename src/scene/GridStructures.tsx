import { shaderMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, Object3D, ShaderMaterial, Vector3 } from 'three'
import {
  CITY_BASE_BIAS,
  CITY_HEIGHT_BIAS,
  CITY_SEED,
  GRID_GLOW,
  GRID_Z_END,
  GRID_Z_FADE,
  GRID_Z_START,
} from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { GRID_GLOW_LINE_GLSL } from './gridGlow.ts'
import { GRID_CELL } from './gridTransform.ts'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { COLORS, paletteHues } from './materials.ts'

const DEG = Math.PI / 180
const GROUPS = 40
const RADIUS_MIN = 4
const RADIUS_MAX = 42
const CLUSTER_MIN = 6
const CLUSTER_MAX = 40
/** Bias toward small clusters. 1 = uniform; higher = more small, few large. */
const CLUSTER_BIAS = 2
/** Empty cells kept around every building, in grid cells. */
const CLUSTER_GAP = 1
const FOOTPRINT = GRID_CELL
const BASE_MIN = 1
const BASE_MAX = 3
const HEIGHT_MIN = 1
const HEIGHT_MAX = 10
const SEARCH_CELLS = 1800

type Structure = {
  rest: Vector3
  size: [number, number, number]
}

/**
 * Drawn once per load. Every angle, radius, count, rotation and box size runs
 * through hash01, so offsetting it here reshuffles the whole city at once.
 */
const RUN_SEED = CITY_SEED < 0 ? Math.random() * 1e4 : CITY_SEED

function hash01(n: number): number {
  const x = Math.sin((n + RUN_SEED) * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Integer in [min, max]. bias 1 = uniform; > 1 crowds the draw toward min. */
function pickInt(seed: number, min: number, max: number, bias: number): number {
  return min + Math.round(hash01(seed) ** bias * (max - min))
}

function cellKey(x: number, z: number): number {
  return x * 4096 + z
}

function rotateOffset(x: number, z: number, rot: number): [number, number] {
  if (rot === 1) return [z, -x]
  if (rot === 2) return [-x, -z]
  if (rot === 3) return [-z, x]
  return [x, z]
}

function spiralCells(count: number): [number, number][] {
  const cells: [number, number][] = [[0, 0]]
  let x = 0
  let z = 0
  let dx = 1
  let dz = 0
  let segmentLength = 1
  let passed = 0
  let turns = 0
  while (cells.length < count) {
    x += dx
    z += dz
    cells.push([x, z])
    passed += 1
    if (passed === segmentLength) {
      passed = 0
      const nextDx = -dz
      dz = dx
      dx = nextDx
      turns += 1
      if (turns % 2 === 0) segmentLength += 1
    }
  }
  return cells
}

function canPlace(
  occupied: Set<number>,
  x: number,
  z: number,
  w: number,
  d: number,
): boolean {
  for (let i = -CLUSTER_GAP; i < w + CLUSTER_GAP; i += 1) {
    for (let j = -CLUSTER_GAP; j < d + CLUSTER_GAP; j += 1) {
      if (occupied.has(cellKey(x + i, z + j))) return false
    }
  }
  return true
}

function occupy(
  occupied: Set<number>,
  x: number,
  z: number,
  w: number,
  d: number,
): void {
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < d; j += 1) {
      occupied.add(cellKey(x + i, z + j))
    }
  }
}

const CANDIDATES = spiralCells(SEARCH_CELLS)

function buildStructures(): Structure[] {
  const list: Structure[] = []
  // Shared across clusters so the gap holds where two clusters meet.
  const occupied = new Set<number>()
  for (let i = 0; i < GROUPS; i += 1) {
    const jitter = (hash01(i) * 2 - 1) * 8 * DEG
    const angle = (i / GROUPS) * Math.PI * 2 + jitter
    const radius =
      RADIUS_MIN + hash01(i * 1.91) * (RADIUS_MAX - RADIUS_MIN)
    const originCellX = Math.floor((Math.cos(angle) * radius) / FOOTPRINT)
    const originCellZ = Math.floor((Math.sin(angle) * radius) / FOOTPRINT)
    const count = pickInt(i * 3.17, CLUSTER_MIN, CLUSTER_MAX, CLUSTER_BIAS)
    const rot = Math.floor(hash01(i + 2.4) * 4)
    let placed = 0
    for (let n = 0; n < CANDIDATES.length && placed < count; n += 1) {
      const [sx, sz] = CANDIDATES[n]
      const [offX, offZ] = rotateOffset(sx, sz, rot)
      const cellX = originCellX + offX
      const cellZ = originCellZ + offZ
      const seed = i * 11.3 + placed * 7.1
      const w = pickInt(seed, BASE_MIN, BASE_MAX, CITY_BASE_BIAS)
      const d = pickInt(seed + 1.7, BASE_MIN, BASE_MAX, CITY_BASE_BIAS)
      const h = pickInt(seed + 3.1, HEIGHT_MIN, HEIGHT_MAX, CITY_HEIGHT_BIAS)
      if (!canPlace(occupied, cellX, cellZ, w, d)) continue
      occupy(occupied, cellX, cellZ, w, d)
      const sizeX = w * FOOTPRINT
      const sizeY = h * FOOTPRINT
      const sizeZ = d * FOOTPRINT
      list.push({
        rest: new Vector3(
          cellX * FOOTPRINT + sizeX / 2,
          sizeY / 2,
          cellZ * FOOTPRINT + sizeZ / 2,
        ),
        size: [sizeX, sizeY, sizeZ],
      })
      placed += 1
    }
  }
  return list
}

const STRUCTURES = buildStructures()
const UNIT_BOX = new BoxGeometry(1, 1, 1)
const INSTANCE = new Object3D()

const EDGE_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vHalfSize;

  void main() {
#ifdef USE_INSTANCING
    mat4 local = instanceMatrix;
#else
    mat4 local = mat4(1.0);
#endif
    vec3 scale = vec3(
      length(local[0].xyz),
      length(local[1].xyz),
      length(local[2].xyz)
    );
    vHalfSize = scale * 0.5;
    vLocalPos = position * scale;
    vec4 world = modelMatrix * local * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const EDGE_FRAG = /* glsl */ `
  uniform vec3 uPRIMARIO;
  uniform vec3 uFill;
  uniform vec3 uCamPos;
  uniform float uMajor;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uGlow;
  uniform float uZFade;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vHalfSize;

  ${HORIZON_FADE_GLSL}
  ${GRID_GLOW_LINE_GLSL}

  void main() {
    vec3 dFace = max(vHalfSize - abs(vLocalPos), 0.0);
    float edgeDist = min(
      min(max(dFace.x, dFace.y), max(dFace.y, dFace.z)),
      max(dFace.z, dFace.x)
    );
    float fw = max(
      fwidth(vLocalPos.x),
      max(fwidth(vLocalPos.y), fwidth(vLocalPos.z))
    );
    float grid = glowLineFalloff(edgeDist, fw, uMajor, 0.028, 0.09);
    float fade = gridMajorFade(vWorldPos, uCamPos, uFadeStart, uFadeEnd);
    // Two curves off one fade. The edges dim with distance, but the box stays
    // opaque well past that so it keeps occluding the Z-panel behind it, and
    // only dissolves in the last stretch before the horizon. uZFade is only
    // the phosphor: multiplying the alpha would open holes for nebula stars.
    vec3 lit = mix(uFill, uPRIMARIO, grid * fade * uZFade);
    gl_FragColor = vec4(lit, gridSolid(fade));
  }
`

const EdgeMaterial = shaderMaterial(
  {
    uPRIMARIO: new Color(COLORS.phosphor),
    uFill: new Color(COLORS.bg),
    uCamPos: new Vector3(),
    uMajor: 1,
    uFadeStart: 24,
    uFadeEnd: 88,
    uGlow: 1,
    uZFade: 1,
  },
  EDGE_VERT,
  EDGE_FRAG,
)

type EdgeMaterialInstance = ShaderMaterial & {
  uPRIMARIO: Color
  uFill: Color
  uCamPos: Vector3
  uMajor: number
  uFadeStart: number
  uFadeEnd: number
  uGlow: number
  uZFade: number
}

export function GridStructures({ skipFx }: { skipFx: boolean }) {
  const meshRef = useRef<InstancedMesh>(null)
  const material = useMemo(() => {
    const mat = new EdgeMaterial() as EdgeMaterialInstance
    mat.toneMapped = false
    mat.fog = false
    mat.transparent = true
    // Kept on so near boxes still occlude each other and the floor lines.
    mat.depthWrite = true
    return mat
  }, [])

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useEffect(() => {
    const fade = fadeRange(skipFx)
    material.uMajor = skipFx ? 1.35 : 1
    material.uFadeStart = fade.start
    material.uFadeEnd = fade.end
  }, [material, skipFx])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < STRUCTURES.length; i += 1) {
      const item = STRUCTURES[i]
      INSTANCE.position.copy(item.rest)
      INSTANCE.scale.set(item.size[0], item.size[1], item.size[2])
      INSTANCE.updateMatrix()
      mesh.setMatrixAt(i, INSTANCE.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  useFrame(({ camera }) => {
    const scroll = getSmoothedScrollProgress()
    material.uCamPos.copy(camera.position)
    material.uGlow = GRID_GLOW
    material.uZFade = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)
    material.uPRIMARIO.setHSL(paletteHues(scroll).PRIMARIO, 0.78, 0.52)
  })

  if (STRUCTURES.length === 0) return null

  return (
    <instancedMesh
      args={[UNIT_BOX, material, STRUCTURES.length]}
      frustumCulled={false}
      ref={meshRef}
    />
  )
}

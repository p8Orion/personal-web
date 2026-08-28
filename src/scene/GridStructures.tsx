import { shaderMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BoxGeometry, Color, ShaderMaterial, Vector3 } from 'three'
import { GRID_GLOW, GRID_Z_END, GRID_Z_FADE, GRID_Z_START } from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { GRID_GLOW_LINE_GLSL } from './gridGlow.ts'
import { GRID_CELL } from './gridTransform.ts'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { COLORS, paletteHues } from './materials.ts'

const DEG = Math.PI / 180
const GROUPS = 32
const RADIUS_MIN = 4
const RADIUS_MAX = 42
const CLUSTER_MIN = 14
const CLUSTER_MAX = 26
const FOOTPRINT = GRID_CELL
const BASE_MIN = 1
const BASE_MAX = 3
const HEIGHT_MIN = 1
const HEIGHT_MAX = 10
const SEARCH_CELLS = 400

type Structure = {
  rest: Vector3
  size: [number, number, number]
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function pickInt(seed: number, min: number, max: number): number {
  return min + Math.floor(hash01(seed) * (max - min + 1))
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
  for (let i = 0; i < w; i += 1) {
    for (let j = 0; j < d; j += 1) {
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
  for (let i = 0; i < GROUPS; i += 1) {
    const jitter = (hash01(i) * 2 - 1) * 8 * DEG
    const angle = (i / GROUPS) * Math.PI * 2 + jitter
    const radius =
      RADIUS_MIN + hash01(i * 1.91) * (RADIUS_MAX - RADIUS_MIN)
    const originCellX = Math.floor((Math.cos(angle) * radius) / FOOTPRINT)
    const originCellZ = Math.floor((Math.sin(angle) * radius) / FOOTPRINT)
    const count =
      CLUSTER_MIN + Math.floor(hash01(i * 3.17) * (CLUSTER_MAX - CLUSTER_MIN + 1))
    const rot = Math.floor(hash01(i + 2.4) * 4)
    const occupied = new Set<number>()
    let placed = 0
    for (let n = 0; n < CANDIDATES.length && placed < count; n += 1) {
      const [sx, sz] = CANDIDATES[n]
      const [cellX, cellZ] = rotateOffset(sx, sz, rot)
      const seed = i * 11.3 + placed * 7.1
      const w = pickInt(seed, BASE_MIN, BASE_MAX)
      const d = pickInt(seed + 1.7, BASE_MIN, BASE_MAX)
      const h = pickInt(seed + 3.1, HEIGHT_MIN, HEIGHT_MAX)
      if (!canPlace(occupied, cellX, cellZ, w, d)) continue
      occupy(occupied, cellX, cellZ, w, d)
      const sizeX = w * FOOTPRINT
      const sizeY = h * FOOTPRINT
      const sizeZ = d * FOOTPRINT
      list.push({
        rest: new Vector3(
          (originCellX + cellX) * FOOTPRINT + sizeX / 2,
          sizeY / 2,
          (originCellZ + cellZ) * FOOTPRINT + sizeZ / 2,
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

const EDGE_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vHalfSize;

  void main() {
    vec3 scale = vec3(
      length(vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2])),
      length(vec3(modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2])),
      length(vec3(modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2]))
    );
    vHalfSize = scale * 0.5;
    vLocalPos = position * scale;
    vec4 world = modelMatrix * vec4(position, 1.0);
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
    float fade = gridMajorFade(vWorldPos, uCamPos, uFadeStart, uFadeEnd) * uZFade;
    vec3 lit = mix(uFill, uPRIMARIO, grid);
    gl_FragColor = vec4(mix(uFill, lit, fade), 1.0);
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
  const material = useMemo(() => {
    const mat = new EdgeMaterial() as EdgeMaterialInstance
    mat.toneMapped = false
    mat.fog = false
    mat.transparent = false
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

  useFrame(({ camera }) => {
    const scroll = getSmoothedScrollProgress()
    material.uCamPos.copy(camera.position)
    material.uGlow = GRID_GLOW
    material.uZFade = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)
    material.uPRIMARIO.setHSL(paletteHues(scroll).PRIMARIO, 0.78, 0.52)
  })

  return (
    <group>
      {STRUCTURES.map((item, index) => (
        <mesh
          geometry={UNIT_BOX}
          key={index}
          material={material}
          position={[item.rest.x, item.rest.y, item.rest.z]}
          scale={item.size}
        />
      ))}
    </group>
  )
}

import { shaderMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ShaderMaterial, type Mesh, Vector3 } from 'three'
import { GRID_GLOW, GRID_Z_END, GRID_Z_FADE, GRID_Z_START } from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { GRID_GLOW_LINE_GLSL } from './gridGlow.ts'
import { GRID_CELL, gridYaw } from './gridTransform.ts'
import { useGridWorld } from './GridWorld.tsx'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { COLORS, paletteHues } from './materials.ts'

const DEG = Math.PI / 180
const GROUPS = 12
const RADIUS = 10
const CLUSTER_MIN = 5
const CLUSTER_MAX = 10
const FOOTPRINT = GRID_CELL
const HEIGHTS = [0.5, 1, 1.5, 2] as const

type Structure = {
  rest: Vector3
  height: number
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function snapToCellCenter(value: number): number {
  return Math.floor(value / FOOTPRINT) * FOOTPRINT + FOOTPRINT / 2
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

function clusterOffsets(seed: number, count: number): [number, number][] {
  const rot = Math.floor(hash01(seed + 2.4) * 4)
  return spiralCells(count).map(([x, z]) => {
    const [rx, rz] = rotateOffset(x * FOOTPRINT, z * FOOTPRINT, rot)
    return [rx, rz]
  })
}

function pickHeight(seed: number): number {
  return HEIGHTS[Math.floor(hash01(seed) * HEIGHTS.length)] * FOOTPRINT
}

function buildStructures(): Structure[] {
  const list: Structure[] = []
  for (let i = 0; i < GROUPS; i += 1) {
    const jitter = (hash01(i) * 2 - 1) * 3 * DEG
    const angle = i * 30 * DEG + jitter
    const originX = snapToCellCenter(Math.cos(angle) * RADIUS)
    const originZ = snapToCellCenter(Math.sin(angle) * RADIUS)
    const count =
      CLUSTER_MIN + Math.floor(hash01(i * 3.17) * (CLUSTER_MAX - CLUSTER_MIN + 1))
    const offsets = clusterOffsets(i, count)
    for (let k = 0; k < count; k += 1) {
      const height = pickHeight(i * 11.3 + k * 7.1)
      list.push({
        rest: new Vector3(
          snapToCellCenter(originX + offsets[k][0]),
          height / 2,
          snapToCellCenter(originZ + offsets[k][1]),
        ),
        height,
      })
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
  uniform vec3 uPivot;
  uniform float uCell;
  uniform float uMajor;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uYaw;
  uniform float uGlow;
  uniform float uZFade;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vHalfSize;

  ${HORIZON_FADE_GLSL}
  ${GRID_GLOW_LINE_GLSL}

  void main() {
    float c = cos(uYaw);
    float s = sin(uYaw);
    vec2 p = vWorldPos.xz - uPivot.xz;
    vec2 g = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

    vec3 dFace = max(vHalfSize - abs(vLocalPos), 0.0);
    float yDist = min(dFace.x, dFace.z) < dFace.y
      ? min(abs(vLocalPos.y + vHalfSize.y), abs(vLocalPos.y - vHalfSize.y))
      : 1e5;
    float yFw = fwidth(vLocalPos.y);

    float thin;
    float major;
    if (dFace.y <= dFace.x && dFace.y <= dFace.z) {
      thin = max(glowLine(g.x, uCell, 0.012, 0.042), glowLine(g.y, uCell, 0.012, 0.042));
      major = max(glowLine(g.x, uMajor, 0.028, 0.09), glowLine(g.y, uMajor, 0.028, 0.09));
    } else if (dFace.x <= dFace.z) {
      thin = max(glowLine(g.y, uCell, 0.012, 0.042), glowLineFalloff(yDist, yFw, uCell, 0.012, 0.042));
      major = glowLine(g.y, uMajor, 0.028, 0.09);
    } else {
      thin = max(glowLine(g.x, uCell, 0.012, 0.042), glowLineFalloff(yDist, yFw, uCell, 0.012, 0.042));
      major = glowLine(g.x, uMajor, 0.028, 0.09);
    }

    float dist = gridPlanarDist(vWorldPos, uCamPos);
    float horizon = gridHorizon(vWorldPos, uCamPos);
    float thinFade = (1.0 - smoothstep(uFadeStart * 0.32, uFadeEnd * 0.52, dist)) * horizon;
    float majorFade = (1.0 - smoothstep(uFadeStart * 0.65, uFadeEnd, dist)) * horizon;
    float grid = max(thin * 0.72 * thinFade, major * majorFade);
    vec3 lit = mix(uFill, uPRIMARIO, grid);
    gl_FragColor = vec4(mix(uFill, lit, uZFade), 1.0);
  }
`

const EdgeMaterial = shaderMaterial(
  {
    uPRIMARIO: new Color(COLORS.phosphor),
    uFill: new Color(COLORS.bg),
    uCamPos: new Vector3(),
    uPivot: new Vector3(),
    uCell: 0.2,
    uMajor: 1,
    uFadeStart: 24,
    uFadeEnd: 88,
    uYaw: 0,
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
  uPivot: Vector3
  uCell: number
  uMajor: number
  uFadeStart: number
  uFadeEnd: number
  uYaw: number
  uGlow: number
  uZFade: number
}

export function GridStructures({ skipFx }: { skipFx: boolean }) {
  const { pivot } = useGridWorld()
  const meshes = useRef<(Mesh | null)[]>([])

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
    material.uCell = skipFx ? 0.27 : GRID_CELL
    material.uMajor = skipFx ? 1.35 : 1
    material.uFadeStart = fade.start
    material.uFadeEnd = fade.end
  }, [material, skipFx])

  useFrame(({ camera }) => {
    const scroll = getSmoothedScrollProgress()
    material.uCamPos.copy(camera.position)
    material.uPivot.copy(pivot)
    material.uYaw = gridYaw(scroll)
    material.uGlow = GRID_GLOW
    material.uZFade = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)
    material.uPRIMARIO.setHSL(paletteHues(scroll).PRIMARIO, 0.78, 0.52)

    for (let i = 0; i < STRUCTURES.length; i += 1) {
      const item = STRUCTURES[i]
      const mesh = meshes.current[i]
      if (!mesh) continue
      mesh.position.set(item.rest.x - pivot.x, item.rest.y, item.rest.z - pivot.z)
    }
  })

  return (
    <group>
      {STRUCTURES.map((item, index) => (
        <mesh
          geometry={UNIT_BOX}
          key={index}
          material={material}
          ref={(node) => {
            meshes.current[index] = node
          }}
          scale={[FOOTPRINT, item.height, FOOTPRINT]}
        />
      ))}
    </group>
  )
}

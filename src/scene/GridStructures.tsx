import { RoundedBox, shaderMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  RepeatWrapping,
  ShaderMaterial,
  type Mesh,
  Vector3,
} from 'three'
import { GRID_Z_END, GRID_Z_FADE, GRID_Z_START } from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { GRID_CELL, snapToGrid } from './gridTransform.ts'
import { useGridWorld } from './GridWorld.tsx'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { createCodeTexture, paletteHues } from './materials.ts'

const DEG = Math.PI / 180
const GROUPS = 12
const RADIUS = 10
const CLUSTER_MIN = 5
const CLUSTER_MAX = 10

type Structure = {
  rest: Vector3
  size: [number, number, number]
  radius: number
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function cubitoSize(seed: number): [number, number, number] {
  const width = 0.12 + Math.pow(hash01(seed), 1.25) * 0.78
  const depth = 0.12 + Math.pow(hash01(seed + 2.7), 1.25) * 0.78
  const height = 0.1 + Math.pow(hash01(seed + 4.2), 0.8) * 1.2
  return [width, height, depth]
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
  const step = GRID_CELL * 3
  const rot = Math.floor(hash01(seed + 2.4) * 4)
  return spiralCells(count).map(([x, z]) => {
    const [rx, rz] = rotateOffset(x * step, z * step, rot)
    return [rx, rz]
  })
}

function buildStructures(): Structure[] {
  const list: Structure[] = []
  for (let i = 0; i < GROUPS; i += 1) {
    const jitter = (hash01(i) * 2 - 1) * 3 * DEG
    const angle = i * 30 * DEG + jitter
    const originX = snapToGrid(Math.cos(angle) * RADIUS)
    const originZ = snapToGrid(Math.sin(angle) * RADIUS)
    const count =
      CLUSTER_MIN + Math.floor(hash01(i * 3.17) * (CLUSTER_MAX - CLUSTER_MIN + 1))
    const offsets = clusterOffsets(i, count)
    for (let k = 0; k < count; k += 1) {
      const size = cubitoSize(i * 11.3 + k * 7.1)
      list.push({
        rest: new Vector3(
          snapToGrid(originX + offsets[k][0]),
          size[1] / 2,
          snapToGrid(originZ + offsets[k][1]),
        ),
        size,
        radius: Math.min(size[0], size[1], size[2]) * 0.12,
      })
    }
  }
  return list
}

const STRUCTURES = buildStructures()

const CODE_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;

  void main() {
    vLocalPos = position;
    vLocalNormal = normal;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const CODE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform vec3 uCamPos;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uScale;
  uniform float uZFade;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;

  ${HORIZON_FADE_GLSL}

  vec3 sampleCode(vec3 pos, vec3 nor) {
    vec3 blend = pow(abs(normalize(nor)), vec3(4.0));
    blend /= max(blend.x + blend.y + blend.z, 1e-5);
    vec3 p = pos * uScale;
    vec3 cx = texture2D(uMap, p.yz).rgb;
    vec3 cy = texture2D(uMap, p.xz).rgb;
    vec3 cz = texture2D(uMap, p.xy).rgb;
    return cx * blend.x + cy * blend.y + cz * blend.z;
  }

  void main() {
    vec3 code = sampleCode(vLocalPos, vLocalNormal);
    float luma = max(code.g, max(code.r, code.b));
    float glyph = smoothstep(0.06, 0.42, luma);
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    float ndotv = abs(dot(N, V));
    float fresnel = pow(1.0 - ndotv, 2.4);
    float wrap = 0.58 + 0.42 * max(dot(N, vec3(0.22, 0.9, 0.28)), 0.0);
    vec3 chassis = uTint * 0.22;
    vec3 ink = uTint * 1.08;
    vec3 albedo = mix(chassis, ink, glyph) * wrap + uTint * fresnel * 0.12;
    float fade = gridMajorFade(vWorldPos, uCamPos, uFadeStart, uFadeEnd) * uZFade;
    gl_FragColor = vec4(albedo * fade, 1.0);
  }
`

const CodeMaterial = shaderMaterial(
  {
    uMap: null,
    uTint: new Color('#7cffb2'),
    uCamPos: new Vector3(),
    uFadeStart: 24,
    uFadeEnd: 88,
    uScale: 1.85,
    uZFade: 1,
  },
  CODE_VERT,
  CODE_FRAG,
)

type CodeMaterialInstance = ShaderMaterial & {
  uMap: ReturnType<typeof createCodeTexture> | null
  uTint: Color
  uCamPos: Vector3
  uFadeStart: number
  uFadeEnd: number
  uScale: number
  uZFade: number
}

function makeCodeMaterial(map: ReturnType<typeof createCodeTexture>): CodeMaterialInstance {
  const mat = new CodeMaterial() as CodeMaterialInstance
  mat.uMap = map
  mat.toneMapped = false
  mat.fog = false
  return mat
}

export function GridStructures({ skipFx }: { skipFx: boolean }) {
  const { pivot } = useGridWorld()
  const meshes = useRef<(Mesh | null)[]>([])
  const smoothness = skipFx ? 2 : 4

  const codeTexture = useMemo(() => {
    const texture = createCodeTexture()
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    return texture
  }, [])

  const material = useMemo(() => makeCodeMaterial(codeTexture), [codeTexture])

  useEffect(() => {
    return () => {
      material.dispose()
      codeTexture.dispose()
    }
  }, [codeTexture, material])

  useEffect(() => {
    const fade = fadeRange(skipFx)
    material.uFadeStart = fade.start
    material.uFadeEnd = fade.end
  }, [material, skipFx])

  useFrame(({ camera }) => {
    const scroll = getSmoothedScrollProgress()
    const hues = paletteHues(scroll)
    material.uCamPos.copy(camera.position)
    material.uTint.setHSL(hues.PRIMARIO, 0.82, 0.55)
    material.uZFade = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)

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
        <RoundedBox
          args={item.size}
          bevelSegments={skipFx ? 1 : 2}
          key={index}
          material={material}
          radius={item.radius}
          ref={(node) => {
            meshes.current[index] = node
          }}
          smoothness={smoothness}
        />
      ))}
    </group>
  )
}

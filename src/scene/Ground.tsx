import { shaderMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DoubleSide, ShaderMaterial, Vector3 } from 'three'
import { GRID_GLOW, GRID_Z_END, GRID_Z_FADE, GRID_Z_START } from '../content/debug.ts'
import { zWindowFade } from '../content/zMap.ts'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { gridYaw, setFloorPivotAtScreenBottom } from './gridTransform.ts'
import { GRID_GLOW_LINE_GLSL } from './gridGlow.ts'
import { fadeRange, HORIZON_FADE_GLSL } from './horizonFade.ts'
import { COLORS, paletteHues } from './materials.ts'

const GRID_VERT = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const GRID_FRAG = /* glsl */ `
  uniform vec3 uPRIMARIO;
  uniform vec3 uFill;
  uniform vec3 uCamPos;
  uniform float uCell;
  uniform float uMajor;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uYaw;
  uniform float uGlow;
  uniform float uZFade;
  uniform vec3 uPivot;
  varying vec3 vWorldPos;

  ${HORIZON_FADE_GLSL}
  ${GRID_GLOW_LINE_GLSL}

  void main() {
    float c = cos(uYaw);
    float s = sin(uYaw);
    vec2 p = vWorldPos.xz - uPivot.xz;
    vec2 g = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    float thin = max(
      glowLine(g.x, uCell, 0.012, 0.042),
      glowLine(g.y, uCell, 0.012, 0.042)
    );
    float major = max(
      glowLine(g.x, uMajor, 0.028, 0.09),
      glowLine(g.y, uMajor, 0.028, 0.09)
    );
    float dist = gridPlanarDist(vWorldPos, uCamPos);
    float horizon = gridHorizon(vWorldPos, uCamPos);
    float thinFade = (1.0 - smoothstep(uFadeStart * 0.32, uFadeEnd * 0.52, dist)) * horizon;
    float majorFade = (1.0 - smoothstep(uFadeStart * 0.65, uFadeEnd, dist)) * horizon;
    float grid = max(thin * 0.72 * thinFade, major * majorFade);
    // Opaque floor, so the Z-panel behind the canvas stops showing through the
    // cells. The old 0.04 phosphor wash is baked into the fill instead of being
    // stacked on top of it as extra alpha.
    float solid = gridSolid(majorFade);
    vec3 base = mix(uFill, uPRIMARIO, 0.04 * majorFade);
    vec3 lit = mix(base, uPRIMARIO, grid);
    gl_FragColor = vec4(lit, max(grid, solid) * uZFade);
  }
`

const GridMaterial = shaderMaterial(
  {
    uCamPos: new Vector3(),
    uCell: 0.2,
    uFadeEnd: 88,
    uFadeStart: 24,
    uFill: new Color(COLORS.bg),
    uMajor: 1,
    uPRIMARIO: new Color(COLORS.phosphor),
    uYaw: 0,
    uGlow: 1,
    uZFade: 1,
    uPivot: new Vector3(),
  },
  GRID_VERT,
  GRID_FRAG,
)

type GridMaterialInstance = ShaderMaterial & {
  uCamPos: Vector3
  uCell: number
  uFadeEnd: number
  uFadeStart: number
  uFill: Color
  uMajor: number
  uPRIMARIO: Color
  uYaw: number
  uGlow: number
  uZFade: number
  uPivot: Vector3
}

export function Ground({ skipFx }: { skipFx: boolean }) {
  const material = useMemo(() => {
    const mat = new GridMaterial() as GridMaterialInstance
    mat.transparent = true
    mat.depthWrite = false
    mat.toneMapped = false
    mat.side = DoubleSide
    return mat
  }, [])
  const ndc = useMemo(() => new Vector3(), [])
  const ray = useMemo(() => new Vector3(), [])

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useEffect(() => {
    const fade = fadeRange(skipFx)
    material.uCell = skipFx ? 0.27 : 0.2
    material.uMajor = skipFx ? 1.35 : 1
    material.uFadeStart = fade.start
    material.uFadeEnd = fade.end
  }, [material, skipFx])

  useFrame(({ camera }) => {
    const scroll = getSmoothedScrollProgress()
    material.uCamPos.copy(camera.position)
    material.uYaw = gridYaw(scroll)
    material.uGlow = GRID_GLOW
    material.uZFade = zWindowFade(scroll, GRID_Z_START, GRID_Z_END, GRID_Z_FADE)
    material.uPRIMARIO.setHSL(paletteHues(scroll).PRIMARIO, 0.78, 0.52)
    setFloorPivotAtScreenBottom(camera, ndc, ray, material.uPivot)
  })

  return (
    <mesh material={material} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[320, 320]} />
    </mesh>
  )
}

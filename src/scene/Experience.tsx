import { AdaptiveDpr } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { detectWebGL, usePerfTier } from '../hooks/usePerfTier.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { CameraRig } from './CameraRig.tsx'
import { COLORS } from './materials.ts'
import { WAYPOINTS } from './stations.ts'
import { World } from './World.tsx'

export function Experience() {
  const tier = usePerfTier()
  const reducedMotion = useReducedMotion()
  const [webgl] = useState(detectWebGL)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    const onVisibility = () => {
      setVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!webgl) return null

  return (
    <div aria-hidden className="experience">
      <Canvas
        camera={{
          far: 200,
          fov: 58,
          near: 0.1,
          position: WAYPOINTS[0].pos,
        }}
        dpr={tier.dpr}
        frameloop={visible ? 'always' : 'never'}
        gl={{
          alpha: true,
          antialias: true,
          depth: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        performance={{ min: 0.5, max: 1, debounce: 200 }}
        onCreated={({ gl }) => {
          // Transparent sky so the Z-panel can sit behind the grid on mobile.
          // Body background paints the same COLORS.bg underneath.
          gl.setClearColor(COLORS.bg, 0)
        }}
        style={{ pointerEvents: 'none' }}
      >
        <fog attach="fog" args={[COLORS.bg, 28, 96]} />
        <ambientLight intensity={0.22} />
        <hemisphereLight
          color={COLORS.phosphorDim}
          groundColor={COLORS.bg}
          intensity={0.35}
          position={[0, 12, 0]}
        />
        <directionalLight color="#d7ffe9" intensity={0.45} position={[8, 14, 4]} />
        <AdaptiveDpr />
        <CameraRig reducedMotion={reducedMotion} />
        <World skipFx={tier.skipFx || reducedMotion} />
      </Canvas>
    </div>
  )
}

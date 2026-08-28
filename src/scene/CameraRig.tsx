import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { tickScrollSmoothing } from '../hooks/useScrollProgress.ts'
import { sampleWaypoints, WAYPOINTS } from './stations.ts'

type CameraRigProps = {
  reducedMotion: boolean
}

export function CameraRig({ reducedMotion }: CameraRigProps) {
  const targetPos = useMemo(() => new Vector3(), [])
  const targetLook = useMemo(() => new Vector3(), [])
  const lookCurrent = useMemo(
    () => new Vector3(WAYPOINTS[0].look[0], WAYPOINTS[0].look[1], WAYPOINTS[0].look[2]),
    [],
  )

  useFrame(({ camera }, delta) => {
    const progress = tickScrollSmoothing(delta)
    if (reducedMotion) {
      camera.position.set(WAYPOINTS[0].pos[0], WAYPOINTS[0].pos[1], WAYPOINTS[0].pos[2])
      camera.lookAt(WAYPOINTS[0].look[0], WAYPOINTS[0].look[1], WAYPOINTS[0].look[2])
      return
    }

    sampleWaypoints(progress, targetPos, targetLook)
    const alpha = 1 - Math.exp(-delta * 1.45)
    camera.position.lerp(targetPos, alpha)
    lookCurrent.lerp(targetLook, alpha)
    camera.lookAt(lookCurrent)
  })

  return null
}

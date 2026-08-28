import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, Vector3 } from 'three'
import { getSmoothedScrollProgress } from '../hooks/useScrollProgress.ts'
import { gridYaw, setFloorPivotAtScreenBottom } from './gridTransform.ts'

type GridWorldValue = {
  pivot: Vector3
}

const GridWorldContext = createContext<GridWorldValue | null>(null)

export function useGridWorld(): GridWorldValue {
  const ctx = useContext(GridWorldContext)
  if (!ctx) {
    throw new Error('useGridWorld must be used inside GridWorld')
  }
  return ctx
}

export function GridWorld({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  const ndc = useMemo(() => new Vector3(), [])
  const ray = useMemo(() => new Vector3(), [])
  const pivot = useMemo(() => new Vector3(), [])
  const value = useMemo(() => ({ pivot }), [pivot])

  useFrame(({ camera }) => {
    const root = group.current
    if (!root) return
    const yaw = gridYaw(getSmoothedScrollProgress())
    setFloorPivotAtScreenBottom(camera, ndc, ray, pivot)
    root.position.copy(pivot)
    // Same sign as Ground uYaw. Shader xz is [[c,-s],[s,c]]; Three.js Y is
    // [[c,s],[-s,c]] — negating yaw here spins objects against the painted cells.
    root.rotation.y = yaw
  })

  return (
    <GridWorldContext.Provider value={value}>
      <group ref={group}>{children}</group>
    </GridWorldContext.Provider>
  )
}

export function GridRest({
  x,
  y = 0,
  z,
  children,
}: {
  x: number
  y?: number
  z: number
  children: ReactNode
}) {
  const { pivot } = useGridWorld()
  const ref = useRef<Group>(null)

  useFrame(() => {
    const node = ref.current
    if (!node) return
    node.position.set(x - pivot.x, y, z - pivot.z)
  })

  return <group ref={ref}>{children}</group>
}

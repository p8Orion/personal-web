import { useEffect, useState } from 'react'

export type PerfTier = {
  isMobile: boolean
  skipFx: boolean
  dpr: number | [number, number]
}

function readSaveData(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection
  return Boolean(connection?.saveData)
}

function detectTier(): PerfTier {
  const isMobile =
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  const skipFx = isMobile || readSaveData()

  return {
    isMobile,
    skipFx,
    dpr: skipFx ? 1 : [1, 2],
  }
}

export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState(detectTier)

  useEffect(() => {
    const onChange = () => setTier(detectTier())
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])

  return tier
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

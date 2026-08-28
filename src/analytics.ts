import { useEffect } from 'react'
import { subscribeScroll } from './hooks/useScrollProgress.ts'

const SCROLL_STEPS = [0.2, 0.4, 0.6, 0.8, 1] as const
const firedScroll = new Set<number>()

type UmamiPayload = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiPayload) => void }
  }
}

export function track(event: string, data?: UmamiPayload): void {
  window.umami?.track(event, data)
}

export function imageFile(src: string): string {
  const path = src.split('?')[0] ?? src
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const name = slash >= 0 ? path.slice(slash + 1) : path
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

function markScroll(z: number): void {
  for (const step of SCROLL_STEPS) {
    if (z + 1e-6 < step || firedScroll.has(step)) continue
    firedScroll.add(step)
    track(`scroll-${step.toFixed(1)}`)
  }
}

/** Fires each 0.2 Z milestone once per visit, including catch-up if the page opens mid-scroll. */
export function useBindUmami(): void {
  useEffect(() => subscribeScroll(markScroll), [])
}

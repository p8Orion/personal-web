import { useEffect, useState } from 'react'

let progress = 0
const listeners = new Set<(value: number) => void>()

/** 0 at the top, 1 at the bottom of the current document — independent of section count. */
export function readDocumentScrollProgress(): number {
  const root = document.scrollingElement ?? document.documentElement
  const height = Math.max(
    root.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  )
  const max = height - window.innerHeight
  if (max <= 0) return 0
  const top = window.scrollY || root.scrollTop || 0
  if (top <= 0) return 0
  if (top >= max) return 1
  return top / max
}

export function getScrollProgress(): number {
  return progress
}

let smoothed = 0

/** Follows the document scroll with damping — tick once per frame from the canvas. */
export function tickScrollSmoothing(delta: number): number {
  const target = readDocumentScrollProgress()
  const lambda = 1 - Math.exp(-delta * 2.05)
  smoothed += (target - smoothed) * lambda
  if (Math.abs(target - smoothed) < 0.0002) smoothed = target
  return smoothed
}

export function getSmoothedScrollProgress(): number {
  return smoothed
}

export function setScrollProgress(value: number): void {
  const next = value < 0 ? 0 : value > 1 ? 1 : value
  if (next === progress) return
  progress = next
  for (const listener of listeners) listener(next)
}

export function subscribeScroll(listener: (value: number) => void): () => void {
  listeners.add(listener)
  listener(progress)
  return () => {
    listeners.delete(listener)
  }
}

export function useBindScrollProgress(): void {
  useEffect(() => {
    let frame = 0

    const update = () => {
      setScrollProgress(readDocumentScrollProgress())
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    const observer = new ResizeObserver(onScroll)
    observer.observe(document.documentElement)
    observer.observe(document.body)

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}

export function useScrollProgress(): number {
  const [value, setValue] = useState(getScrollProgress)
  useEffect(() => subscribeScroll(setValue), [])
  return value
}

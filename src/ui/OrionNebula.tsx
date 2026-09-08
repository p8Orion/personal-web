import { useEffect, useRef } from 'react'
import {
  MATRIX_CLOUD_HUE,
  MATRIX_CLOUD_SPEED,
  NEBULA_ALPHA,
  NEBULA_CLOUD_ALPHA,
  NEBULA_EDGE_FADE,
  NEBULA_HUE_SPAN,
  NEBULA_PIVOT_X,
  NEBULA_PIVOT_Y,
  NEBULA_RADIUS,
  NEBULA_SOFT_EDGE,
  NEBULA_SPIN,
  NEBULA_SPIN_DESKTOP,
  NEBULA_STAR_COUNT,
  NEBULA_STAR_COUNT_DESKTOP,
  NEBULA_STAR_SCALE_DESKTOP,
  NEBULA_TWINKLE,
  NEBULA_Z_END,
  NEBULA_Z_FADE,
  NEBULA_Z_START,
  NEBULA_ZOOM,
} from '../content/debug.ts'
import { pic } from '../content/pic.ts'
import { zWindowFade } from '../content/zMap.ts'
import { hueToRgb, paletteHues, wrapHue } from '../scene/materials.ts'
import { fitOverlayCanvas } from './fitOverlayCanvas.ts'
import { paintClouds } from './stageClouds.ts'

/**
 * The photo is an <img>, not a canvas blit. OrionNebula.jpg is a 2048² Hubble
 * mosaic; putting the old 960 through fitOverlayCanvas stretched it twice.
 * CSS scales the original once at device pixels.
 */
const NEBULA_SRC = pic('OrionNebula.jpg')
const STAR_FPS = 24

type Star = {
  x: number
  y: number
  size: number
  phase: number
  rate: number
  useSc1: boolean
  spike: boolean
}

function nebulaWindow(): { start: number; end: number } {
  const start = Math.min(NEBULA_Z_START, NEBULA_Z_END)
  const end = Math.max(NEBULA_Z_START, NEBULA_Z_END)
  return { start, end: Math.max(end, start + 1e-4) }
}

function nebulaWindowFade(z: number): number {
  return zWindowFade(z, NEBULA_Z_START, NEBULA_Z_END, NEBULA_Z_FADE)
}

function nebulaLocal(z: number): number {
  const { start, end } = nebulaWindow()
  return Math.min(1, Math.max(0, (z - start) / (end - start)))
}

function layout(el: HTMLElement): {
  pivotX: number
  pivotY: number
  orbitX: number
  orbitY: number
  size: number
} {
  const w = el.clientWidth
  const h = el.clientHeight
  const rect = el.getBoundingClientRect()
  const vw = Math.max(1, window.innerWidth)
  const pivotX = NEBULA_PIVOT_X * vw - rect.left
  const pivotY = h * NEBULA_PIVOT_Y
  const restX = w * 0.5 - pivotX
  const restY = h * 0.5 - pivotY
  const restLen = Math.hypot(restX, restY) || 1
  const radius = Math.max(0, NEBULA_RADIUS) * vw
  return {
    pivotX,
    pivotY,
    orbitX: (restX / restLen) * radius,
    orbitY: (restY / restLen) * radius,
    size: Math.max(w, h) * Math.max(0.05, NEBULA_ZOOM),
  }
}

function canvasPivot(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const vw = Math.max(1, window.innerWidth)
  const screenX = NEBULA_PIVOT_X * vw
  const x = ((screenX - rect.left) / Math.max(rect.width, 1e-5)) * w
  const y = h * NEBULA_PIVOT_Y
  return { x, y }
}

function pivotReach(
  w: number,
  h: number,
  pivot: { x: number; y: number },
): number {
  return Math.max(
    Math.hypot(-pivot.x, -pivot.y),
    Math.hypot(w - pivot.x, -pivot.y),
    Math.hypot(w - pivot.x, h - pivot.y),
    Math.hypot(-pivot.x, h - pivot.y),
  )
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function buildStars(count: number): Star[] {
  const n = Math.max(0, Math.round(count))
  const stars: Star[] = []
  for (let i = 0; i < n; i += 1) {
    const u = hash01(i * 3.17 + 0.1)
    const v = hash01(i * 5.91 + 0.4)
    const r = Math.sqrt(u)
    const a = v * Math.PI * 2
    const mag = hash01(i * 9.2)
    stars.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      size: 0.35 + mag ** 2.4 * 3.4,
      phase: hash01(i * 13.3) * Math.PI * 2,
      rate: 0.7 + hash01(i * 17.8) * 2.2,
      useSc1: hash01(i * 23.1) > 0.48,
      spike: mag > 0.88,
    })
  }
  return stars
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  star: Star,
  x: number,
  y: number,
  scale: number,
  tw: number,
  rgb: [number, number, number],
): void {
  const r = Math.max(0.12, star.size * scale)
  const [cr, cg, cb] = rgb
  ctx.fillStyle = `rgba(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)}, ${tw})`
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (!star.spike) return
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineWidth = Math.max(0.15, r * 0.22)
  const s = r * 3.4
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(x + s, y)
  ctx.moveTo(x, y - s)
  ctx.lineTo(x, y + s)
  ctx.stroke()
}

export function OrionNebula({ z }: { z: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cloudRef = useRef<HTMLCanvasElement>(null)
  const zRef = useRef(z)
  zRef.current = z
  const fade = nebulaWindowFade(z)
  const local = nebulaLocal(z)
  const soft = Math.min(1, Math.max(0, NEBULA_SOFT_EDGE))

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const apply = () => {
      const next = layout(root)
      root.style.setProperty('--nebula-pivot-x', `${next.pivotX}px`)
      root.style.setProperty('--nebula-pivot-y', `${next.pivotY}px`)
      root.style.setProperty('--nebula-orbit-x', `${next.orbitX}px`)
      root.style.setProperty('--nebula-orbit-y', `${next.orbitY}px`)
      root.style.setProperty('--nebula-size', `${next.size}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(root)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [fade > 0.001])

  useEffect(() => {
    if (fade <= 0.001) return
    const canvas = canvasRef.current
    const cloud = cloudRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    const cloudCtx = cloud?.getContext('2d', { alpha: true })
    if (!ctx) return

    let stars: Star[] = []
    let starKey = ''
    let frame = 0
    let last = 0
    let alive = true
    const gap = 1000 / STAR_FPS

    const draw = (now: number) => {
      if (!alive) return
      frame = requestAnimationFrame(draw)
      if (document.visibilityState !== 'visible') return
      if (now - last < gap) return
      last = now
      const zNow = zRef.current
      if (nebulaWindowFade(zNow) <= 0.001) return

      // Stars are glows; they can sit on a cheaper buffer than the photo.
      fitOverlayCanvas(canvas, 1.25, 1600)
      const w = canvas.width
      const h = canvas.height
      const { start, end } = nebulaWindow()
      const tLocal = Math.min(1, Math.max(0, (zNow - start) / (end - start)))
      const hues = paletteHues(start + tLocal * NEBULA_HUE_SPAN)
      const sc1 = hueToRgb(hues.SC_1, 0.82, 0.55)
      const white: [number, number, number] = [1, 1, 1]
      const mobile = window.matchMedia('(max-width: 768px)').matches
      if (cloud && cloudCtx && NEBULA_CLOUD_ALPHA > 0) {
        paintClouds(
          cloud,
          cloudCtx,
          hueToRgb(wrapHue(hues.SC_2 + MATRIX_CLOUD_HUE), 0.4, 0.4),
          now * 0.001,
          MATRIX_CLOUD_SPEED,
          NEBULA_EDGE_FADE,
          mobile,
        )
      }
      const starScale = mobile ? 1 : Math.max(0.01, NEBULA_STAR_SCALE_DESKTOP)
      const countScale = mobile ? 1 : Math.max(0, NEBULA_STAR_COUNT_DESKTOP)
      const px = (Math.max(w, h) / 720) * starScale
      const pivot = canvasPivot(canvas, w, h)
      const reach = pivotReach(w, h, pivot) * 1.06
      const count = Math.round(NEBULA_STAR_COUNT * countScale)
      const key = `${w}|${h}|${count}|${Math.round(reach)}`
      if (key !== starKey) {
        starKey = key
        const ratio = (Math.PI * reach * reach) / Math.max(1, w * h)
        stars = buildStars(Math.round(count * Math.max(1, ratio)))
      }

      const twinkle = now * 0.001 * Math.max(0, NEBULA_TWINKLE)
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(pivot.x, pivot.y)
      ctx.globalCompositeOperation = 'lighter'
      for (const star of stars) {
        const tw =
          0.18 +
          0.82 *
            (0.5 + 0.5 * Math.sin(twinkle * star.rate * 2.4 + star.phase)) ** 2
        drawStar(
          ctx,
          star,
          star.x * reach,
          star.y * reach,
          px,
          tw,
          star.useSc1 ? sc1 : white,
        )
      }
      ctx.restore()
    }

    frame = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
    }
  }, [fade > 0.001])

  if (fade <= 0.001) return null

  const desktop = !window.matchMedia('(max-width: 768px)').matches
  const spin = NEBULA_SPIN * (desktop ? Math.max(0, NEBULA_SPIN_DESKTOP) : 1)

  return (
    <div
      aria-hidden
      className="stage__nebula"
      ref={rootRef}
      style={{
        ['--nebula-angle' as string]: `${-local * spin * 360}deg`,
        ['--nebula-soft-inner' as string]: `${Math.max(0, 1 - soft) * 98}%`,
      }}
    >
      <canvas
        className="stage__nebula-clouds"
        ref={cloudRef}
        style={{ opacity: fade * NEBULA_CLOUD_ALPHA }}
      />
      <div className="stage__nebula-spin" style={{ opacity: fade * NEBULA_ALPHA }}>
        <img alt="" className="stage__nebula-photo" src={NEBULA_SRC} />
        <canvas className="stage__nebula-stars" ref={canvasRef} />
      </div>
    </div>
  )
}

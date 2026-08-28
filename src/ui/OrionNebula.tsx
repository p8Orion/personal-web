import { useEffect, useRef } from 'react'
import {
  NEBULA_ALPHA,
  NEBULA_EDGE_FADE,
  NEBULA_HUE_SPAN,
  NEBULA_PIVOT_X,
  NEBULA_PIVOT_Y,
  NEBULA_RADIUS,
  NEBULA_SOFT_EDGE,
  NEBULA_SPIN,
  NEBULA_STAR_COUNT,
  NEBULA_STAR_SCALE_DESKTOP,
  NEBULA_TWINKLE,
  NEBULA_Z_END,
  NEBULA_Z_FADE,
  NEBULA_Z_START,
  NEBULA_ZOOM,
} from '../content/debug.ts'
import { pic } from '../content/pic.ts'
import { zWindowFade } from '../content/zMap.ts'
import { hueToRgb, paletteHues } from '../scene/materials.ts'
import { fitOverlayCanvas } from './fitOverlayCanvas.ts'

const NEBULA_SRC = pic('OrionNebula.webp')

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

function orbitOffset(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  pivot: { x: number; y: number },
): { x: number; y: number } {
  const restX = w * 0.5 - pivot.x
  const restY = h * 0.5 - pivot.y
  const restLen = Math.hypot(restX, restY) || 1
  const rect = canvas.getBoundingClientRect()
  const radiusPx =
    Math.max(0, NEBULA_RADIUS) *
    Math.max(1, window.innerWidth) *
    (w / Math.max(rect.width, 1e-5))
  return { x: (restX / restLen) * radiusPx, y: (restY / restLen) * radiusPx }
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

function applyPhotoVignette(
  ctx: CanvasRenderingContext2D,
  dw: number,
  dh: number,
  soft: number,
): void {
  const band = Math.min(1, Math.max(0, soft))
  if (band < 1e-5) return
  const r = Math.min(dw, dh) * 0.5 * 0.98
  const inner = Math.max(0, 1 - band)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, '#fff')
  if (inner > 1e-4 && inner < 1) g.addColorStop(inner, '#fff')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = g
  ctx.fillRect(-dw * 0.5, -dh * 0.5, dw, dh)
  ctx.globalCompositeOperation = 'source-over'
}

function applyEdgeMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  edge: number,
  bottomOnly: boolean,
): void {
  const uv = Math.min(0.5, Math.max(0, edge))
  if (uv < 1e-5) return
  ctx.globalCompositeOperation = 'destination-in'
  if (bottomOnly) {
    const g = ctx.createLinearGradient(0, h * (1 - uv), 0, h)
    g.addColorStop(0, '#fff')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else {
    const gx = ctx.createLinearGradient(0, 0, w, 0)
    gx.addColorStop(0, 'rgba(0,0,0,0)')
    gx.addColorStop(uv, '#fff')
    gx.addColorStop(1 - uv, '#fff')
    gx.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gx
    ctx.fillRect(0, 0, w, h)
    const gy = ctx.createLinearGradient(0, 0, 0, h)
    gy.addColorStop(0, 'rgba(0,0,0,0)')
    gy.addColorStop(uv, '#fff')
    gy.addColorStop(1 - uv, '#fff')
    gy.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gy
    ctx.fillRect(0, 0, w, h)
  }
  ctx.globalCompositeOperation = 'source-over'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zRef = useRef(z)
  zRef.current = z
  const fade = nebulaWindowFade(z)

  useEffect(() => {
    if (fade <= 0.001) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = NEBULA_SRC
    let stars: Star[] = []
    let starKey = ''
    let frame = 0
    let alive = true

    const fit = () => {
      fitOverlayCanvas(canvas, 1.75, 1920)
    }

    const draw = (now: number) => {
      if (!alive) return
      const zNow = zRef.current
      const vis = nebulaWindowFade(zNow)
      if (vis <= 0.001) {
        frame = requestAnimationFrame(draw)
        return
      }
      fit()
      const w = canvas.width
      const h = canvas.height
      const { start, end } = nebulaWindow()
      const local = Math.min(1, Math.max(0, (zNow - start) / (end - start)))
      const hues = paletteHues(start + local * NEBULA_HUE_SPAN)
      const sc1 = hueToRgb(hues.SC_1, 0.82, 0.55)
      const white: [number, number, number] = [1, 1, 1]
      const mobile = window.matchMedia('(max-width: 768px)').matches
      const cover = Math.max(w, h) * Math.max(0.05, NEBULA_ZOOM)
      // Canvas 2d positive rotate is clockwise; negate so +NEBULA_SPIN is CCW.
      const angle = -local * NEBULA_SPIN * Math.PI * 2
      const t = now * 0.001 * Math.max(0, NEBULA_TWINKLE)
      const starScale = mobile ? 1 : Math.max(0.01, NEBULA_STAR_SCALE_DESKTOP)
      const px = (Math.max(w, h) / 720) * starScale
      const pivot = canvasPivot(canvas, w, h)
      const orbit = orbitOffset(canvas, w, h, pivot)
      const reach = pivotReach(w, h, pivot) * 1.06
      const key = `${w}|${h}|${NEBULA_STAR_COUNT}|${Math.round(reach)}`
      if (key !== starKey) {
        starKey = key
        const ratio = (Math.PI * reach * reach) / Math.max(1, w * h)
        stars = buildStars(Math.round(NEBULA_STAR_COUNT * Math.max(1, ratio)))
      }

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(pivot.x, pivot.y)
      ctx.rotate(angle)
      ctx.save()
      ctx.translate(orbit.x, orbit.y)
      if (img.naturalWidth > 0) {
        const scale = cover / Math.min(img.naturalWidth, img.naturalHeight)
        const dw = img.naturalWidth * scale
        const dh = img.naturalHeight * scale
        ctx.drawImage(img, -dw * 0.5, -dh * 0.5, dw, dh)
        applyPhotoVignette(ctx, dw, dh, NEBULA_SOFT_EDGE)
      }
      ctx.restore()
      ctx.globalCompositeOperation = 'lighter'
      for (const star of stars) {
        const tw =
          0.18 +
          0.82 *
            (0.5 + 0.5 * Math.sin(t * star.rate * 2.4 + star.phase)) ** 2
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
      applyEdgeMask(ctx, w, h, NEBULA_EDGE_FADE, mobile)
      frame = requestAnimationFrame(draw)
    }

    const startLoop = () => {
      if (!alive) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    img.addEventListener('load', startLoop)
    if (img.complete) startLoop()
    else frame = requestAnimationFrame(draw)

    return () => {
      alive = false
      img.removeEventListener('load', startLoop)
      cancelAnimationFrame(frame)
    }
  }, [fade > 0.001])

  if (fade <= 0.001) return null

  return (
    <canvas
      aria-hidden
      className="stage__nebula"
      ref={canvasRef}
      style={{ opacity: fade * NEBULA_ALPHA }}
    />
  )
}

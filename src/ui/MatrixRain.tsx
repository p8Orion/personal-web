import { useEffect, useRef } from 'react'
import {
  MATRIX_ALPHA,
  MATRIX_CLOUD_ALPHA,
  MATRIX_CLOUD_HUE,
  MATRIX_CLOUD_SPEED,
  MATRIX_DENSITY_DESKTOP,
  MATRIX_EDGE_FADE,
  MATRIX_HUE_SPAN,
  MATRIX_SPEED,
  MATRIX_TRAIL,
  MATRIX_Z_END,
  MATRIX_Z_FADE,
  MATRIX_Z_START,
} from '../content/debug.ts'
import { hueToRgb, paletteHues, wrapHue } from '../scene/materials.ts'
import { fitOverlayCanvas } from './fitOverlayCanvas.ts'
import { applyEdgeMask, paintClouds } from './stageClouds.ts'

const GLYPHS =
  '0123456789ABCDEF<>[]{};:=/\\|*+#ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ01$#@'

type Column = {
  x: number
  y: number
  speed: number
  trail: number
  glyphs: string[]
}

function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function matrixWindow(): { start: number; end: number } {
  const start = Math.min(MATRIX_Z_START, MATRIX_Z_END)
  const end = Math.max(MATRIX_Z_START, MATRIX_Z_END)
  return { start, end: Math.max(end, start + 1e-4) }
}

function matrixWindowFade(z: number): number {
  const { start, end } = matrixWindow()
  const span = end - start
  const band = Math.min(span * 0.5, Math.max(0, MATRIX_Z_FADE))
  if (band < 1e-6) {
    return z >= start && z <= end ? 1 : 0
  }
  return smooth01(start, start + band, z) * (1 - smooth01(end - band, end, z))
}

function glyphAt(n: number): string {
  const i = Math.abs(Math.floor(Math.sin(n * 127.1 + 311.7) * 43758.5453))
  return GLYPHS[i % GLYPHS.length]
}

function glyphDensity(): number {
  if (window.matchMedia('(max-width: 768px)').matches) return 1
  return Math.max(0.05, MATRIX_DENSITY_DESKTOP)
}

function buildColumns(
  width: number,
  height: number,
  colW: number,
  density: number,
): Column[] {
  const hold = Math.max(0.25, MATRIX_TRAIL)
  // Same cell size as before; a bit of unused pitch so trails do not sit flush.
  const count = Math.max(8, Math.ceil(width / (colW * 1.28)))
  const cols: Column[] = []
  for (let i = 0; i < count; i += 1) {
    const trail = Math.max(6, Math.round((10 + (i * 7) % 18) * hold * density))
    const glyphs = Array.from({ length: trail }, (_, k) => glyphAt(i * 17 + k * 3.1))
    cols.push({
      x: (i + 0.5) * (width / count),
      y: Math.random() * height,
      speed: 48 + (i * 13) % 90,
      trail,
      glyphs,
    })
  }
  return cols
}

export function MatrixRain({ z }: { z: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cloudRef = useRef<HTMLCanvasElement>(null)
  const colsRef = useRef<Column[]>([])
  const zRef = useRef(z)
  zRef.current = z
  const fade = matrixWindowFade(z)

  useEffect(() => {
    if (fade <= 0.001) return
    const canvas = canvasRef.current
    const cloud = cloudRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cloudCtx = cloud?.getContext('2d')
    if (!ctx) return

    let frame = 0
    let last = performance.now()
    let lastDraw = 0
    let colW = 14
    let lineH = 16
    let fitted = false
    let lastDensity = 0
    const gap = 1000 / 30

    const fit = () => {
      const density = glyphDensity()
      const resized = fitOverlayCanvas(canvas, 1.5, 1920)
      if (!resized && fitted && density === lastDensity) return
      fitted = true
      lastDensity = density
      const w = canvas.width
      // Density has to ride colW: the column count is width / colW, and lineH follows
      // it so the glyph cell stays square-ish. Shrinking only lineH thins the grid out.
      colW = Math.max(12, w / 28) / density
      lineH = colW * 1.15
      colsRef.current = buildColumns(w, canvas.height, colW, density)
    }

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      if (document.visibilityState !== 'visible') return
      if (now - lastDraw < gap) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      lastDraw = now
      const zNow = zRef.current
      const vis = matrixWindowFade(zNow)
      if (vis <= 0.001) return
      fit()
      const w = canvas.width
      const h = canvas.height
      const { start, end } = matrixWindow()
      const local = Math.min(1, Math.max(0, (zNow - start) / (end - start)))
      const hues = paletteHues(start + local * MATRIX_HUE_SPAN)
      const [r, g, b] = hueToRgb(hues.SC_1, 0.82, 0.55)
      const cloudRgb = hueToRgb(wrapHue(hues.SC_2 + MATRIX_CLOUD_HUE), 0.4, 0.4)
      const speed = Math.max(0, MATRIX_SPEED)
      const hold = Math.max(0.25, MATRIX_TRAIL)
      const mobile = window.matchMedia('(max-width: 768px)').matches
      if (cloud && cloudCtx && MATRIX_CLOUD_ALPHA > 0) {
        paintClouds(
          cloud,
          cloudCtx,
          cloudRgb,
          now * 0.001,
          MATRIX_CLOUD_SPEED,
          MATRIX_EDGE_FADE,
          mobile,
        )
      }

      const erase = Math.min(1, 1 / hold)
      if (erase >= 0.999) {
        ctx.clearRect(0, 0, w, h)
      } else {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = `rgba(0,0,0,${erase})`
        ctx.fillRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.font = `${Math.round(lineH * 0.85)}px "IBM Plex Mono", ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      for (const col of colsRef.current) {
        col.y -= col.speed * speed * dt
        if (col.y < -col.trail * lineH) {
          col.y = h + Math.random() * h * 0.35
          for (let k = 0; k < col.glyphs.length; k += 1) {
            if (Math.random() > 0.72) col.glyphs[k] = glyphAt(now * 0.001 + k)
          }
        }
        for (let t = 0; t < col.trail; t += 1) {
          const gy = col.y + t * lineH
          if (gy < -lineH || gy > h) continue
          if (Math.random() > 0.985) col.glyphs[t] = glyphAt(now * 0.01 + col.x + t)
          const falloff = t === 0 ? 1 : Math.max(0.08, (1 - t / col.trail) ** (1 / hold))
          const a = falloff * (t === 0 ? 1 : 0.72)
          if (t === 0) {
            ctx.fillStyle = `rgba(230, 255, 240, ${a})`
          } else {
            ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
          }
          ctx.fillText(col.glyphs[t] ?? '0', col.x, gy)
        }
      }

      applyEdgeMask(ctx, w, h, MATRIX_EDGE_FADE, mobile)
    }

    fit()
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [fade > 0.001])

  if (fade <= 0.001) return null

  return (
    <div aria-hidden className="stage__matrix">
      <canvas
        className="stage__matrix-clouds"
        ref={cloudRef}
        style={{ opacity: fade * MATRIX_CLOUD_ALPHA }}
      />
      <canvas
        className="stage__matrix-rain"
        ref={canvasRef}
        style={{ opacity: fade * MATRIX_ALPHA }}
      />
    </div>
  )
}

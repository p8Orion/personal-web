import { fitOverlayCanvas } from './fitOverlayCanvas.ts'

/**
 * Compact lobes in UV. Big ellipses were reading as a flat wash, and the ones
 * near y=0 got sliced by the canvas — that was the hard cut at the top.
 */
const CLOUD_BLOBS = [
  { x: 0.26, y: 0.34, rx: 0.26, ry: 0.13, gain: 0.58, phase: 0.3, rate: 0.08 },
  { x: 0.42, y: 0.3, rx: 0.22, ry: 0.11, gain: 0.46, phase: 1.1, rate: 0.065 },
  { x: 0.64, y: 0.36, rx: 0.28, ry: 0.14, gain: 0.54, phase: 2.0, rate: 0.07 },
  { x: 0.8, y: 0.32, rx: 0.22, ry: 0.11, gain: 0.48, phase: 2.8, rate: 0.06 },
  { x: 0.2, y: 0.54, rx: 0.24, ry: 0.12, gain: 0.42, phase: 3.6, rate: 0.07 },
  { x: 0.5, y: 0.5, rx: 0.3, ry: 0.14, gain: 0.38, phase: 4.4, rate: 0.055 },
  { x: 0.74, y: 0.56, rx: 0.26, ry: 0.12, gain: 0.5, phase: 5.1, rate: 0.08 },
  { x: 0.34, y: 0.7, rx: 0.26, ry: 0.13, gain: 0.44, phase: 5.8, rate: 0.06 },
  { x: 0.58, y: 0.72, rx: 0.22, ry: 0.11, gain: 0.4, phase: 0.8, rate: 0.07 },
  { x: 0.82, y: 0.66, rx: 0.2, ry: 0.1, gain: 0.36, phase: 1.7, rate: 0.055 },
] as const

/** Side lumps so a blob is a little cloud, not a circle. */
const LUMPS: [number, number, number][] = [
  [0, 0, 1],
  [-0.55, 0.12, 0.62],
  [0.5, 0.18, 0.55],
]

export function applyEdgeMask(
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

function fillLobe(
  ctx: CanvasRenderingContext2D,
  ir: number,
  ig: number,
  ib: number,
  gain: number,
): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(${ir}, ${ig}, ${ib}, ${gain})`)
  g.addColorStop(0.28, `rgba(${ir}, ${ig}, ${ib}, ${gain * 0.55})`)
  g.addColorStop(0.62, `rgba(${ir}, ${ig}, ${ib}, ${gain * 0.16})`)
  g.addColorStop(1, `rgba(${ir}, ${ig}, ${ib}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
}

export function paintClouds(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  rgb: [number, number, number],
  seconds: number,
  speed: number,
  _edge: number,
  _bottomOnly: boolean,
): void {
  fitOverlayCanvas(canvas, 1, 768)
  const w = canvas.width
  const h = canvas.height
  const [cr, cg, cb] = rgb
  const ir = Math.round(cr * 255)
  const ig = Math.round(cg * 255)
  const ib = Math.round(cb * 255)
  const t = seconds * Math.max(0, speed)
  ctx.clearRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'lighter'
  for (const blob of CLOUD_BLOBS) {
    const driftX = 0.08 * Math.sin(t * blob.rate * Math.PI * 2 + blob.phase)
    const driftY = 0.06 * Math.cos(t * blob.rate * 0.71 * Math.PI * 2 + blob.phase)
    const breathe = 1 + 0.06 * Math.sin(t * blob.rate * 1.4 + blob.phase)
    const rx = blob.rx * breathe
    const ry = blob.ry * breathe
    const cx = (blob.x + driftX) * w
    const cy = (blob.y + driftY) * h
    for (const [lx, ly, scale] of LUMPS) {
      ctx.save()
      ctx.translate(cx + lx * rx * w, cy + ly * ry * h)
      ctx.scale(rx * scale * w, ry * scale * h)
      fillLobe(ctx, ir, ig, ib, blob.gain * scale)
      ctx.restore()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}

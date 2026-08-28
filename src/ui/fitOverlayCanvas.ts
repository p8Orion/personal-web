/**
 * Size an overlay canvas so the backing store matches the CSS box aspect.
 * Independent min(maxEdge, w) / min(maxEdge, h) clamps produce a square
 * buffer that CSS then stretches across the fullscreen Z-panel.
 */
export function fitOverlayCanvas(
  canvas: HTMLCanvasElement,
  maxDpr: number,
  maxEdge: number,
): boolean {
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
  const cssW = Math.max(1, canvas.clientWidth)
  const cssH = Math.max(1, canvas.clientHeight)
  const scale = Math.min(dpr, maxEdge / Math.max(cssW, cssH, 1))
  const w = Math.max(1, Math.round(cssW * scale))
  const h = Math.max(1, Math.round(cssH * scale))
  if (canvas.width === w && canvas.height === h) return false
  canvas.width = w
  canvas.height = h
  return true
}

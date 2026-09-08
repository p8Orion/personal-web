import { useEffect, useRef } from 'react'
import {
  FRACTAL_ALPHA,
  FRACTAL_BLUR,
  FRACTAL_DRIFT,
  FRACTAL_EDGE_FADE,
  FRACTAL_HUE_SPAN,
  FRACTAL_MAX_DPR,
  FRACTAL_MAX_EDGE,
  FRACTAL_MAX_ITER,
  FRACTAL_PULSE,
  FRACTAL_PULSE_DRIFT,
  FRACTAL_PULSE_PERIOD,
  FRACTAL_SEED,
  FRACTAL_SEED_JITTER,
  FRACTAL_SPIN,
  FRACTAL_SUPERSAMPLE,
  FRACTAL_TARGET,
  FRACTAL_Z_END,
  FRACTAL_Z_FADE,
  FRACTAL_Z_START,
  FRACTAL_ZOOM_SPEED,
} from '../content/debug.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { hueToRgb, paletteHues } from '../scene/materials.ts'
import { fitOverlayCanvas } from './fitOverlayCanvas.ts'

const SCALE_START = 0.14
const SCALE_END = 0.0015
/** Shared with the shader so the uniform can never outrun the loop. */
const MAX_ITER = Math.round(FRACTAL_MAX_ITER)
/** GLSL ES 1.0 needs a constant loop bound, so this is baked in, not a uniform. */
const AA = Math.max(1, Math.round(FRACTAL_SUPERSAMPLE))
/** Repaint rate of the hue pulse. The escape loop is costly and the pulse is slow. */
const PULSE_FPS = 30
/**
 * Wobble layers as [period multiplier, phase]. The multipliers share no small
 * common factor, so the layers never realign and the drift reads as organic
 * instead of as a loop.
 */
const PULSE_LAYERS: [number, number][] = [
  [1, 0],
  [0.617, 1.7],
  [0.283, 4.1],
]
/**
 * Boundary points, each one searched for and scored by scripts/fractal-targets.mjs
 * rather than taken from a list of famous coordinates: a landmark's published
 * position is only interesting at the depth someone published it for, and this
 * zoom has to hold up across its whole range on a 256-iteration budget.
 *
 * The score below is the weakest frame of the run — structure on screen times
 * how far the interior/exterior split sits from all-black or all-empty. Order
 * matches FRACTAL_TARGET.
 */
const TARGETS: [number, number][] = [
  [-0.28648686660716, 0.644711683022545], // 0.32
  [0.049341333066425, 0.645248677170096], // 0.29
  [-0.404230986083038, 0.59597494515332], // 0.28
  [0.063895078276557, -0.636687775385131], // 0.27
  [-1.079834295458769, 0.249104285773453], // 0.26
  [-0.549840102936134, 0.497454411600146], // 0.26
  [-0.726391648564532, 0.245772860797786], // 0.23
  [-1.240317061674926, 0.115539993228523], // 0.22
  [-0.656043986159563, 0.373719704782871], // 0.22
  [0.395198668482708, 0.313333660724643], // 0.22
]

/** Drawn once per load: which landmark, how deep it starts, where it pans from. */
const RUN_TARGET =
  TARGETS[
    FRACTAL_TARGET >= 0
      ? Math.round(FRACTAL_TARGET) % TARGETS.length
      : Math.floor(Math.random() * TARGETS.length)
  ]
const RUN_SEED =
  Math.max(0, FRACTAL_SEED) + Math.random() * Math.max(0, FRACTAL_SEED_JITTER)
/** Which side the run opens from, so there is a pan and not only a zoom. */
const RUN_DRIFT = Math.random() * Math.PI * 2
const DRIFT_DIR = { x: Math.cos(RUN_DRIFT), y: Math.sin(RUN_DRIFT) }

const VERT = /* glsl */ `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform vec2 uCenter;
  uniform float uScale;
  uniform vec3 uSC1;
  uniform vec3 uSC2;
  uniform float uMaxIter;
  uniform float uBottomOnly;
  uniform float uEdgeFade;
  uniform float uAngle;

  const float MAX = ${MAX_ITER}.0;
  const int AA = ${AA};
  const float AA_F = ${AA}.0;

  /** rgb = escape colour, w = 0 inside the set, 1 outside. */
  vec4 sampleFractal(vec2 frag) {
    vec2 uv = (frag - 0.5 * uRes) / max(uRes.y, 1.0);
    float ca = cos(uAngle);
    float sa = sin(uAngle);
    vec2 ruv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);
    vec2 c = uCenter + ruv * uScale;
    vec2 z = vec2(0.0);
    float i = 0.0;
    for (float n = 0.0; n < MAX; n += 1.0) {
      if (n >= uMaxIter) break;
      if (dot(z, z) > 4.0) break;
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      i = n + 1.0;
    }
    if (i >= uMaxIter) return vec4(0.0);
    float mu = i - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
    float g = 0.5 + 0.5 * sin(mu * 0.55);
    return vec4(mix(uSC1, uSC2, g), 1.0);
  }

  void main() {
    // Averaging the samples is the whole point: one sample per pixel makes the
    // escape bands alias into speckle once they get thinner than a pixel.
    vec4 acc = vec4(0.0);
    for (int sy = 0; sy < AA; sy += 1) {
      for (int sx = 0; sx < AA; sx += 1) {
        vec2 off = (vec2(float(sx), float(sy)) + 0.5) / AA_F - 0.5;
        acc += sampleFractal(gl_FragCoord.xy + off);
      }
    }
    // Partial coverage also softens the rim of the set, which used to be a
    // hard alpha cut and jagged because of it.
    float cover = acc.w / (AA_F * AA_F);
    vec3 col = acc.w > 0.0 ? acc.rgb / acc.w : vec3(0.0);
    vec2 p = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float w = clamp(uEdgeFade, 0.0, 0.5);
    float bottom = w < 1e-5 ? 1.0 : smoothstep(0.0, w, p.y);
    float fx = w < 1e-5 ? 1.0 : smoothstep(0.0, w, p.x) * smoothstep(0.0, w, 1.0 - p.x);
    float fy = w < 1e-5 ? 1.0 : bottom * smoothstep(0.0, w, 1.0 - p.y);
    float rim = mix(fx * fy, bottom, uBottomOnly) * cover;
    gl_FragColor = vec4(col * rim, rim);
  }
`

/** Hue offset in turns at a given time. Stays inside ±FRACTAL_PULSE. */
function huePulse(seconds: number): number {
  if (FRACTAL_PULSE <= 0) return 0
  const period = Math.max(0.5, FRACTAL_PULSE_PERIOD)
  const drift = Math.min(1, Math.max(0, FRACTAL_PULSE_DRIFT))
  let sum = 0
  let total = 0
  let weight = 1
  for (const [scale, phase] of PULSE_LAYERS) {
    sum += Math.sin((seconds / (period * scale)) * Math.PI * 2 + phase) * weight
    total += weight
    weight *= drift
  }
  return (sum / total) * FRACTAL_PULSE
}

function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function fractalWindow(): { start: number; end: number } {
  const start = Math.min(FRACTAL_Z_START, FRACTAL_Z_END)
  const end = Math.max(FRACTAL_Z_START, FRACTAL_Z_END)
  return { start, end: Math.max(end, start + 1e-4) }
}

export function fractalWindowFade(z: number): number {
  const { start, end } = fractalWindow()
  const span = end - start
  const band = Math.min(span * 0.5, Math.max(0, FRACTAL_Z_FADE))
  if (band < 1e-6) {
    return z >= start && z <= end ? 1 : 0
  }
  return smooth01(start, start + band, z) * (1 - smooth01(end - band, end, z))
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

type GLState = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  vbo: WebGLBuffer
  loc: {
    res: WebGLUniformLocation | null
    center: WebGLUniformLocation | null
    scale: WebGLUniformLocation | null
    sc1: WebGLUniformLocation | null
    sc2: WebGLUniformLocation | null
    maxIter: WebGLUniformLocation | null
    bottomOnly: WebGLUniformLocation | null
    edgeFade: WebGLUniformLocation | null
    angle: WebGLUniformLocation | null
  }
}

function createGL(canvas: HTMLCanvasElement): GLState | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    stencil: false,
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  const vbo = gl.createBuffer()
  if (!vbo) return null
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  return {
    gl,
    program,
    vbo,
    loc: {
      res: gl.getUniformLocation(program, 'uRes'),
      center: gl.getUniformLocation(program, 'uCenter'),
      scale: gl.getUniformLocation(program, 'uScale'),
      sc1: gl.getUniformLocation(program, 'uSC1'),
      sc2: gl.getUniformLocation(program, 'uSC2'),
      maxIter: gl.getUniformLocation(program, 'uMaxIter'),
      bottomOnly: gl.getUniformLocation(program, 'uBottomOnly'),
      edgeFade: gl.getUniformLocation(program, 'uEdgeFade'),
      angle: gl.getUniformLocation(program, 'uAngle'),
    },
  }
}

function paint(
  canvas: HTMLCanvasElement,
  state: GLState,
  z: number,
  now = performance.now(),
): void {
  if (fractalWindowFade(z) <= 0.001) return
  fitOverlayCanvas(canvas, FRACTAL_MAX_DPR, FRACTAL_MAX_EDGE)
  const { start, end } = fractalWindow()
  const t = Math.min(1, Math.max(0, (z - start) / (end - start)))
  // Linear in t, like hue and spin. A smoothstep here has zero slope at the end
  // of the window, so the zoom coasts to a dead stop while the spin carries on
  // at full rate — which reads as the fractal running out of zoom and just
  // turning in place. Constant slope in log space is also constant apparent
  // zoom speed, so nothing is lost by dropping the ease.
  const zoomT = Math.min(1, t * Math.max(0, FRACTAL_ZOOM_SPEED))
  const depth = RUN_SEED + zoomT
  const logS = Math.log(SCALE_START) + (Math.log(SCALE_END) - Math.log(SCALE_START)) * depth
  const scale = Math.exp(logS)
  // Offset measured in current scales rather than absolute units: the target
  // then sits the same fraction off-centre at every depth, so the pan can run
  // the whole window instead of having to converge early to avoid flinging the
  // frame into empty space once the scale gets small.
  const drift = Math.max(0, FRACTAL_DRIFT) * scale * (1 - zoomT)
  // Rides on top of the Z walk, so the pulse never breaks step with the palette.
  // Linear in t, not eased: easing would park the hue at both ends of the window.
  const hues = paletteHues(start + t * FRACTAL_HUE_SPAN + huePulse(now / 1000))
  const sc1 = hueToRgb(hues.SC_2)
  const sc2 = hueToRgb(hues.SC_1)

  const { gl, program, vbo, loc } = state
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(loc.res, canvas.width, canvas.height)
  gl.uniform2f(
    loc.center,
    RUN_TARGET[0] + DRIFT_DIR.x * drift,
    RUN_TARGET[1] + DRIFT_DIR.y * drift,
  )
  gl.uniform1f(loc.scale, scale)
  gl.uniform3f(loc.sc1, sc1[0], sc1[1], sc1[2])
  gl.uniform3f(loc.sc2, sc2[0], sc2[1], sc2[2])
  // Past MAX_ITER the loop bails before the uniform does, and the interior — which should
  // read as a hole — comes out filled with one flat mixed colour.
  gl.uniform1f(loc.maxIter, Math.min(MAX_ITER, 72 + Math.min(depth, 1.6) * 110))
  gl.uniform1f(loc.bottomOnly, window.matchMedia('(max-width: 768px)').matches ? 1 : 0)
  gl.uniform1f(loc.edgeFade, FRACTAL_EDGE_FADE)
  // Linear in t, like hue: easing would park the spin at both ends of the window.
  gl.uniform1f(loc.angle, t * FRACTAL_SPIN * Math.PI * 2)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

export function MandelbrotField({ z }: { z: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zRef = useRef(z)
  zRef.current = z
  const fade = fractalWindowFade(z)
  const onStage = fade > 0.001
  const reducedMotion = useReducedMotion()

  // One loop for scroll, pulse, and resize. Painting from both a z-effect and
  // a pulse rAF was drawing the escape set twice whenever the page moved.
  useEffect(() => {
    if (!onStage) return
    const canvas = canvasRef.current
    if (!canvas) return
    const state = createGL(canvas)
    if (!state) return

    let dirty = true
    let lastZ = Number.NaN
    let lastPaint = 0
    let frame = 0
    const gap = 1000 / PULSE_FPS

    const mark = () => {
      dirty = true
    }
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      if (document.visibilityState !== 'visible') return
      const zNow = zRef.current
      if (fractalWindowFade(zNow) <= 0.001) return
      const zChanged = Number.isNaN(lastZ) || Math.abs(zNow - lastZ) > 1e-5
      const pulseDue =
        !reducedMotion && FRACTAL_PULSE > 0 && now - lastPaint >= gap
      if (!dirty && !zChanged && !pulseDue) return
      if (!dirty && now - lastPaint < gap) return
      dirty = false
      lastZ = zNow
      lastPaint = now
      paint(canvas, state, zNow, now)
    }

    const ro = new ResizeObserver(mark)
    ro.observe(canvas)
    const mq = window.matchMedia('(max-width: 768px)')
    mq.addEventListener('change', mark)
    frame = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', mark)
      cancelAnimationFrame(frame)
      state.gl.deleteBuffer(state.vbo)
      state.gl.deleteProgram(state.program)
    }
  }, [onStage, reducedMotion])

  if (!onStage) return null

  return (
    <canvas
      aria-hidden
      className="stage__fractal"
      ref={canvasRef}
      style={{
        // CSS pixels, so the softening holds its apparent size on any DPR.
        filter: FRACTAL_BLUR > 0 ? `blur(${FRACTAL_BLUR}px)` : undefined,
        opacity: fade * FRACTAL_ALPHA,
      }}
    />
  )
}

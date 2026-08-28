import { useEffect, useRef } from 'react'
import {
  FRACTAL_ALPHA,
  FRACTAL_EDGE_FADE,
  FRACTAL_HUE_SPAN,
  FRACTAL_SEED,
  FRACTAL_SPIN,
  FRACTAL_Z_END,
  FRACTAL_Z_FADE,
  FRACTAL_Z_START,
  FRACTAL_ZOOM_SPEED,
} from '../content/debug.ts'
import { hueToRgb, paletteHues } from '../scene/materials.ts'
import { fitOverlayCanvas } from './fitOverlayCanvas.ts'

const SCALE_START = 0.14
const SCALE_END = 0.0015
/** Escape-loop ceiling. Shared with the shader so the uniform can never outrun the loop. */
const MAX_ITER = 192
/** Seahorse-valley coastline (measure 0). Zoom rides this filament. */
const AXIS_START = { x: -0.751, y: 0.094 }
const AXIS_END = { x: -0.743643887037151, y: 0.13182590420533 }

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

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / max(uRes.y, 1.0);
    float ca = cos(uAngle);
    float sa = sin(uAngle);
    vec2 ruv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);
    vec2 c = uCenter + ruv * uScale;
    vec2 z = vec2(0.0);
    float i = 0.0;
    const float MAX = ${MAX_ITER}.0;
    for (float n = 0.0; n < MAX; n += 1.0) {
      if (n >= uMaxIter) break;
      if (dot(z, z) > 4.0) break;
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      i = n + 1.0;
    }
    if (i >= uMaxIter) {
      gl_FragColor = vec4(0.0);
      return;
    }
    float mu = i - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
    float g = 0.5 + 0.5 * sin(mu * 0.55);
    vec3 col = mix(uSC1, uSC2, g);
    vec2 p = gl_FragCoord.xy / max(uRes, vec2(1.0));
    float w = clamp(uEdgeFade, 0.0, 0.5);
    float bottom = w < 1e-5 ? 1.0 : smoothstep(0.0, w, p.y);
    float fx = w < 1e-5 ? 1.0 : smoothstep(0.0, w, p.x) * smoothstep(0.0, w, 1.0 - p.x);
    float fy = w < 1e-5 ? 1.0 : bottom * smoothstep(0.0, w, 1.0 - p.y);
    float rim = mix(fx * fy, bottom, uBottomOnly);
    gl_FragColor = vec4(col * rim, rim);
  }
`

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

function paint(canvas: HTMLCanvasElement, state: GLState, z: number): void {
  if (fractalWindowFade(z) <= 0.001) return
  fitOverlayCanvas(canvas, 1.75, 1920)
  const { start, end } = fractalWindow()
  const t = Math.min(1, Math.max(0, (z - start) / (end - start)))
  const eased = t * t * (3 - 2 * t)
  const zoomT = Math.min(1, eased * Math.max(0, FRACTAL_ZOOM_SPEED))
  const depth = Math.max(0, FRACTAL_SEED) + zoomT
  const axisT = Math.min(1, depth)
  const logS = Math.log(SCALE_START) + (Math.log(SCALE_END) - Math.log(SCALE_START)) * depth
  // Linear in t, not eased: easing would park the hue at both ends of the window.
  const hues = paletteHues(start + t * FRACTAL_HUE_SPAN)
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
    AXIS_START.x + (AXIS_END.x - AXIS_START.x) * axisT,
    AXIS_START.y + (AXIS_END.y - AXIS_START.y) * axisT,
  )
  gl.uniform1f(loc.scale, Math.exp(logS))
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
  const glRef = useRef<GLState | null>(null)
  const zRef = useRef(z)
  zRef.current = z
  const fade = fractalWindowFade(z)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = createGL(canvas)
    glRef.current = state
    const redraw = () => {
      if (!state) return
      paint(canvas, state, zRef.current)
    }
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    const mq = window.matchMedia('(max-width: 768px)')
    mq.addEventListener('change', redraw)
    redraw()
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', redraw)
      if (state) {
        state.gl.deleteBuffer(state.vbo)
        state.gl.deleteProgram(state.program)
      }
      glRef.current = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const state = glRef.current
    if (!canvas || !state) return
    paint(canvas, state, z)
  }, [z])

  return (
    <canvas
      aria-hidden
      className="stage__fractal"
      ref={canvasRef}
      style={{ opacity: fade * FRACTAL_ALPHA }}
    />
  )
}

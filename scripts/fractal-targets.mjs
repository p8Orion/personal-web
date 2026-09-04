// Scores Mandelbrot zoom targets the way MandelbrotField actually renders them,
// then searches for better ones. Run: node scripts/fractal-targets.mjs

const SCALE_START = 0.14
const SCALE_END = 0.0015
const MAX_ITER = 256
const DEPTHS = [0.3, 0.6, 1.0, 1.3, 1.65]
const GRID = 72
const ASPECT = 16 / 9

const scaleAt = (depth) =>
  Math.exp(Math.log(SCALE_START) + (Math.log(SCALE_END) - Math.log(SCALE_START)) * depth)
const iterAt = (depth) => Math.min(MAX_ITER, 72 + Math.min(depth, 1.6) * 110)

/** Mirrors the shader: returns -1 inside the set, else the smooth escape value. */
function escape(cx, cy, maxIter) {
  let zx = 0
  let zy = 0
  let i = 0
  while (i < maxIter) {
    if (zx * zx + zy * zy > 4) break
    const nx = zx * zx - zy * zy + cx
    zy = 2 * zx * zy + cy
    zx = nx
    i += 1
  }
  if (i >= maxIter) return -1
  const m = Math.max(zx * zx + zy * zy, 1.0001)
  return i - Math.log2(Math.log2(m)) + 4
}

/** Fraction of the frame inside the set, plus how often the banding flips. */
function frameStats(cx, cy, scale, maxIter) {
  const rows = []
  let inside = 0
  for (let y = 0; y < GRID; y += 1) {
    const row = []
    for (let x = 0; x < GRID; x += 1) {
      const u = ((x + 0.5) / GRID - 0.5) * ASPECT
      const v = (y + 0.5) / GRID - 0.5
      const mu = escape(cx + u * scale, cy + v * scale, maxIter)
      if (mu < 0) inside += 1
      row.push(mu < 0 ? null : 0.5 + 0.5 * Math.sin(mu * 0.55))
    }
    rows.push(row)
  }
  let flips = 0
  for (const row of rows) {
    for (let x = 1; x < GRID; x += 1) {
      const a = row[x - 1]
      const b = row[x]
      // An interior/exterior edge is structure, and so is a colour band flip.
      if ((a === null) !== (b === null)) flips += 1
      else if (a !== null && b !== null && (a - 0.5) * (b - 0.5) < 0) flips += 1
    }
  }
  return { inside: inside / (GRID * GRID), detail: flips / (GRID * (GRID - 1)) }
}

/**
 * A target is only good if it holds up at every depth. Score on the worst
 * frame, not the average, so one great opening cannot carry a dead deep zoom.
 */
function score(cx, cy) {
  let worst = Infinity
  const frames = []
  for (const depth of DEPTHS) {
    const s = frameStats(cx, cy, scaleAt(depth), iterAt(depth))
    // Want structure, and want it against a real silhouette: all-interior or
    // all-exterior frames read as "nothing on screen".
    const balance = 1 - Math.abs(s.inside - 0.35) / 0.65
    const value = s.detail * Math.max(0, balance)
    frames.push(s)
    if (value < worst) worst = value
  }
  return { worst, frames }
}

const CURRENT = [
  ['Seahorse valley', -0.743643887037151, 0.13182590420533],
  ['Elephant valley', 0.2549870375144766, 0.0005679790528465],
  ['Triple spiral', -0.088, 0.654],
  ['Scepter valley', -1.36022, 0.00542],
  ['Julia island', -1.768778833, 0.001738996],
  ['North filament', -0.10109636384562, 0.95628651080914],
  ['Deep spiral', 0.360240443437614, -0.641313061064803],
  ['Antenna knot', -0.16070135, 1.0375665],
]

console.log('scale by depth:', DEPTHS.map((d) => scaleAt(d).toExponential(2)).join('  '))
console.log('\n== current targets ==')
for (const [name, x, y] of CURRENT) {
  const { worst, frames } = score(x, y)
  const detail = frames.map((f) => f.detail.toFixed(2)).join(' ')
  const inside = frames.map((f) => f.inside.toFixed(2)).join(' ')
  console.log(
    `${name.padEnd(16)} worst=${worst.toFixed(3)}  detail[${detail}]  inside[${inside}]`,
  )
}

/** Bisect between an inside and an outside point to land exactly on the edge. */
function boundaryPoint(rng) {
  const probe = () => [rng() * 3 - 2.2, rng() * 2.4 - 1.2]
  let inside = null
  let outside = null
  for (let n = 0; n < 400 && (!inside || !outside); n += 1) {
    const p = probe()
    if (escape(p[0], p[1], 2000) < 0) inside = p
    else outside = p
  }
  if (!inside || !outside) return null
  for (let n = 0; n < 80; n += 1) {
    const mid = [(inside[0] + outside[0]) / 2, (inside[1] + outside[1]) / 2]
    if (escape(mid[0], mid[1], 2000) < 0) inside = mid
    else outside = mid
  }
  return inside
}

let seed = 12345
const rng = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

/** Walk uphill on the score, shrinking the radius as it stops improving. */
function refine(x, y, best) {
  let bx = x
  let by = y
  let bs = best
  let radius = 0.02
  for (let pass = 0; pass < 9; pass += 1) {
    let moved = false
    for (let n = 0; n < 24; n += 1) {
      const a = rng() * Math.PI * 2
      const r = radius * (0.3 + rng() * 0.7)
      const nx = bx + Math.cos(a) * r
      const ny = by + Math.sin(a) * r
      const s = score(nx, ny).worst
      if (s > bs) {
        bx = nx
        by = ny
        bs = s
        moved = true
      }
    }
    if (!moved) radius *= 0.45
  }
  return { x: bx, y: by, worst: bs }
}

console.log('\n== search ==')
const found = []
for (let n = 0; n < 700; n += 1) {
  const p = boundaryPoint(rng)
  if (!p) continue
  found.push({ x: p[0], y: p[1], worst: score(p[0], p[1]).worst })
}
found.sort((a, b) => b.worst - a.worst)

const refined = found.slice(0, 26).map((f) => refine(f.x, f.y, f.worst))
refined.sort((a, b) => b.worst - a.worst)

// Spread them out, or every pick lands in the same valley.
const picked = []
for (const f of refined) {
  if (picked.some((p) => Math.hypot(p.x - f.x, p.y - f.y) < 0.12)) continue
  picked.push(f)
  if (picked.length === 10) break
}
for (const f of picked) {
  const { frames } = score(f.x, f.y)
  const inside = frames.map((s) => s.inside.toFixed(2)).join(' ')
  console.log(
    `worst=${f.worst.toFixed(3)} inside[${inside}]  [${f.x.toFixed(15)}, ${f.y.toFixed(15)}]`,
  )
}

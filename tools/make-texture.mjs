// Generates the tileable greyscale maps the faceplate paints with.
// Run with: node tools/make-texture.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Writes an 8-bit greyscale PNG from a Float64Array of 0..255 samples. */
function writeGray(path, w, h, buf) {
  const raw = Buffer.alloc((w + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0
    for (let x = 0; x < w; x++) {
      raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(buf[y * w + x])))
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 0
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

let seed = 0x2f6e2b1
function rnd() {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return ((seed >>> 0) % 1000000) / 1000000
}

const TAU = Math.PI * 2
const smooth = (t) => t * t * (3 - 2 * t)

/** Periodic value-noise lattice; wraps exactly at `gw` x `gh` cells so the tile seams. */
function lattice(gw, gh) {
  const g = new Float64Array(gw * gh)
  for (let i = 0; i < g.length; i++) g[i] = rnd() * 2 - 1
  return (u, v) => {
    const fx = u * gw
    const fy = v * gh
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = smooth(fx - x0)
    const ty = smooth(fy - y0)
    const xa = ((x0 % gw) + gw) % gw
    const ya = ((y0 % gh) + gh) % gh
    const xb = (xa + 1) % gw
    const yb = (ya + 1) % gh
    const a = g[ya * gw + xa] * (1 - tx) + g[ya * gw + xb] * tx
    const b = g[yb * gw + xa] * (1 - tx) + g[yb * gw + xb] * tx
    return a * (1 - ty) + b * ty
  }
}

/** Sum of octaves of periodic value noise, normalised to roughly -1..1. */
function fbm(baseW, baseH, octaves, gain = 0.5) {
  const layers = []
  let amp = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    layers.push({ n: lattice(baseW << o, baseH << o), amp })
    total += amp
    amp *= gain
  }
  return (u, v) => {
    let s = 0
    for (const l of layers) s += l.amp * l.n(u, v)
    return s / total
  }
}

// ————————————————————————— brushed metal —————————————————————————
// Abrasive finishes are not ruled patterns: they are tens of thousands of short
// overlapping scratches of varying length, depth and slope. Accumulating actual
// strokes gives the broken, criss-crossed grain a harmonic sum can never reach.
{
  const W = 1024
  const H = 1024
  const out = new Float64Array(W * H)

  // Only high-frequency structure belongs here; broad clouding is the wear map's
  // job, and duplicating it makes the tile repeat obvious at panel scale.
  const grime = fbm(10, 10, 3, 0.55)
  const pressure = fbm(7, 9, 3, 0.5) // where the belt bore down hardest

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) out[y * W + x] = 128 + grime(x / W, y / H) * 4
  }

  /** Lays one near-horizontal abrasion, wrapping in both axes. */
  function stroke(x0, y0, len, slope, amp, thick) {
    const span = Math.max(1, Math.ceil(thick * 2.2))
    for (let t = 0; t < len; t++) {
      const fade = Math.max(0, Math.sin((Math.PI * (t + 0.5)) / len)) ** 0.55
      const x = (((Math.round(x0 + t) % W) + W) % W)
      const yc = y0 + t * slope
      const yr = Math.round(yc)
      for (let dy = -span; dy <= span; dy++) {
        const w = Math.exp(-(((yr + dy - yc) / thick) ** 2))
        if (w < 0.03) continue
        const y = (((yr + dy) % H) + H) % H
        out[y * W + x] += amp * fade * w
      }
    }
  }

  // Dense near-horizontal belt scratches — keep slope tiny so the grain reads
  // as directional brushing, not mottled noise.
  for (let k = 0; k < 90000; k++) {
    const x0 = rnd() * W
    const y0 = rnd() * H
    const p = 0.55 + pressure(x0 / W, y0 / H) * 0.7
    const len = 18 + rnd() * rnd() * 220
    stroke(x0, y0, len, (rnd() - 0.5) * 0.028, (rnd() - 0.48) * 18 * p, 0.28 + rnd() * 0.28)
  }

  // Longer, deeper scores that lock the horizontal direction
  for (let k = 0; k < 2800; k++) {
    const x0 = rnd() * W
    const y0 = rnd() * H
    const len = 120 + rnd() * 520
    stroke(x0, y0, len, (rnd() - 0.5) * 0.04, (rnd() - 0.46) * 16, 0.32 + rnd() * 0.45)
  }

  /** Arc of an orbital scratch, wrapping in both axes. */
  function arc(cx, cy, r, a0, span, amp, thick) {
    const steps = Math.max(3, Math.ceil(Math.abs(span) * r))
    const spanPx = Math.max(1, Math.ceil(thick * 2.2))
    for (let i = 0; i < steps; i++) {
      const a = a0 + (span * i) / steps
      const fade = Math.max(0, Math.sin((Math.PI * (i + 0.5)) / steps)) ** 0.5
      const px = cx + Math.cos(a) * r
      const py = cy + Math.sin(a) * r
      const xi = (((Math.round(px) % W) + W) % W)
      const yr = Math.round(py)
      for (let dy = -spanPx; dy <= spanPx; dy++) {
        const w = Math.exp(-(((yr + dy - py) / thick) ** 2))
        if (w < 0.05) continue
        const yi = (((yr + dy) % H) + H) % H
        out[yi * W + xi] += amp * fade * w
      }
    }
  }

  // Sparse orbital marks only — too many read as cloudy mottling instead of brush
  for (let k = 0; k < 3500; k++) {
    const cx = rnd() * W
    const cy = rnd() * H
    const r = 3 + rnd() * rnd() * 28
    arc(cx, cy, r, rnd() * TAU, (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 1.2), (rnd() - 0.5) * 6, 0.3 + rnd() * 0.28)
  }

  // a handful of stray gouges from handling rather than manufacture
  for (let k = 0; k < 8; k++) {
    const x0 = rnd() * W
    const y0 = rnd() * H
    const len = 50 + rnd() * 330
    stroke(x0, y0, len, (rnd() - 0.5) * 0.35, (rnd() < 0.5 ? 1 : -1) * (4 + rnd() * 7), 0.4 + rnd() * 0.45)
  }

  // pitting and grit specks clumped by the grime field rather than spread evenly
  for (let k = 0; k < 2400; k++) {
    const x = Math.floor(rnd() * W)
    const y = Math.floor(rnd() * H)
    if (grime(x / W, y / H) < rnd() * 0.7 - 0.15) continue
    const amp = (rnd() < 0.72 ? -1 : 1) * (3 + rnd() * 11)
    const r = rnd() < 0.88 ? 0 : 1
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const xi = (((x + dx) % W) + W) % W
        const yi = (((y + dy) % H) + H) % H
        out[yi * W + xi] += amp * (dx || dy ? 0.3 : 1)
      }
    }
  }

  // Re-centre: stacking thousands of strokes drifts the mean and overshoots
  // contrast, and the map has to sit at neutral grey to blend as a soft light.
  let sum = 0
  for (const v of out) sum += v
  const mean = sum / out.length
  let varr = 0
  for (const v of out) varr += (v - mean) ** 2
  // Subtle amplitude — reference metal is satin, not scored
  const scale = 4.5 / Math.sqrt(varr / out.length)
  for (let i = 0; i < out.length; i++) out[i] = 128 + (out[i] - mean) * scale + (rnd() - 0.5) * 1

  writeGray('public/brushed-metal.png', W, H, out)
}

// ————————————————————————— panel wear —————————————————————————
// Very low frequency: clouding, hand-grime trails and burnished patches. Painted
// over the whole faceplate at a size larger than the panel so no repeat is visible.
{
  const W = 512
  const H = 512
  const out = new Float64Array(W * H)

  const cloud = fbm(2, 2, 5, 0.6)
  const warpU = fbm(2, 2, 3)
  const warpV = fbm(2, 2, 3)
  const fineDirt = fbm(6, 6, 4, 0.55)

  for (let y = 0; y < H; y++) {
    const v = y / H
    for (let x = 0; x < W; x++) {
      const u = x / W
      // domain warp turns round blobs into drifting, streaky stains
      const du = u + warpU(u, v) * 0.16
      const dv = v + warpV(u * 1.3, v * 0.7) * 0.06
      const c = cloud(du, dv)
      // bias dark so the map mostly darkens, with occasional polished bright patches
      const stain = c > 0 ? c * 0.45 : c * 0.9
      out[y * W + x] = 128 + stain * 28 + fineDirt(u, v) * 8 + (rnd() - 0.5) * 2
    }
  }

  // soft grime blooms — irregular, clustered, a few strong
  for (let k = 0; k < 34; k++) {
    const cx = rnd() * W
    const cy = rnd() * H
    const rx = 18 + rnd() * 110
    const ry = rx * (0.28 + rnd() * 1.5)
    const amp = -(6 + rnd() * 30)
    const rot = rnd() * Math.PI
    const cs = Math.cos(rot)
    const sn = Math.sin(rot)
    const span = Math.ceil(Math.max(rx, ry) * 1.6)
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        const px = (dx * cs + dy * sn) / rx
        const py = (-dx * sn + dy * cs) / ry
        const d = px * px + py * py
        if (d > 1) continue
        const w = (1 - d) ** 2
        const xi = (((Math.round(cx + dx) % W) + W) % W)
        const yi = (((Math.round(cy + dy) % H) + H) % H)
        out[yi * W + xi] += amp * w
      }
    }
  }

  writeGray('public/panel-wear.png', W, H, out)
}

// ————————————————————————— cabinet wood —————————————————————————
{
  const W = 256
  const H = 512
  const out = new Float64Array(W * H)
  const rings = []
  for (let k = 0; k < 18; k++) rings.push({ f: 2 + Math.floor(rnd() * 30), p: rnd() * TAU, a: 1 + rnd() * 6 })
  const drift = []
  for (let k = 0; k < 3; k++) drift.push({ f: 1 + k, p: rnd() * TAU, a: 6 / (k + 1) })
  const blotch = fbm(2, 3, 4, 0.6)

  for (let y = 0; y < H; y++) {
    let wob = 0
    for (const d of drift) wob += d.a * Math.sin((TAU * d.f * y) / H + d.p)
    for (let x = 0; x < W; x++) {
      let v = 0
      for (const r of rings) v += r.a * Math.sin((TAU * r.f * (x + wob)) / W + r.p)
      out[y * W + x] = 128 + v * 1.7 + blotch(x / W, y / H) * 18 + (rnd() - 0.5) * 6
    }
  }
  writeGray('public/wood-grain.png', W, H, out)
}

console.log('wrote public/brushed-metal.png, public/panel-wear.png and public/wood-grain.png')

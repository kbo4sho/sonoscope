// Generates the tileable brushed-metal and wood-grain textures used by the faceplate.
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

/** @param {number} w @param {number} h @param {(x:number,y:number)=>number} sample */
function writeGray(path, w, h, sample) {
  const raw = Buffer.alloc((w + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0
    for (let x = 0; x < w; x++) {
      raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(sample(x, y))))
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
  return ((seed >>> 0) % 100000) / 100000
}

const TAU = Math.PI * 2

// ---- brushed metal: dense vertical striations, faint slow banding across the width ----
{
  const W = 512
  const H = 512
  // Per-column striation amplitude, built from periodic harmonics so the tile seams cleanly.
  const fine = []
  for (let k = 0; k < 26; k++) {
    fine.push({ f: 12 + Math.floor(rnd() * 120), p: rnd() * TAU, a: 0.9 + rnd() * 2.2 })
  }
  const broad = []
  for (let k = 0; k < 5; k++) {
    broad.push({ f: 1 + k, p: rnd() * TAU, a: 1.6 / (k + 1) })
  }
  // Slow variation along the streak so brushing does not look extruded.
  const along = []
  for (let k = 0; k < 4; k++) {
    along.push({ f: 1 + Math.floor(rnd() * 3), p: rnd() * TAU, a: 0.7 / (k + 1) })
  }

  const col = new Float64Array(W)
  const colPhase = new Float64Array(W)
  for (let x = 0; x < W; x++) {
    let v = 0
    for (const h of fine) v += h.a * Math.sin((TAU * h.f * x) / W + h.p)
    let b = 0
    for (const h of broad) b += h.a * Math.sin((TAU * h.f * x) / W + h.p)
    col[x] = v
    colPhase[x] = b
  }

  writeGray('public/brushed-metal.png', W, H, (x, y) => {
    let mod = 0
    for (const h of along) mod += h.a * Math.sin((TAU * h.f * y) / H + h.p + colPhase[x] * 0.9)
    const grain = (rnd() - 0.5) * 4
    return 128 + col[x] * (1.05 + 0.45 * mod) + colPhase[x] * 1.2 + grain
  })
}

// ---- cabinet wood: vertical grain with occasional darker fibres ----
{
  const W = 256
  const H = 512
  const rings = []
  for (let k = 0; k < 16; k++) rings.push({ f: 2 + Math.floor(rnd() * 26), p: rnd() * TAU, a: 1 + rnd() * 5 })
  const drift = []
  for (let k = 0; k < 3; k++) drift.push({ f: 1 + k, p: rnd() * TAU, a: 5 / (k + 1) })

  writeGray('public/wood-grain.png', W, H, (x, y) => {
    let wob = 0
    for (const d of drift) wob += d.a * Math.sin((TAU * d.f * y) / H + d.p)
    let v = 0
    for (const r of rings) v += r.a * Math.sin((TAU * r.f * (x + wob)) / W + r.p)
    return 128 + v * 1.5 + (rnd() - 0.5) * 5
  })
}

console.log('wrote public/brushed-metal.png and public/wood-grain.png')

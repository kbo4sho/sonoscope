// Extract a fine repeating faceplate tile from the gauntlet bar reference.
import sharp from 'sharp'

const src = 'gauntlet/bar-reference.jpg'

const band = await sharp(src)
  .extract({ left: 40, top: 420, width: 1210, height: 64 })
  .resize(2048, 128, { kernel: sharp.kernel.lanczos3 })
  .toBuffer()

const layers = []
for (let i = 0; i < 8; i++) {
  const shifted = await sharp(band)
    .extract({ left: (i * 37) % 100, top: 0, width: 1948, height: 128 })
    .resize(1024, 128, { fit: 'fill' })
    .modulate({ brightness: 1 + (i % 2 === 0 ? 0.01 : -0.01) })
    .toBuffer()
  layers.push({ input: shifted, top: i * 128, left: 0 })
}

await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: { r: 190, g: 182, b: 160 } },
})
  .composite(layers)
  .blur(0.6)
  .sharpen({ sigma: 0.8, m1: 0.8, m2: 0.4 })
  .png()
  .toFile('public/bar-metal-tile.png')

// High-pass greyscale brush from a quiet metal patch (avoid logo/buttons).
const metal = await sharp(src)
  .extract({ left: 380, top: 48, width: 320, height: 90 })
  .greyscale()
  .resize(512, 512, { fit: 'fill' })
  .normalize()
  .toBuffer()
const blurred = await sharp(metal).blur(3).toBuffer()
const a = await sharp(metal).raw().toBuffer()
const b = await sharp(blurred).raw().toBuffer()
const out = Buffer.alloc(a.length)
for (let i = 0; i < a.length; i++) out[i] = Math.max(0, Math.min(255, 128 + (a[i] - b[i]) * 1.6))
await sharp(out, { raw: { width: 512, height: 512, channels: 1 } })
  .png()
  .toFile('public/brushed-metal.png')

console.log('wrote public/bar-metal-tile.png and public/brushed-metal.png')

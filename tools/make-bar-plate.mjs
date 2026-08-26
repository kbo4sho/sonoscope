// Extract a repeating faceplate tile from the gauntlet bar reference's metal bands.
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const src = 'gauntlet/bar-reference.jpg'
const strips = []
for (let i = 0; i < 16; i++) {
  strips.push(
    await sharp(src)
      .extract({ left: 20, top: 420, width: 1250, height: 64 })
      .resize(1024, 64, { fit: 'fill' })
      .toBuffer(),
  )
}
await sharp({
  create: { width: 1024, height: 1024, channels: 3, background: { r: 180, g: 170, b: 160 } },
})
  .composite(strips.map((input, i) => ({ input, top: i * 64, left: 0 })))
  .png()
  .toFile('public/bar-metal-tile.png')
console.log('wrote public/bar-metal-tile.png')

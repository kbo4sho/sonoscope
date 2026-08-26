// Headless capture of the live app for gauntlet A/B rounds.
// Usage: node tools/shot.mjs <out.jpg> [width] [height] [dpr]
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const out = process.argv[2] || 'gauntlet/rounds/live.jpg'
const w = Number(process.argv[3] || 430)
const h = Number(process.argv[4] || 761)
const dpr = Number(process.argv[5] || 3)
const url = process.env.SHOT_URL || 'http://127.0.0.1:4173/sonoscope/?demo=1'

const profile = mkdtempSync(join(tmpdir(), 'shot-'))
const png = join(profile, 'shot.png')

const child = spawn(
  'google-chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`,
    `--force-device-scale-factor=${dpr}`,
    '--timeout=12000',
    `--screenshot=${png}`,
    url,
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let size = 0
for (let i = 0; i < 120; i++) {
  await sleep(500)
  if (!existsSync(png)) continue
  const s = statSync(png).size
  if (s > 0 && s === size) break
  size = s
}
child.kill('SIGKILL')
if (!size) throw new Error('screenshot never appeared')

await sharp(png).jpeg({ quality: 92 }).toFile(out)
rmSync(profile, { recursive: true, force: true })
console.log('wrote', out)

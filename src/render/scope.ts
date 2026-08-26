import { DB_MAX, DB_MIN, F_MAX, F_MIN, type Band } from '../audio/spectrum.ts'

const SCREEN = '#191918'
const SCREEN_LIT = '#1f1f1e'
const PLOT_TOP = '#33332f'
const PLOT_BOTTOM = '#2a2a27'
const GRID = 'rgba(214, 211, 200, 0.14)'
const GRID_MAJOR = 'rgba(214, 211, 200, 0.23)'
const AXIS = 'rgba(220, 216, 202, 0.4)'
const LABEL = 'rgba(208, 203, 188, 0.88)'
const LABEL_DIM = 'rgba(208, 203, 188, 0.6)'
const BAR_TOP = '#d6cfba'
const BAR_BOTTOM = '#b6af9b'
const ORANGE = '#ff9a14'
const WHITE = 'rgba(238, 233, 218, 0.8)'

const TICKS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 20000]
const MAJOR = new Set([20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000])

function freqX(freq: number, x: number, w: number): number {
  const t = (Math.log(clamp(freq, F_MIN, F_MAX)) - Math.log(F_MIN)) / (Math.log(F_MAX) - Math.log(F_MIN))
  return x + t * w
}

function dbY(db: number, y: number, h: number, dbMin: number, dbMax: number): number {
  const t = (clamp(db, dbMin, dbMax) - dbMin) / (dbMax - dbMin)
  return y + h - t * h
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function labelHz(hz: number): string {
  if (hz >= 1000) return `${hz / 1000}k`
  return String(hz)
}

/** Static tube grain, built once and tiled. */
function grainTile(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 96
  const tile = document.createElement('canvas')
  tile.width = size
  tile.height = size
  const tctx = tile.getContext('2d')
  if (!tctx) return null
  const img = tctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 70
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  tctx.putImageData(img, 0, 0)
  return ctx.createPattern(tile, 'repeat')
}

export class Scope {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 0
  private glass: CanvasGradient | null = null
  private plot: CanvasGradient | null = null
  private grain: CanvasPattern | null = null

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    this.canvas = canvas
    this.ctx = ctx
    this.grain = grainTile(ctx)
  }

  resize(): { plotWidth: number } {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(200, Math.floor(rect.height))
    if (w !== this.width || h !== this.height || dpr !== this.dpr) {
      this.width = w
      this.height = h
      this.dpr = dpr
      this.canvas.width = Math.floor(w * dpr)
      this.canvas.height = Math.floor(h * dpr)
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.glass = null
      this.plot = null
    }
    return { plotWidth: w - 54 - 18 }
  }

  draw(opts: {
    bands: Band[]
    hold: number[]
    peakHz: number
    peakDb: number
    centroidHz: number
    dbMin?: number
    dbMax?: number
    live: boolean
  }): void {
    const w = this.width
    const h = this.height
    const left = 50
    const right = 16
    const top = 14
    const bottom = 40
    const plotW = w - left - right
    const plotH = h - top - bottom
    const dbMin = opts.dbMin ?? DB_MIN
    const dbMax = opts.dbMax ?? DB_MAX

    this.screen(w, h)
    this.grid(left, top, plotW, plotH, dbMin, dbMax)
    this.bars(opts.bands, opts.hold, left, top, plotW, plotH, dbMin, dbMax)

    if (opts.live && opts.peakDb > -70) {
      this.marker(opts.peakHz, left, top, plotW, plotH, false)
    }
    if (opts.live && opts.centroidHz > F_MIN) {
      this.marker(opts.centroidHz, left, top, plotW, plotH, true)
    }

    this.axes(left, top, plotW, plotH)
    this.dbLabels(left, top, plotH, dbMin, dbMax)
    this.hzScale(left, top + plotH, plotW)
    this.vignette(w, h)
  }

  /** Phosphor face: near-black warm glass, faintly brighter toward the middle. */
  private screen(w: number, h: number): void {
    const { ctx } = this
    if (!this.glass) {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.72)
      g.addColorStop(0, SCREEN_LIT)
      g.addColorStop(0.6, '#1c1c1b')
      g.addColorStop(1, SCREEN)
      this.glass = g
    }
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = this.glass
    ctx.fillRect(0, 0, w, h)
    if (this.grain) {
      ctx.save()
      ctx.globalAlpha = 0.05
      ctx.fillStyle = this.grain
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  private vignette(w: number, h: number): void {
    const { ctx } = this
    const g = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.34, w * 0.5, h * 0.48, Math.max(w, h) * 0.68)
    g.addColorStop(0, 'rgba(0, 0, 0, 0)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0.24)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  private grid(x: number, y: number, w: number, h: number, dbMin: number, dbMax: number): void {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    // Lift the plot rectangle a shade above the surrounding margin without
    // flattening the tube's centre glow.
    if (!this.plot) {
      const p = ctx.createLinearGradient(0, y, 0, y + h)
      p.addColorStop(0, PLOT_TOP)
      p.addColorStop(1, PLOT_BOTTOM)
      this.plot = p
    }
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = this.plot
    ctx.fillRect(x, y, w, h)
    ctx.restore()
    ctx.lineWidth = 1

    for (let db = 0; db >= dbMin; db -= 10) {
      const gy = Math.round(dbY(db, y, h, dbMin, dbMax)) + 0.5
      ctx.strokeStyle = GRID
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.lineTo(x + w, gy)
      ctx.stroke()
    }

    for (const hz of TICKS) {
      if (hz < F_MIN || hz > F_MAX) continue
      const gx = Math.round(freqX(hz, x, w)) + 0.5
      ctx.strokeStyle = MAJOR.has(hz) ? GRID_MAJOR : GRID
      ctx.beginPath()
      ctx.moveTo(gx, y)
      ctx.lineTo(gx, y + h)
      ctx.stroke()
    }
    ctx.restore()
  }

  private axes(x: number, y: number, w: number, h: number): void {
    const { ctx } = this
    ctx.strokeStyle = AXIS
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, y)
    ctx.lineTo(Math.round(x) + 0.5, Math.round(y + h) + 0.5)
    ctx.lineTo(Math.round(x + w) + 0.5, Math.round(y + h) + 0.5)
    ctx.stroke()
  }

  private bars(
    bands: Band[],
    hold: number[],
    x: number,
    y: number,
    w: number,
    h: number,
    dbMin: number,
    dbMax: number,
  ): void {
    if (!bands.length) return
    const { ctx } = this
    const gap = bands.length > 72 ? 1 : 1.6
    const bw = w / bands.length
    const base = y + h

    const face = ctx.createLinearGradient(0, y, 0, base)
    face.addColorStop(0, BAR_TOP)
    face.addColorStop(1, BAR_BOTTOM)

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i]
      const bx = x + i * bw + gap / 2
      const barW = Math.max(1, bw - gap)
      const by = dbY(band.db, y, h, dbMin, dbMax)
      const barH = base - by

      if (barH > 0.5) {
        ctx.fillStyle = face
        ctx.fillRect(bx, by, barW, barH)
        // lit top edge so the columns read as illuminated segments
        ctx.fillStyle = 'rgba(255, 252, 238, 0.5)'
        ctx.fillRect(bx, by, barW, 1)
      }

      const holdDb = hold[i]
      if (Number.isFinite(holdDb) && holdDb > dbMin + 1) {
        const hy = Math.round(dbY(holdDb, y, h, dbMin, dbMax)) - 2
        ctx.fillStyle = ORANGE
        ctx.fillRect(bx, hy, barW, 2)
      }
    }
    ctx.restore()
  }

  private marker(hz: number, x: number, y: number, w: number, h: number, dashed: boolean): void {
    const { ctx } = this
    const gx = Math.round(freqX(hz, x, w)) + 0.5
    ctx.save()
    ctx.strokeStyle = WHITE
    ctx.lineWidth = 1
    ctx.globalAlpha = dashed ? 0.45 : 0.8
    if (dashed) ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.moveTo(gx, y)
    ctx.lineTo(gx, y + h)
    ctx.stroke()
    ctx.restore()
  }

  private dbLabels(left: number, top: number, h: number, dbMin: number, dbMax: number): void {
    const { ctx } = this
    ctx.fillStyle = LABEL
    ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let db = 0; db >= dbMin; db -= 10) {
      ctx.fillText(`${db}`, left - 9, dbY(db, top, h, dbMin, dbMax))
    }
    ctx.save()
    ctx.translate(13, top + h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = LABEL_DIM
    ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace'
    ctx.fillText('dBFS', 0, 0)
    ctx.restore()
  }

  private hzScale(x: number, y: number, w: number): void {
    const { ctx } = this
    ctx.lineWidth = 1
    ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (const hz of TICKS) {
      if (hz < F_MIN || hz > F_MAX) continue
      const gx = Math.round(freqX(hz, x, w)) + 0.5
      const major = MAJOR.has(hz)
      ctx.beginPath()
      ctx.moveTo(gx, y)
      ctx.lineTo(gx, y + (major ? 7 : 3))
      ctx.strokeStyle = major ? AXIS : 'rgba(214, 208, 186, 0.2)'
      ctx.stroke()
      if (major) {
        ctx.fillStyle = LABEL
        ctx.fillText(labelHz(hz), gx, y + 12)
      }
    }
  }
}

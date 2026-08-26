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

export class Scope {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 0
  private barFace: CanvasGradient | null = null
  private barFaceH = 0
  private staticLayer: HTMLCanvasElement | null = null
  private staticKey = ''

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas unsupported')
    this.canvas = canvas
    this.ctx = ctx
  }

  resize(): { plotWidth: number } {
    // Cap DPR so retina phones don't 3–4× the fill cost every frame
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
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
      this.barFace = null
      this.staticLayer = null
      this.staticKey = ''
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

    this.blitStatic(left, top, plotW, plotH, dbMin, dbMax)
    this.bars(opts.bands, opts.hold, left, top, plotW, plotH, dbMin, dbMax)

    if (opts.live && opts.peakDb > -70) {
      this.marker(opts.peakHz, left, top, plotW, plotH, false)
    }
    if (opts.live && opts.centroidHz > F_MIN) {
      this.marker(opts.centroidHz, left, top, plotW, plotH, true)
    }
  }

  /** Screen, grid, and axes change rarely — paint once to an offscreen buffer. */
  private blitStatic(left: number, top: number, plotW: number, plotH: number, dbMin: number, dbMax: number): void {
    const key = `${this.width}x${this.height}@${this.dpr}:${dbMin}:${dbMax}`
    if (!this.staticLayer || this.staticKey !== key) {
      const layer = document.createElement('canvas')
      layer.width = this.canvas.width
      layer.height = this.canvas.height
      const lctx = layer.getContext('2d', { alpha: false })
      if (!lctx) return
      lctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      paintStatic(lctx, this.width, this.height, left, top, plotW, plotH, dbMin, dbMax)
      this.staticLayer = layer
      this.staticKey = key
    }
    this.ctx.drawImage(this.staticLayer, 0, 0, this.width, this.height)
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

    if (!this.barFace || this.barFaceH !== h) {
      const face = ctx.createLinearGradient(0, y, 0, base)
      face.addColorStop(0, BAR_TOP)
      face.addColorStop(1, BAR_BOTTOM)
      this.barFace = face
      this.barFaceH = h
    }

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
        ctx.fillStyle = this.barFace
        ctx.fillRect(bx, by, barW, barH)
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
}

function paintStatic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  left: number,
  top: number,
  plotW: number,
  plotH: number,
  dbMin: number,
  dbMax: number,
): void {
  const glass = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.72)
  glass.addColorStop(0, SCREEN_LIT)
  glass.addColorStop(0.6, '#1c1c1b')
  glass.addColorStop(1, SCREEN)
  ctx.fillStyle = glass
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, plotW, plotH)
  ctx.clip()
  const plot = ctx.createLinearGradient(0, top, 0, top + plotH)
  plot.addColorStop(0, PLOT_TOP)
  plot.addColorStop(1, PLOT_BOTTOM)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = plot
  ctx.fillRect(left, top, plotW, plotH)
  ctx.globalAlpha = 1
  ctx.lineWidth = 1

  for (let db = 0; db >= dbMin; db -= 10) {
    const gy = Math.round(dbY(db, top, plotH, dbMin, dbMax)) + 0.5
    ctx.strokeStyle = GRID
    ctx.beginPath()
    ctx.moveTo(left, gy)
    ctx.lineTo(left + plotW, gy)
    ctx.stroke()
  }

  for (const hz of TICKS) {
    if (hz < F_MIN || hz > F_MAX) continue
    const gx = Math.round(freqX(hz, left, plotW)) + 0.5
    ctx.strokeStyle = MAJOR.has(hz) ? GRID_MAJOR : GRID
    ctx.beginPath()
    ctx.moveTo(gx, top)
    ctx.lineTo(gx, top + plotH)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = AXIS
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(Math.round(left) + 0.5, top)
  ctx.lineTo(Math.round(left) + 0.5, Math.round(top + plotH) + 0.5)
  ctx.lineTo(Math.round(left + plotW) + 0.5, Math.round(top + plotH) + 0.5)
  ctx.stroke()

  ctx.fillStyle = LABEL
  ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let db = 0; db >= dbMin; db -= 10) {
    ctx.fillText(`${db}`, left - 9, dbY(db, top, plotH, dbMin, dbMax))
  }
  ctx.save()
  ctx.translate(13, top + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillStyle = LABEL_DIM
  ctx.fillText('dBFS', 0, 0)
  ctx.restore()

  const axisY = top + plotH
  ctx.lineWidth = 1
  ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const hz of TICKS) {
    if (hz < F_MIN || hz > F_MAX) continue
    const gx = Math.round(freqX(hz, left, plotW)) + 0.5
    const major = MAJOR.has(hz)
    ctx.beginPath()
    ctx.moveTo(gx, axisY)
    ctx.lineTo(gx, axisY + (major ? 7 : 3))
    ctx.strokeStyle = major ? AXIS : 'rgba(214, 208, 186, 0.2)'
    ctx.stroke()
    if (major) {
      ctx.fillStyle = LABEL
      ctx.fillText(labelHz(hz), gx, axisY + 12)
    }
  }

  const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.34, w * 0.5, h * 0.48, Math.max(w, h) * 0.68)
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.24)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)
}

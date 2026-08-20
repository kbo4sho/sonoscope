import { DB_MAX, DB_MIN, F_MAX, F_MIN, type Band } from '../audio/spectrum.ts'

const PAPER = '#eee8da'
const INK = '#11110f'
const MUTED = '#68645b'
const SOFT = '#bdb5a7'
const ORANGE = '#f05223'
const WHITE = '#f8f4e9'

const TICKS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 20000]

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

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    this.canvas = canvas
    this.ctx = ctx
  }

  resize(): { plotWidth: number } {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const rect = this.canvas.getBoundingClientRect()
    const w = Math.max(320, Math.floor(rect.width))
    const h = Math.max(280, Math.floor(rect.height))
    if (w !== this.width || h !== this.height || dpr !== this.dpr) {
      this.width = w
      this.height = h
      this.dpr = dpr
      this.canvas.width = Math.floor(w * dpr)
      this.canvas.height = Math.floor(h * dpr)
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    return { plotWidth: w - 56 - 16 }
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
    const { ctx } = this
    const w = this.width
    const h = this.height
    const left = 52
    const right = 14
    const top = 16
    const bottom = 42
    const plotW = w - left - right
    const plotH = h - top - bottom
    const dbMin = opts.dbMin ?? DB_MIN
    const dbMax = opts.dbMax ?? DB_MAX

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = WHITE
    ctx.fillRect(0, 0, w, h)

    this.grid(left, top, plotW, plotH, dbMin, dbMax)
    this.bars(opts.bands, opts.hold, opts.peakHz, left, top, plotW, plotH, dbMin, dbMax)

    if (opts.live && opts.peakDb > -70) {
      this.marker(opts.peakHz, left, top, plotW, plotH, ORANGE)
    }
    if (opts.live && opts.centroidHz > F_MIN) {
      this.marker(opts.centroidHz, left, top, plotW, plotH, MUTED, true)
    }

    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.strokeRect(left + 0.5, top + 0.5, plotW, plotH)

    this.dbLabels(left, top, plotH, dbMin, dbMax)
    this.hzScale(left, top + plotH, plotW)
    this.peakPointer(opts.peakHz, opts.live && opts.peakDb > -70, left, top + plotH, plotW)
  }

  private grid(x: number, y: number, w: number, h: number, dbMin: number, dbMax: number): void {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    ctx.fillStyle = PAPER
    ctx.fillRect(x, y, w, h)

    ctx.strokeStyle = 'rgba(17, 17, 15, 0.08)'
    ctx.lineWidth = 1
    for (let db = 0; db >= dbMin; db -= 10) {
      const gy = Math.round(dbY(db, y, h, dbMin, dbMax)) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.lineTo(x + w, gy)
      ctx.stroke()
    }

    for (const hz of TICKS) {
      if (hz < F_MIN || hz > F_MAX) continue
      const gx = Math.round(freqX(hz, x, w)) + 0.5
      const major = /^[125]0*$/.test(String(hz))
      ctx.strokeStyle = major ? 'rgba(17, 17, 15, 0.14)' : 'rgba(17, 17, 15, 0.06)'
      ctx.beginPath()
      ctx.moveTo(gx, y)
      ctx.lineTo(gx, y + h)
      ctx.stroke()
    }
    ctx.restore()
  }

  private bars(
    bands: Band[],
    hold: number[],
    peakHz: number,
    x: number,
    y: number,
    w: number,
    h: number,
    dbMin: number,
    dbMax: number,
  ): void {
    if (!bands.length) return
    const { ctx } = this
    const gap = bands.length > 72 ? 1 : 1.5
    const bw = w / bands.length

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i]
      const bx = x + i * bw + gap / 2
      const barW = Math.max(1, bw - gap)
      const by = dbY(band.db, y, h, dbMin, dbMax)
      const barH = y + h - by
      const isPeak = peakHz >= band.fLo && peakHz < band.fHi
      ctx.fillStyle = isPeak ? ORANGE : INK
      ctx.globalAlpha = isPeak ? 0.92 : 0.78
      if (barH > 0) ctx.fillRect(bx, by, barW, barH)

      const holdDb = hold[i]
      if (Number.isFinite(holdDb) && holdDb > dbMin + 1) {
        const hy = Math.round(dbY(holdDb, y, h, dbMin, dbMax))
        ctx.globalAlpha = 1
        ctx.fillStyle = ORANGE
        ctx.fillRect(bx, hy, barW, 2)
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private marker(hz: number, x: number, y: number, w: number, h: number, color: string, dashed = false): void {
    const { ctx } = this
    const gx = Math.round(freqX(hz, x, w)) + 0.5
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.globalAlpha = dashed ? 0.45 : 0.85
    if (dashed) ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(gx, y)
    ctx.lineTo(gx, y + h)
    ctx.stroke()
    ctx.restore()
  }

  private peakPointer(hz: number, show: boolean, x: number, y: number, w: number): void {
    if (!show) return
    const { ctx } = this
    const gx = freqX(hz, x, w)
    ctx.fillStyle = ORANGE
    ctx.beginPath()
    ctx.moveTo(gx, y + 1)
    ctx.lineTo(gx - 5, y + 9)
    ctx.lineTo(gx + 5, y + 9)
    ctx.closePath()
    ctx.fill()
  }

  private dbLabels(left: number, top: number, h: number, dbMin: number, dbMax: number): void {
    const { ctx } = this
    ctx.fillStyle = MUTED
    ctx.font = '500 9px "Geist Mono", ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let db = 0; db >= dbMin; db -= 10) {
      const gy = dbY(db, top, h, dbMin, dbMax)
      ctx.fillText(`${db}`, left - 8, gy)
    }
    ctx.save()
    ctx.translate(12, top + h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = MUTED
    ctx.fillText('dBFS', 0, 0)
    ctx.restore()
  }

  private hzScale(x: number, y: number, w: number): void {
    const { ctx } = this
    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    ctx.fillStyle = MUTED
    ctx.font = '500 9px "Geist Mono", ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (const hz of TICKS) {
      if (hz < F_MIN || hz > F_MAX) continue
      const gx = Math.round(freqX(hz, x, w)) + 0.5
      const major = hz === 20 || hz === 50 || hz === 100 || hz === 200 || hz === 500 || hz === 1000 || hz === 2000 || hz === 5000 || hz === 10000 || hz === 20000
      ctx.beginPath()
      ctx.moveTo(gx, y)
      ctx.lineTo(gx, y + (major ? 8 : 4))
      ctx.strokeStyle = major ? INK : SOFT
      ctx.stroke()
      if (major) {
        ctx.fillStyle = INK
        ctx.fillText(labelHz(hz), gx, y + 11)
      }
    }
  }
}

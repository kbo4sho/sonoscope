export type Band = {
  fLo: number
  fHi: number
  fCenter: number
  db: number
}

export type Snapshot = {
  bands: Band[]
  peakHz: number
  peakDb: number
  centroidHz: number
  rmsDb: number
  sampleRate: number
  fftSize: number
  binHz: number
  dbMin: number
  dbMax: number
}

export const DB_MIN = -90
export const DB_MAX = 0
export const F_MIN = 20
export const F_MAX = 20_000

export function bandCountForWidth(plotWidth: number): number {
  const approx = Math.floor(plotWidth / 7)
  return Math.max(36, Math.min(96, approx))
}

export function logBands(
  fft: Float32Array,
  sampleRate: number,
  fftSize: number,
  count: number,
): Band[] {
  const nyquist = sampleRate / 2
  const maxF = Math.min(F_MAX, nyquist)
  const binHz = sampleRate / fftSize
  const logMin = Math.log(F_MIN)
  const logMax = Math.log(maxF)
  const bands: Band[] = []

  for (let i = 0; i < count; i++) {
    const fLo = Math.exp(logMin + (i / count) * (logMax - logMin))
    const fHi = Math.exp(logMin + ((i + 1) / count) * (logMax - logMin))
    const i0 = Math.max(1, Math.floor(fLo / binHz))
    const i1 = Math.min(fft.length - 1, Math.ceil(fHi / binHz))
    let power = 0
    let n = 0
    for (let b = i0; b <= i1; b++) {
      const db = fft[b]
      if (!Number.isFinite(db)) continue
      power += 10 ** (db / 10)
      n += 1
    }
    bands.push({
      fLo,
      fHi,
      fCenter: Math.sqrt(fLo * fHi),
      db: n ? 10 * Math.log10(power / n) : Number.NEGATIVE_INFINITY,
    })
  }

  return bands
}

export function peakFrequency(
  fft: Float32Array,
  sampleRate: number,
  fftSize: number,
): { hz: number; db: number } {
  let maxI = 1
  let maxV = Number.NEGATIVE_INFINITY
  const last = Math.min(fft.length - 1, Math.floor((F_MAX * fftSize) / sampleRate))
  for (let i = 1; i <= last; i++) {
    const v = fft[i]
    if (v > maxV) {
      maxV = v
      maxI = i
    }
  }

  const a = fft[maxI - 1] ?? maxV
  const b = maxV
  const c = fft[maxI + 1] ?? maxV
  const denom = a - 2 * b + c
  const delta = denom === 0 ? 0 : (0.5 * (a - c)) / denom
  const bin = maxI + delta
  return {
    hz: (bin * sampleRate) / fftSize,
    db: maxV,
  }
}

export function spectralCentroid(
  fft: Float32Array,
  sampleRate: number,
  fftSize: number,
): number {
  let num = 0
  let den = 0
  const last = Math.min(fft.length - 1, Math.floor((F_MAX * fftSize) / sampleRate))
  for (let i = 1; i <= last; i++) {
    const mag = 10 ** (fft[i] / 20)
    if (!Number.isFinite(mag) || mag <= 0) continue
    num += ((i * sampleRate) / fftSize) * mag
    den += mag
  }
  return den > 0 ? num / den : 0
}

export function rmsDb(time: Float32Array): number {
  let sum = 0
  for (let i = 0; i < time.length; i++) {
    const s = time[i]
    sum += s * s
  }
  const rms = Math.sqrt(sum / Math.max(1, time.length))
  return 20 * Math.log10(rms + 1e-12)
}

export class PeakHold {
  values: number[] = []
  enabled = true
  decayDb = 0.28

  update(bands: Band[]): number[] {
    if (this.values.length !== bands.length) {
      this.values = bands.map((b) => b.db)
      return this.values
    }
    for (let i = 0; i < bands.length; i++) {
      const current = bands[i].db
      if (!this.enabled) {
        this.values[i] = current
        continue
      }
      this.values[i] =
        current > this.values[i] ? current : this.values[i] - this.decayDb
    }
    return this.values
  }
}

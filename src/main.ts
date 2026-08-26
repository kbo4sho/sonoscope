import './style.css'
import { AudioEngine, type SourceKind } from './audio/engine.ts'
import { formatDb, formatDeltaF, formatHz, freqToPitch } from './audio/notes.ts'
import {
  F_MAX,
  F_MIN,
  PeakHold,
  bandCountForWidth,
  logBands,
  peakFrequency,
  rmsDb,
  spectralCentroid,
  type Band,
} from './audio/spectrum.ts'
import { Scope } from './render/scope.ts'

const engine = new AudioEngine()
const hold = new PeakHold()
const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const scope = new Scope(canvas)

const ui = {
  mic: document.querySelector<HTMLButtonElement>('#btn-mic')!,
  tab: document.querySelector<HTMLButtonElement>('#btn-tab')!,
  file: document.querySelector<HTMLButtonElement>('#btn-file')!,
  tone: document.querySelector<HTMLButtonElement>('#btn-tone')!,
  stop: document.querySelector<HTMLButtonElement>('#btn-stop')!,
  fileInput: document.querySelector<HTMLInputElement>('#file-input')!,
  fft: document.querySelector<HTMLSelectElement>('#fft-size')!,
  smoothing: document.querySelector<HTMLInputElement>('#smoothing')!,
  smoothingVal: document.querySelector('#smoothing-val')!,
  gain: document.querySelector<HTMLInputElement>('#gain')!,
  gainVal: document.querySelector('#gain-val')!,
  peakHold: document.querySelector<HTMLButtonElement>('#peak-hold')!,
  notice: document.querySelector<HTMLParagraphElement>('#notice')!,
  live: document.querySelector('#live-state')!,
  statusInput: document.querySelector('#status-input')!,
  statusRate: document.querySelector('#status-rate')!,
  statusFft: document.querySelector('#status-fft')!,
  statusDf: document.querySelector('#status-df')!,
  peak: document.querySelector('#readout-peak')!,
  peakDb: document.querySelector('#readout-peak-db')!,
  note: document.querySelector('#readout-note')!,
  cents: document.querySelector('#readout-cents')!,
  centroid: document.querySelector('#readout-centroid')!,
  rms: document.querySelector('#readout-rms')!,
  metricArticles: document.querySelectorAll<HTMLElement>('.metric-grid article'),
}

const LABELS: Record<SourceKind, string> = {
  idle: 'Standby',
  mic: 'Mic open — play audio nearby or into the room.',
  tab: 'Share a tab with audio. Video is discarded.',
  file: 'Playing recording',
  tone: 'Reference sine · A4 / 440 Hz',
}

const SOURCE_BTNS: { kind: SourceKind; el: HTMLButtonElement }[] = [
  { kind: 'mic', el: ui.mic },
  { kind: 'tab', el: ui.tab },
  { kind: 'file', el: ui.file },
  { kind: 'tone', el: ui.tone },
]

function showNotice(message: string | null): void {
  if (!message) {
    ui.notice.hidden = true
    ui.notice.textContent = ''
    return
  }
  ui.notice.hidden = false
  ui.notice.textContent = message
}

function setLive(kind: SourceKind): void {
  ui.live.classList.toggle('live', kind !== 'idle')
  ui.statusInput.textContent = LABELS[kind]
  ui.stop.disabled = kind === 'idle'
  for (const { kind: k, el } of SOURCE_BTNS) {
    el.classList.toggle('is-active', kind === k)
  }
  if (kind === 'idle') hold.values = []
}

async function run(start: () => Promise<void>, hint?: string): Promise<void> {
  showNotice(null)
  try {
    await start()
    setLive(engine.kind)
    if (hint) showNotice(hint)
  } catch (error) {
    engine.stop()
    setLive('idle')
    const message = error instanceof Error ? error.message : 'Could not open that input.'
    showNotice(message)
  }
}

ui.mic.addEventListener('click', () => {
  void run(() => engine.startMic())
})

ui.tab.addEventListener('click', () => {
  void run(() => engine.startTab())
})

ui.file.addEventListener('click', () => ui.fileInput.click())
ui.fileInput.addEventListener('change', () => {
  const file = ui.fileInput.files?.[0]
  if (!file) return
  void run(() => engine.startFile(file))
  ui.fileInput.value = ''
})

ui.tone.addEventListener('click', () => {
  void run(() => engine.startTone(440))
})

ui.stop.addEventListener('click', () => {
  engine.stop()
  setLive('idle')
  showNotice(null)
})

ui.fft.addEventListener('change', () => {
  engine.setFftSize(Number(ui.fft.value))
})

ui.smoothing.addEventListener('input', () => {
  const value = Number(ui.smoothing.value)
  ui.smoothingVal.textContent = value.toFixed(2)
  engine.setSmoothing(value)
})

// The travel is logarithmic so unity gain lands where a real trim pot would sit.
const GAIN_MIN = 0.25
const GAIN_MAX = 8

function gainFromSlider(t: number): number {
  return GAIN_MIN * Math.pow(GAIN_MAX / GAIN_MIN, t)
}

ui.gain.addEventListener('input', () => {
  const value = gainFromSlider(Number(ui.gain.value))
  ui.gainVal.textContent = value.toFixed(2)
  engine.setGain(value)
})

ui.peakHold.addEventListener('click', () => {
  hold.enabled = !hold.enabled
  ui.peakHold.classList.toggle('is-on', hold.enabled)
  ui.peakHold.setAttribute('aria-pressed', hold.enabled ? 'true' : 'false')
})

const demoMode = new URLSearchParams(location.search).has('demo')

function demoBands(count: number, t: number): { bands: Band[]; hold: number[] } {
  const bands = Array.from({ length: count }, (_, i) => {
    const t0 = i / count
    const t1 = (i + 1) / count
    const fLo = Math.exp(Math.log(F_MIN) + t0 * (Math.log(F_MAX) - Math.log(F_MIN)))
    const fHi = Math.exp(Math.log(F_MIN) + t1 * (Math.log(F_MAX) - Math.log(F_MIN)))
    const fCenter = Math.sqrt(fLo * fHi)
    // Low-end room noise like the reference capture: a rumble hump under 100 Hz,
    // sparse traffic through the low mids, silence above it.
    const low = Math.exp(-Math.pow(Math.log(fCenter / 42) / 0.62, 2))
    const mid = 0.34 * Math.exp(-Math.pow(Math.log(fCenter / 165) / 0.42, 2))
    const spot = 0.26 * Math.exp(-Math.pow(Math.log(fCenter / 340) / 0.16, 2))
    const wobble = 0.06 * Math.sin(t * 0.0017 + i * 0.35)
    const lift = (low * 22 + mid * 13 + spot * 9 + wobble) * (0.88 + 0.12 * Math.sin(t * 0.0009 + i))
    // Anything that never rises off the floor stays off the floor.
    const db = lift < 1.4 ? -Infinity : Math.min(-68, -90 + lift)
    return { fLo, fHi, fCenter, db }
  })
  const hold = bands.map((b, i) => b.db + 1.5 + ((i * 17) % 5) * 0.35)
  return { bands, hold }
}

function paint(): void {
  const { plotWidth } = scope.resize()
  const count = bandCountForWidth(plotWidth)
  const live = engine.sample()
  const rate = engine.sampleRate || 48000
  const fftSize = engine.fftSize
  const binHz = rate / fftSize
  const now = performance.now()

  let bands: Band[]
  let caps: number[]
  let peak = { hz: 0, db: -Infinity }
  let centroid = 0
  let rms = -Infinity
  let drawLive = live

  if (live) {
    bands = logBands(engine.freq, rate, fftSize, count)
    peak = peakFrequency(engine.freq, rate, fftSize)
    centroid = spectralCentroid(engine.freq, rate, fftSize)
    rms = rmsDb(engine.time)
    caps = hold.update(bands)
  } else if (demoMode) {
    const demo = demoBands(count, now)
    bands = demo.bands
    caps = demo.hold
    peak = { hz: 48, db: -72 }
    centroid = 4800
    drawLive = true
  } else {
    bands = Array.from({ length: count }, (_, i) => {
      const t0 = i / count
      const t1 = (i + 1) / count
      const fLo = Math.exp(Math.log(F_MIN) + t0 * (Math.log(F_MAX) - Math.log(F_MIN)))
      const fHi = Math.exp(Math.log(F_MIN) + t1 * (Math.log(F_MAX) - Math.log(F_MIN)))
      return { fLo, fHi, fCenter: Math.sqrt(fLo * fHi), db: engine.dbMin }
    })
    caps = hold.update(bands)
  }

  scope.draw({
    bands,
    hold: caps,
    peakHz: peak.hz,
    peakDb: peak.db,
    centroidHz: centroid,
    dbMin: engine.dbMin,
    dbMax: engine.dbMax,
    live: drawLive,
  })

  ui.statusRate.textContent = live ? `${Math.round(rate)} Hz` : demoMode ? `${Math.round(rate)} Hz` : '— Hz'
  ui.statusFft.textContent = `FFT ${fftSize}`
  ui.statusDf.textContent = `Δf ${formatDeltaF(binHz)}`

  const belowFloor = (!live && !demoMode) || peak.db < -72
  ui.metricArticles.forEach((el) => el.classList.toggle('has-signal', (live || demoMode) && !belowFloor))

  if (demoMode && !live) {
    ui.peak.textContent = 'Below floor'
    ui.peakDb.textContent = 'below floor'
    ui.note.textContent = 'A4 = 440'
    ui.cents.textContent = ''
    ui.centroid.textContent = '—'
    ui.rms.textContent = '—'
  } else if (belowFloor) {
    ui.peak.textContent = live ? 'Below floor' : '—'
    ui.peakDb.textContent = live ? 'below floor' : 'awaiting'
    ui.note.textContent = 'A4 = 440'
    ui.cents.textContent = ''
    ui.centroid.textContent = '—'
    ui.rms.textContent = '—'
  } else {
    ui.peak.textContent = formatHz(peak.hz)
    ui.peakDb.textContent = formatDb(peak.db)
    const pitch = freqToPitch(peak.hz)
    ui.note.textContent = pitch ? pitch.label : '—'
    ui.cents.textContent = pitch
      ? `${pitch.cents === 0 ? '0' : pitch.cents > 0 ? `+${pitch.cents}` : pitch.cents} cents`
      : 'out of note range'
    ui.centroid.textContent = formatHz(centroid)
    ui.rms.textContent = formatDb(rms)
  }

  requestAnimationFrame(paint)
}

setLive(demoMode ? 'mic' : 'idle')
if (demoMode) {
  ui.mic.classList.add('is-active')
  ui.statusInput.textContent = LABELS.mic
}
requestAnimationFrame(paint)

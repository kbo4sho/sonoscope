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

function setText(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value
}

let lastMeta = { rate: '', fft: '', df: '', signal: false }
let lastReadout = { peak: '', peakDb: '', note: '', cents: '', centroid: '', rms: '' }

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

  const rateText = live || demoMode ? `${Math.round(rate)} Hz` : '— Hz'
  const fftText = `FFT ${fftSize}`
  const dfText = `Δf ${formatDeltaF(binHz)}`
  if (rateText !== lastMeta.rate) {
    setText(ui.statusRate, rateText)
    lastMeta.rate = rateText
  }
  if (fftText !== lastMeta.fft) {
    setText(ui.statusFft, fftText)
    lastMeta.fft = fftText
  }
  if (dfText !== lastMeta.df) {
    setText(ui.statusDf, dfText)
    lastMeta.df = dfText
  }

  const belowFloor = (!live && !demoMode) || peak.db < -72
  const hasSignal = (live || demoMode) && !belowFloor
  if (hasSignal !== lastMeta.signal) {
    ui.metricArticles.forEach((el) => el.classList.toggle('has-signal', hasSignal))
    lastMeta.signal = hasSignal
  }

  let peakT: string
  let peakDbT: string
  let noteT: string
  let centsT: string
  let centroidT: string
  let rmsT: string

  if (demoMode && !live) {
    peakT = 'Below floor'
    peakDbT = 'below floor'
    noteT = 'A4 = 440'
    centsT = ''
    centroidT = '—'
    rmsT = '—'
  } else if (belowFloor) {
    peakT = live ? 'Below floor' : '—'
    peakDbT = live ? 'below floor' : 'awaiting'
    noteT = 'A4 = 440'
    centsT = ''
    centroidT = '—'
    rmsT = '—'
  } else {
    peakT = formatHz(peak.hz)
    peakDbT = formatDb(peak.db)
    const pitch = freqToPitch(peak.hz)
    noteT = pitch ? pitch.label : '—'
    centsT = pitch
      ? `${pitch.cents === 0 ? '0' : pitch.cents > 0 ? `+${pitch.cents}` : pitch.cents} cents`
      : 'out of note range'
    centroidT = formatHz(centroid)
    rmsT = formatDb(rms)
  }

  if (peakT !== lastReadout.peak) {
    setText(ui.peak, peakT)
    lastReadout.peak = peakT
  }
  if (peakDbT !== lastReadout.peakDb) {
    setText(ui.peakDb, peakDbT)
    lastReadout.peakDb = peakDbT
  }
  if (noteT !== lastReadout.note) {
    setText(ui.note, noteT)
    lastReadout.note = noteT
  }
  if (centsT !== lastReadout.cents) {
    setText(ui.cents, centsT)
    lastReadout.cents = centsT
  }
  if (centroidT !== lastReadout.centroid) {
    setText(ui.centroid, centroidT)
    lastReadout.centroid = centroidT
  }
  if (rmsT !== lastReadout.rms) {
    setText(ui.rms, rmsT)
    lastReadout.rms = rmsT
  }

  requestAnimationFrame(paint)
}

setLive(demoMode ? 'mic' : 'idle')
if (demoMode) {
  ui.mic.classList.add('is-active')
  ui.statusInput.textContent = LABELS.mic
}
requestAnimationFrame(paint)

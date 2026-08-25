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
  peakHold: document.querySelector<HTMLInputElement>('#peak-hold')!,
  notice: document.querySelector<HTMLParagraphElement>('#notice')!,
  live: document.querySelector('#live-state')!,
  liveLabel: document.querySelector('#live-label')!,
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
}

const LABELS: Record<SourceKind, string> = {
  idle: 'Standby',
  mic: 'Microphone',
  tab: 'Tab audio',
  file: 'Recording',
  tone: 'Reference 440 Hz',
}

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
  ui.liveLabel.textContent = LABELS[kind]
  ui.statusInput.textContent = kind === 'idle' ? 'Input idle' : `Input ${LABELS[kind]}`
  ui.stop.disabled = kind === 'idle'
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
  void run(() => engine.startMic(), 'Mic open — play audio nearby or into the room.')
})

ui.tab.addEventListener('click', () => {
  void run(() => engine.startTab(), 'Share a tab with audio. Video is discarded.')
})

ui.file.addEventListener('click', () => ui.fileInput.click())
ui.fileInput.addEventListener('change', () => {
  const file = ui.fileInput.files?.[0]
  if (!file) return
  void run(() => engine.startFile(file))
  ui.fileInput.value = ''
})

ui.tone.addEventListener('click', () => {
  void run(() => engine.startTone(440), 'Reference sine · A4 / 440 Hz')
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

ui.gain.addEventListener('input', () => {
  const value = Number(ui.gain.value)
  ui.gainVal.textContent = value.toFixed(2)
  engine.setGain(value)
})

ui.peakHold.addEventListener('change', () => {
  hold.enabled = ui.peakHold.checked
})

function paint(): void {
  const { plotWidth } = scope.resize()
  const count = bandCountForWidth(plotWidth)
  const live = engine.sample()
  const rate = engine.sampleRate || 48000
  const fftSize = engine.fftSize
  const binHz = rate / fftSize

  const bands = live
    ? logBands(engine.freq, rate, fftSize, count)
    : Array.from({ length: count }, (_, i) => {
        const t0 = i / count
        const t1 = (i + 1) / count
        const fLo = Math.exp(Math.log(F_MIN) + t0 * (Math.log(F_MAX) - Math.log(F_MIN)))
        const fHi = Math.exp(Math.log(F_MIN) + t1 * (Math.log(F_MAX) - Math.log(F_MIN)))
        return { fLo, fHi, fCenter: Math.sqrt(fLo * fHi), db: engine.dbMin }
      })

  const peak = live ? peakFrequency(engine.freq, rate, fftSize) : { hz: 0, db: -Infinity }
  const centroid = live ? spectralCentroid(engine.freq, rate, fftSize) : 0
  const rms = live ? rmsDb(engine.time) : -Infinity
  const caps = hold.update(bands)

  scope.draw({
    bands,
    hold: caps,
    peakHz: peak.hz,
    peakDb: peak.db,
    centroidHz: centroid,
    dbMin: engine.dbMin,
    dbMax: engine.dbMax,
    live,
  })

  ui.statusRate.textContent = live ? `${Math.round(rate)} Hz` : '— Hz'
  ui.statusFft.textContent = `FFT ${fftSize}`
  ui.statusDf.textContent = `Δf ${formatDeltaF(binHz)}`

  if (!live || peak.db < -72) {
    ui.peak.textContent = '—'
    ui.peakDb.textContent = live ? 'below floor' : 'awaiting'
    ui.note.textContent = '—'
    ui.cents.textContent = 'A4=440'
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

setLive('idle')
requestAnimationFrame(paint)

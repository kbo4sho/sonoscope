export type SourceKind = 'idle' | 'mic' | 'tab' | 'file' | 'tone'

const SILENT_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

export class AudioEngine {
  kind: SourceKind = 'idle'
  fftSize = 4096
  smoothing = 0.72
  gainValue = 1
  readonly dbMin = -90
  readonly dbMax = 0

  freq = new Float32Array(0)
  time = new Float32Array(0)

  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private gain: GainNode | null = null
  private input: AudioNode | null = null
  private stream: MediaStream | null = null
  private mediaEl: HTMLAudioElement | null = null
  private osc: OscillatorNode | null = null
  private hear: GainNode | null = null

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 0
  }

  get running(): boolean {
    return this.kind !== 'idle'
  }

  sample(): boolean {
    if (!this.analyser || this.kind === 'idle') return false
    this.analyser.getFloatFrequencyData(this.freq)
    this.analyser.getFloatTimeDomainData(this.time)
    return true
  }

  setFftSize(size: number): void {
    this.fftSize = size
    this.applySettings()
  }

  setSmoothing(value: number): void {
    this.smoothing = value
    this.applySettings()
  }

  setGain(value: number): void {
    this.gainValue = value
    if (this.gain) this.gain.gain.value = value
  }

  async startMic(): Promise<void> {
    this.stopGraph()
    this.ensureGraph()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: SILENT_CONSTRAINTS,
    })
    this.stream = stream
    this.input = this.ctx!.createMediaStreamSource(stream)
    this.input.connect(this.gain!)
    this.kind = 'mic'
  }

  async startTab(): Promise<void> {
    this.stopGraph()
    this.ensureGraph()
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: SILENT_CONSTRAINTS,
    })
    for (const track of stream.getVideoTracks()) track.stop()
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop())
      throw new Error('No audio in that share. Pick a Chrome tab and turn audio on.')
    }
    this.stream = stream
    stream.getAudioTracks()[0].addEventListener('ended', () => {
      if (this.kind === 'tab') this.stop()
    })
    this.input = this.ctx!.createMediaStreamSource(stream)
    this.input.connect(this.gain!)
    this.kind = 'tab'
  }

  async startFile(file: File): Promise<void> {
    this.stopGraph()
    this.ensureGraph()
    const url = URL.createObjectURL(file)
    const el = new Audio()
    el.src = url
    el.loop = true
    el.crossOrigin = 'anonymous'
    this.mediaEl = el
    this.input = this.ctx!.createMediaElementSource(el)
    this.input.connect(this.gain!)
    this.hearToDestination(0.85)
    await el.play()
    this.kind = 'file'
  }

  async startTone(hz = 440): Promise<void> {
    this.stopGraph()
    this.ensureGraph()
    const osc = this.ctx!.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = hz
    this.osc = osc
    this.input = osc
    osc.connect(this.gain!)
    this.hearToDestination(0.08)
    osc.start()
    this.kind = 'tone'
  }

  stop(): void {
    this.stopGraph()
    this.kind = 'idle'
    if (this.ctx?.state === 'running') void this.ctx.suspend()
  }

  private hearToDestination(level: number): void {
    if (!this.ctx || !this.gain) return
    this.hear = this.ctx.createGain()
    this.hear.gain.value = level
    this.gain.connect(this.hear)
    this.hear.connect(this.ctx.destination)
  }

  private ensureGraph(): void {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser()
      this.gain = this.ctx.createGain()
      this.gain.connect(this.analyser)
    }
    this.applySettings()
  }

  private applySettings(): void {
    if (!this.analyser || !this.gain) return
    this.analyser.fftSize = this.fftSize
    this.analyser.smoothingTimeConstant = this.smoothing
    this.analyser.minDecibels = this.dbMin
    try {
      this.analyser.maxDecibels = -0.05
    } catch {
      this.analyser.maxDecibels = -5
    }
    this.gain.gain.value = this.gainValue
    const bins = this.analyser.frequencyBinCount
    if (this.freq.length !== bins) this.freq = new Float32Array(bins)
    if (this.time.length !== this.analyser.fftSize) {
      this.time = new Float32Array(this.analyser.fftSize)
    }
  }

  private stopGraph(): void {
    try {
      this.osc?.stop()
    } catch {
      /* already stopped */
    }
    this.osc?.disconnect()
    this.osc = null
    this.input?.disconnect()
    this.input = null
    this.hear?.disconnect()
    this.hear = null
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.mediaEl) {
      this.mediaEl.pause()
      this.mediaEl.src = ''
      this.mediaEl = null
    }
  }
}

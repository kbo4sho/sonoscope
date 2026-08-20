const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
const A4 = 440

export type Pitch = {
  name: string
  octave: number
  midi: number
  cents: number
  label: string
}

export function freqToPitch(hz: number): Pitch | null {
  if (!Number.isFinite(hz) || hz < 16 || hz > 8000) return null
  const midiFloat = 69 + 12 * Math.log2(hz / A4)
  const midi = Math.round(midiFloat)
  const cents = Math.round((midiFloat - midi) * 100)
  const name = NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return {
    name,
    octave,
    midi,
    cents,
    label: `${name}${octave}`,
  }
}

export function formatHz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return '—'
  if (hz < 100) return `${hz.toFixed(1)} Hz`
  if (hz < 1000) return `${hz.toFixed(0)} Hz`
  if (hz < 10000) return `${(hz / 1000).toFixed(2)} kHz`
  return `${(hz / 1000).toFixed(1)} kHz`
}

export function formatDb(db: number): string {
  if (!Number.isFinite(db)) return '—'
  return `${db.toFixed(1)} dB`
}

export function formatDeltaF(binHz: number): string {
  if (!Number.isFinite(binHz) || binHz <= 0) return '—'
  if (binHz < 1) return `${binHz.toFixed(2)} Hz`
  return `${binHz.toFixed(1)} Hz`
}

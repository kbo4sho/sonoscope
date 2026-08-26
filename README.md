# Sonoscope

Live: [kbo4sho.github.io/sonoscope](https://kbo4sho.github.io/sonoscope/)

A quiet frequency analyser dressed as rack-mounted gear. Vertical bars show **how loud each band is** (dBFS). Their position on the dial is **logarithmic frequency**, the same spacing ears and old radio scales use — not a party equalizer.

## Why this, not a typical visualizer

Most visualizers optimize for glow. This one is for looking: peak frequency, nearest note, spectral centroid, and RMS, on a brushed-metal face with an inset spectrum well.

Spotify’s API does not give a live spectrum (playback is DRM-protected). Use one of:

1. **Listen** — microphone. Play Spotify on speakers, or sing/play into the room.
2. **Tab audio** — Chrome can share a tab *with audio*. The Spotify web player works; video is discarded.
3. **File** — drop a recording.
4. **440 Hz** — a sine at A4, to check that the peak readout is honest.

On macOS, system audio into the mic usually needs a loopback device such as BlackHole if you do not want speakers in the room.

## Measurement notes

- **Log bands**: FFT bins are averaged into equal-log-width bars from 20 Hz–20 kHz.
- **dBFS**: bar height is decibels relative to full scale, not a linear “jumping” amplitude.
- **Δf**: frequency resolution is `sampleRate / fftSize`. Larger FFT = finer bins, slower picture.
- **Peak hold**: orange caps linger so you can read a transient after it has already fallen.
- **Centroid**: amplitude-weighted center of the spectrum — a rough “brightness” number.

## Run

```bash
npm install
npm run dev
```

Needs a secure context (localhost or HTTPS) for microphone and tab capture.

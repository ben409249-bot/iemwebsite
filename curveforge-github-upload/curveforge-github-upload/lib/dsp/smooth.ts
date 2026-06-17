// Fractional-octave smoothing — the same operation oratory1990 / AutoEQ /
// Squig.link use to present FR data. Above ~6 kHz raw measurements are noisy
// (rig variance, coupler resonances); smoothing prevents the optimizer from
// chasing peaks that aren't real.

export type SmoothFraction = 0 | 1 | 2 | 3 | 6 | 12 | 24

interface Window {
  lo: number   // index inclusive
  hi: number   // index exclusive
  weights: Float32Array
  totalWeight: number
}

// Pre-compute windows for a given (F, fraction) so smoothing on a fresh curve
// is just one weighted sum per output point.
function buildWindows(F: number[], frac: number): Window[] {
  // frac is the denominator: 12 means 1/12 octave window.
  // The window spans ±(1/(2·frac)) octaves around f. Triangular weighting in
  // log space — gives smooth, edge-friendly results.
  const halfOct = 1 / (2 * frac)
  const halfRatio = Math.pow(2, halfOct)
  const out: Window[] = new Array(F.length)
  const logF = F.map(f => Math.log10(f))

  for (let i = 0; i < F.length; i++) {
    const fc = F[i]
    const lo = fc / halfRatio
    const hi = fc * halfRatio
    let start = i
    while (start > 0 && F[start - 1] >= lo) start--
    let end = i + 1
    while (end < F.length && F[end - 1] <= hi) end++

    const n = end - start
    const weights = new Float32Array(n)
    let total = 0
    const lfc = logF[i]
    const halfLog = Math.log10(halfRatio)
    for (let j = 0; j < n; j++) {
      const d = Math.abs(logF[start + j] - lfc) / halfLog
      const w = Math.max(0, 1 - d)  // triangular
      weights[j] = w
      total += w
    }
    if (total === 0) { weights[0] = 1; total = 1 }
    out[i] = { lo: start, hi: end, weights, totalWeight: total }
  }
  return out
}

const cache = new Map<string, Window[]>()

function getWindows(F: number[], frac: number): Window[] {
  // Cache key tied to the grid identity + fraction. The grid is a module-level
  // constant in deriveAll, so the cache hits every call.
  const key = `${F.length}:${F[0].toFixed(2)}:${F[F.length-1].toFixed(2)}:${frac}`
  let w = cache.get(key)
  if (!w) {
    w = buildWindows(F, frac)
    cache.set(key, w)
  }
  return w
}

export function smoothOctave(F: number[], V: number[], frac: SmoothFraction): number[] {
  if (frac <= 0) return V
  const wins = getWindows(F, frac)
  const out = new Array(V.length)
  for (let i = 0; i < V.length; i++) {
    const w = wins[i]
    let acc = 0
    for (let j = 0, k = w.lo; k < w.hi; j++, k++) {
      acc += V[k] * w.weights[j]
    }
    out[i] = acc / w.totalWeight
  }
  return out
}

export const SMOOTH_OPTIONS: Array<{ key: SmoothFraction; label: string }> = [
  { key: 0,  label: 'Off' },
  { key: 24, label: '1/24 oct' },
  { key: 12, label: '1/12 oct' },
  { key: 6,  label: '1/6 oct' },
  { key: 3,  label: '1/3 oct' },
]

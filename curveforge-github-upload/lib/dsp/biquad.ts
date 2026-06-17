const FS = 48000

export type FilterType = 'PK' | 'LS' | 'HS'

interface BiquadCoeffs {
  b0: number; b1: number; b2: number
  a0: number; a1: number; a2: number
}

function peakCoeffs(fc: number, gainDb: number, Q: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40)
  const w0 = 2 * Math.PI * fc / FS
  const alpha = Math.sin(w0) / (2 * Q)
  return {
    b0: 1 + alpha * A, b1: -2 * Math.cos(w0), b2: 1 - alpha * A,
    a0: 1 + alpha / A, a1: -2 * Math.cos(w0), a2: 1 - alpha / A,
  }
}

function lowShelfCoeffs(fc: number, gainDb: number, Q: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40)
  const w0 = 2 * Math.PI * fc / FS
  const cos0 = Math.cos(w0)
  const sin0 = Math.sin(w0)
  const alpha = sin0 / (2 * Q)
  const sqA = Math.sqrt(A)
  return {
    b0: A * ((A + 1) - (A - 1) * cos0 + 2 * sqA * alpha),
    b1: 2 * A * ((A - 1) - (A + 1) * cos0),
    b2: A * ((A + 1) - (A - 1) * cos0 - 2 * sqA * alpha),
    a0: (A + 1) + (A - 1) * cos0 + 2 * sqA * alpha,
    a1: -2 * ((A - 1) + (A + 1) * cos0),
    a2: (A + 1) + (A - 1) * cos0 - 2 * sqA * alpha,
  }
}

function highShelfCoeffs(fc: number, gainDb: number, Q: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40)
  const w0 = 2 * Math.PI * fc / FS
  const cos0 = Math.cos(w0)
  const sin0 = Math.sin(w0)
  const alpha = sin0 / (2 * Q)
  const sqA = Math.sqrt(A)
  return {
    b0: A * ((A + 1) + (A - 1) * cos0 + 2 * sqA * alpha),
    b1: -2 * A * ((A - 1) + (A + 1) * cos0),
    b2: A * ((A + 1) + (A - 1) * cos0 - 2 * sqA * alpha),
    a0: (A + 1) - (A - 1) * cos0 + 2 * sqA * alpha,
    a1: 2 * ((A - 1) - (A + 1) * cos0),
    a2: (A + 1) - (A - 1) * cos0 - 2 * sqA * alpha,
  }
}

function magnitudeDb(c: BiquadCoeffs, F: number[]): number[] {
  const { b0, b1, b2, a0, a1, a2 } = c
  return F.map(f => {
    const w = 2 * Math.PI * f / FS
    const cw = Math.cos(w)
    const c2w = Math.cos(2 * w)
    const num = b0 * b0 + b1 * b1 + b2 * b2 + 2 * (b0 * b1 + b1 * b2) * cw + 2 * b0 * b2 * c2w
    const den = a0 * a0 + a1 * a1 + a2 * a2 + 2 * (a0 * a1 + a1 * a2) * cw + 2 * a0 * a2 * c2w
    return 10 * Math.log10(Math.max(num / den, 1e-30))
  })
}

export function filterMagnitudeDb(
  type: FilterType,
  fc: number,
  gainDb: number,
  Q: number,
  F: number[]
): number[] {
  let c: BiquadCoeffs
  if (type === 'LS') c = lowShelfCoeffs(fc, gainDb, Q)
  else if (type === 'HS') c = highShelfCoeffs(fc, gainDb, Q)
  else c = peakCoeffs(fc, gainDb, Q)
  return magnitudeDb(c, F)
}

export function sumFilterMagnitudesDb(
  filters: Array<{ type: FilterType; fc: number; gain: number; q: number; enabled?: boolean }>,
  F: number[]
): number[] {
  const result = new Array(F.length).fill(0)
  for (const fl of filters) {
    if (fl.enabled === false) continue
    const resp = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
    for (let i = 0; i < F.length; i++) result[i] += resp[i]
  }
  return result
}

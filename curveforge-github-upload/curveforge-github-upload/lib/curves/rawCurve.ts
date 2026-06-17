import type { HeadphoneEntry } from '../types'

function bassShape(f: number): number {
  return 1 / (1 + Math.pow(f / 110, 2.2))
}

function tiltShape(f: number): number {
  const lo = Math.log10(20)
  const hi = Math.log10(20000)
  const mid = (lo + hi) / 2
  return (Math.log10(f) - mid) / ((hi - lo) / 2)
}

function gauss(f: number, fc: number, gain: number, width: number): number {
  return gain * Math.exp(-0.5 * Math.pow((Math.log10(f) - Math.log10(fc)) / width, 2))
}

export function computeRawCurve(hp: HeadphoneEntry, F: number[]): number[] {
  return F.map(f => {
    let v = hp.bass * bassShape(f) + hp.tilt * tiltShape(f)
    for (const b of hp.bumps) v += gauss(f, b.fc, b.gain, b.width)
    return v
  })
}

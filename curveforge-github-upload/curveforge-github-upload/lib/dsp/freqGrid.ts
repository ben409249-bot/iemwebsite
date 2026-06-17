const LO = Math.log10(20)
const HI = Math.log10(20000)

export function makeFreqGrid(n = 170): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.pow(10, LO + (HI - LO) * i / (n - 1))
  )
}

export function idxNearest(F: number[], f: number): number {
  let best = 0
  let bd = Infinity
  const lf = Math.log10(f)
  for (let i = 0; i < F.length; i++) {
    const d = Math.abs(Math.log10(F[i]) - lf)
    if (d < bd) { bd = d; best = i }
  }
  return best
}

export function logInterpolate(
  srcFreqs: number[],
  srcVals: number[],
  targetFreqs: number[]
): number[] {
  return targetFreqs.map(f => {
    const lf = Math.log10(f)
    if (lf <= Math.log10(srcFreqs[0])) return srcVals[0]
    if (lf >= Math.log10(srcFreqs[srcFreqs.length - 1])) return srcVals[srcFreqs.length - 1]
    let lo = 0
    let hi = srcFreqs.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (Math.log10(srcFreqs[mid]) <= lf) lo = mid
      else hi = mid
    }
    const t = (lf - Math.log10(srcFreqs[lo])) / (Math.log10(srcFreqs[hi]) - Math.log10(srcFreqs[lo]))
    return srcVals[lo] + t * (srcVals[hi] - srcVals[lo])
  })
}

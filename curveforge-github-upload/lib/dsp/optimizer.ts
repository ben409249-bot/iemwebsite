import { makeFreqGrid, idxNearest } from './freqGrid'
import { filterMagnitudeDb, FilterType } from './biquad'

export interface FitFilter {
  type: FilterType
  fc: number
  gain: number
  q: number
}

function rms(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length)
}

function weightedRms(arr: number[], F: number[]): number {
  let sum = 0
  for (let i = 0; i < arr.length; i++) {
    const f = F[i]
    let w: number
    if (f < 40) w = 0.25
    else if (f < 100) w = 0.6
    else if (f < 8000) w = 1.0
    else if (f < 12000) w = 0.5
    else w = 0.2
    sum += w * arr[i] * arr[i]
  }
  return Math.sqrt(sum / arr.length)
}

export function fitFilters(
  F: number[],
  error: number[],
  numFilters: number,
  maxGain: number
): FitFilter[] {
  const resid = error.slice()
  const placed: FitFilter[] = []
  const SKIP_LO = 3
  const SKIP_HI = 2

  for (let k = 0; k < numFilters; k++) {
    let mi = SKIP_LO
    let mv = 0
    for (let i = SKIP_LO; i < resid.length - SKIP_HI; i++) {
      if (Math.abs(resid[i]) > Math.abs(mv)) { mv = resid[i]; mi = i }
    }
    if (Math.abs(mv) < 0.25) break

    const fc = F[mi]

    let type: FilterType
    if (fc < 160 && mv > 0) type = 'LS'
    else if (fc > 7000 && Math.abs(mv) > 1) type = 'HS'
    else type = 'PK'

    let gain = Math.max(-maxGain, Math.min(maxGain, mv))

    // conservative HS
    if (type === 'HS') gain = Math.max(-maxGain, Math.min(maxGain * 0.7, mv))

    // don't boost narrow high-freq dips heavily
    if (type === 'PK' && fc > 8000 && gain > 0) gain = Math.min(gain, maxGain * 0.5)

    // skip tiny gains
    if (Math.abs(gain) < 0.3) break

    let Q = fc < 90 || fc > 9000 ? 0.7 : 1.4

    // candidate search
    const freqMults = [0.85, 0.92, 1.0, 1.08, 1.18]
    const gainMults = [0.6, 0.8, 1.0, 1.2]
    const qMults = [0.6, 0.8, 1.0, 1.3, 1.7]

    let bestRmse = Infinity
    let bestFc = fc
    let bestGain = gain
    let bestQ = Q
    let bestType = type

    for (const fm of freqMults) {
      const cfc = Math.min(19000, Math.max(22, fc * fm))
      for (const gm of gainMults) {
        const cg = Math.max(-maxGain, Math.min(maxGain, gain * gm))
        if (Math.abs(cg) < 0.3) continue
        for (const qm of qMults) {
          const cq = Math.max(0.3, Math.min(8, Q * qm))
          const resp = filterMagnitudeDb(bestType, cfc, cg, cq, F)
          const testResid = resid.map((v, i) => v - resp[i])
          const r = weightedRms(testResid, F)
          if (r < bestRmse) { bestRmse = r; bestFc = cfc; bestGain = cg; bestQ = cq }
        }
      }
    }

    const filter: FitFilter = { type: bestType, fc: bestFc, gain: bestGain, q: bestQ }
    const resp = filterMagnitudeDb(filter.type, filter.fc, filter.gain, filter.q, F)
    for (let i = 0; i < resid.length; i++) resid[i] -= resp[i]
    placed.push(filter)
  }

  // Three-phase refinement: coarse → fine → ultra-fine. Earlier passes use a
  // wide grid to escape local minima; later passes use a tighter grid to
  // squeeze out the last bit of accuracy. Net cost stays bounded because
  // by the fine phases the filters are already close to optimum.
  const PHASES = [
    { grids: { f: [0.88, 0.94, 1.0, 1.06, 1.12], g: [0.75, 0.9, 1.0, 1.1, 1.25], q: [0.7, 0.85, 1.0, 1.18, 1.4] }, passes: 2 },
    { grids: { f: [0.95, 0.98, 1.0, 1.02, 1.05], g: [0.88, 0.95, 1.0, 1.05, 1.12], q: [0.85, 0.92, 1.0, 1.08, 1.16] }, passes: 2 },
    { grids: { f: [0.98, 0.99, 1.0, 1.01, 1.02], g: [0.95, 0.98, 1.0, 1.02, 1.05], q: [0.94, 0.97, 1.0, 1.03, 1.06] }, passes: 1 },
  ]

  for (const phase of PHASES) {
    for (let pass = 0; pass < phase.passes; pass++) {
      // recompute residual without all filters
      const baseResid = error.slice()
      for (const fl of placed) {
        const r = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
        for (let i = 0; i < baseResid.length; i++) baseResid[i] -= r[i]
      }

      for (let fi = 0; fi < placed.length; fi++) {
        const fl = placed[fi]
        // residual without this filter
        const flResp = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
        const rWithout = baseResid.slice()
        for (let i = 0; i < rWithout.length; i++) rWithout[i] += flResp[i]

        let bestRmse = weightedRms(rWithout.map((v, i) => v - flResp[i]), F)
        let bfc = fl.fc, bgain = fl.gain, bq = fl.q

        for (const fm of phase.grids.f) {
          const cfc = Math.min(19000, Math.max(22, fl.fc * fm))
          for (const gm of phase.grids.g) {
            const cg = Math.max(-maxGain, Math.min(maxGain, fl.gain * gm))
            for (const qm of phase.grids.q) {
              const cq = Math.max(0.3, Math.min(8, fl.q * qm))
              const resp = filterMagnitudeDb(fl.type, cfc, cg, cq, F)
              const r = weightedRms(rWithout.map((v, i) => v - resp[i]), F)
              if (r < bestRmse) { bestRmse = r; bfc = cfc; bgain = cg; bq = cq }
            }
          }
        }

        if (bfc !== fl.fc || bgain !== fl.gain || bq !== fl.q) {
          const oldResp = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
          const newResp = filterMagnitudeDb(fl.type, bfc, bgain, bq, F)
          for (let i = 0; i < baseResid.length; i++) {
            baseResid[i] += oldResp[i]
            baseResid[i] -= newResp[i]
          }
          placed[fi] = { ...fl, fc: bfc, gain: bgain, q: bq }
        }
      }
    }
  }

  // Polish pass: random restarts on the worst-fitting filter. Picks the
  // filter that contributes most to the residual and tries a few alternative
  // (fc, Q) placements within ±25% — this escapes shallow local minima the
  // coordinate descent can't, especially on multi-peak pinna regions.
  {
    const residual = error.slice()
    for (const fl of placed) {
      const r = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
      for (let i = 0; i < residual.length; i++) residual[i] -= r[i]
    }
    let totalRmse = weightedRms(residual, F)

    for (let kick = 0; kick < 4 && totalRmse > 0.6; kick++) {
      // pick worst filter: the one whose removal hurts the residual most
      let worstFi = -1
      let worstDelta = 0
      for (let fi = 0; fi < placed.length; fi++) {
        const fl = placed[fi]
        const fr = filterMagnitudeDb(fl.type, fl.fc, fl.gain, fl.q, F)
        const without = residual.map((v, i) => v + fr[i])
        const delta = weightedRms(without, F) - totalRmse
        if (delta > worstDelta) { worstDelta = delta; worstFi = fi }
      }
      if (worstFi < 0) break

      const cur = placed[worstFi]
      const curResp = filterMagnitudeDb(cur.type, cur.fc, cur.gain, cur.q, F)
      const without = residual.map((v, i) => v + curResp[i])

      // 12 random candidates in a wider neighbourhood
      let bestRmse = totalRmse
      let bestParams: { fc: number; gain: number; q: number } | null = null
      for (let trial = 0; trial < 12; trial++) {
        const fm = 0.75 + Math.random() * 0.5
        const qm = 0.7 + Math.random() * 0.6
        const gm = 0.85 + Math.random() * 0.3
        const cfc = Math.min(19000, Math.max(22, cur.fc * fm))
        const cq = Math.max(0.3, Math.min(8, cur.q * qm))
        const cg = Math.max(-maxGain, Math.min(maxGain, cur.gain * gm))
        const resp = filterMagnitudeDb(cur.type, cfc, cg, cq, F)
        const r = weightedRms(without.map((v, i) => v - resp[i]), F)
        if (r < bestRmse - 0.005) { bestRmse = r; bestParams = { fc: cfc, gain: cg, q: cq } }
      }

      if (bestParams) {
        const newResp = filterMagnitudeDb(cur.type, bestParams.fc, bestParams.gain, bestParams.q, F)
        for (let i = 0; i < residual.length; i++) {
          residual[i] += curResp[i] - newResp[i]
        }
        placed[worstFi] = { ...cur, ...bestParams }
        totalRmse = bestRmse
      } else {
        break  // no improvement found — additional kicks unlikely to help
      }
    }
  }

  // Drop any filter that contributes less than 0.3 dB peak — better one fewer
  // band than wasted slots.
  const pruned = placed.filter(fl => Math.abs(fl.gain) >= 0.3)

  return pruned.sort((a, b) => a.fc - b.fc)
}

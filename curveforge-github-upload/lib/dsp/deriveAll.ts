import { makeFreqGrid, idxNearest, logInterpolate } from './freqGrid'
import { sumFilterMagnitudesDb } from './biquad'
import { fitFilters, FitFilter } from './optimizer'
import { computeRawCurve } from '../curves/rawCurve'
import { computeTargetCurve } from '../curves/targetCurve'
import { computePreferenceScore, type PreferenceBreakdown } from './preferenceScore'
import { smoothOctave } from './smooth'
import { HEADPHONES } from '../data/headphones'
import type { FrequencyPoint, GeneratorState } from '../types'

const F = makeFreqGrid(170)

function rms(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length)
}

function normalizeAt1k(curve: number[]): number[] {
  const i1k = idxNearest(F, 1000)
  const ref = curve[i1k]
  return curve.map(v => v - ref)
}

export interface AllDerived {
  F: number[]
  rawN: number[]
  targetN: number[]
  sumEQ: number[]
  corrected: number[]
  filters: FitFilter[]
  preamp: number
  matchPct: number
  beforeRmse: number
  afterRmse: number
  preferenceScore: PreferenceBreakdown
}

export function deriveAll(state: GeneratorState): AllDerived {
  const hp = HEADPHONES.find(h => h.id === state.hpId) ?? HEADPHONES[0]

  let rawRaw: number[]
  const measurementPoints = state.uploadedMeasurement ?? state.fetchedFr
  if (measurementPoints && measurementPoints.length >= 20) {
    const srcF = measurementPoints.map(p => p.frequency)
    const srcV = measurementPoints.map(p => p.response)
    rawRaw = logInterpolate(srcF, srcV, F)
  } else {
    rawRaw = computeRawCurve(hp, F)
  }

  let tgtRaw: number[]
  if (state.uploadedTarget && state.uploadedTarget.length >= 20) {
    const srcF = state.uploadedTarget.map(p => p.frequency)
    const srcV = state.uploadedTarget.map(p => p.response)
    tgtRaw = logInterpolate(srcF, srcV, F)
  } else {
    tgtRaw = computeTargetCurve(state.targets, F)
  }

  // Apply fractional-octave smoothing to the raw measurement only — targets
  // are already smooth by construction. Above ~6 kHz raw rigs are noisy and
  // un-smoothed data makes the optimizer chase phantom peaks.
  const rawSmoothed = state.smoothFrac > 0 ? smoothOctave(F, rawRaw, state.smoothFrac) : rawRaw

  const rawN = normalizeAt1k(rawSmoothed)
  const targetN = normalizeAt1k(tgtRaw)
  const error = targetN.map((v, i) => v - rawN[i])

  const rawFilters = fitFilters(F, error, state.numFilters, state.maxGain)

  // Apply user gain trims (drag-to-tune). Index-keyed so each filter keeps its
  // identity across re-renders. Trims are reset upstream when the underlying
  // fit changes (IEM swap, numFilters change).
  const trims = state.filterGainTrims
  const filters = rawFilters.map((f, i) => {
    const t = trims[i]
    return t ? { ...f, gain: Math.max(-state.maxGain, Math.min(state.maxGain, f.gain + t)) } : f
  })

  const disabled = new Set(state.disabledFilterIdx)
  const sumEQ = sumFilterMagnitudesDb(
    filters.map((f, i) => ({ ...f, enabled: !disabled.has(i) })),
    F
  )

  const corrected = rawN.map((v, i) => v + sumEQ[i])
  const errorAfter = targetN.map((v, i) => v - corrected[i])

  const beforeRmse = rms(error)
  const afterRmse = rms(errorAfter)
  const matchPct = Math.max(45, Math.min(99, Math.round((1 - afterRmse / Math.max(beforeRmse, 0.001)) * 100)))

  const maxPositiveGain = Math.max(0, ...sumEQ)
  const preamp = parseFloat((-maxPositiveGain - 1).toFixed(1))
  const clampedPreamp = Math.min(0, preamp)

  const preferenceScore = computePreferenceScore(F, rawN, targetN)

  return { F, rawN, targetN, sumEQ, corrected, filters, preamp: clampedPreamp, matchPct, beforeRmse, afterRmse, preferenceScore }
}

// Simple raw-tonality score: how close the un-EQ'd headphone sits to the
// active target across perceptually-weighted bands. 100 = identical, 0 = wildly off.
// This is a fast heuristic, not a published model.

export interface PreferenceBreakdown {
  total: number          // 0-100
  bass: number           // 0-100 sub-score (20-150 Hz fit)
  mids: number           // 150-2k Hz fit
  earGain: number        // 2k-5k Hz fit (the pinna gain region)
  treble: number         // 5k-20k Hz fit
}

interface BandRange { lo: number; hi: number; weight: number }

const BANDS: Record<keyof Omit<PreferenceBreakdown, 'total'>, BandRange> = {
  bass:    { lo: 20,   hi: 150,   weight: 1.0  },
  mids:    { lo: 150,  hi: 2000,  weight: 1.4  },
  earGain: { lo: 2000, hi: 5000,  weight: 1.6  },
  treble:  { lo: 5000, hi: 20000, weight: 0.9  },
}

function bandRmse(F: number[], err: number[], lo: number, hi: number): number {
  let sumSq = 0
  let n = 0
  for (let i = 0; i < F.length; i++) {
    if (F[i] >= lo && F[i] <= hi) {
      sumSq += err[i] * err[i]
      n++
    }
  }
  if (n === 0) return 0
  return Math.sqrt(sumSq / n)
}

// Map a band RMS in dB to a 0-100 sub-score with a soft falloff.
// 0 dB error → 100, ~3 dB → ~70, ~6 dB → ~40, ~10 dB → ~15.
function rmseToScore(rmseDb: number): number {
  const s = 100 * Math.exp(-rmseDb / 4.2)
  return Math.max(0, Math.min(100, Math.round(s)))
}

export function computePreferenceScore(
  F: number[],
  rawN: number[],
  targetN: number[]
): PreferenceBreakdown {
  const err = rawN.map((v, i) => v - targetN[i])

  const subs = {
    bass:    rmseToScore(bandRmse(F, err, BANDS.bass.lo, BANDS.bass.hi)),
    mids:    rmseToScore(bandRmse(F, err, BANDS.mids.lo, BANDS.mids.hi)),
    earGain: rmseToScore(bandRmse(F, err, BANDS.earGain.lo, BANDS.earGain.hi)),
    treble:  rmseToScore(bandRmse(F, err, BANDS.treble.lo, BANDS.treble.hi)),
  }

  const weights = BANDS
  const wSum = weights.bass.weight + weights.mids.weight + weights.earGain.weight + weights.treble.weight
  const total = Math.round(
    (subs.bass * weights.bass.weight +
     subs.mids * weights.mids.weight +
     subs.earGain * weights.earGain.weight +
     subs.treble * weights.treble.weight) / wSum
  )

  return { total, ...subs }
}

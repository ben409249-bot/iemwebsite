function bassShape(f: number): number {
  return 1 / (1 + Math.pow(f / 110, 2.2))
}

function highShape(f: number): number {
  const r = Math.pow(f / 6500, 2)
  return r / (1 + r)
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

export interface TargetKnobs {
  bass: number
  ear: number
  treble: number
  tilt: number
}

export function computeTargetCurve(targets: TargetKnobs, F: number[]): number[] {
  return F.map(f =>
    targets.bass * bassShape(f) +
    gauss(f, 2700, targets.ear, 0.16) +
    targets.treble * highShape(f) +
    targets.tilt * tiltShape(f)
  )
}

export type PresetFamily = 'IEM' | 'Over-ear' | 'Universal'

export const PRESETS: Record<string, TargetKnobs> = {
  // Over-ear / general Harman family
  'Harman 2019':   { bass: 6,   ear: 3,   treble: 0,  tilt: 0   },
  'Harman 2018':   { bass: 6.5, ear: 2.5, treble: -1, tilt: 0   },
  'Sean Olive 2018': { bass: 5.5, ear: 3,  treble: -0.5, tilt: 0 },
  'AKG K371':      { bass: 5,   ear: 2.8, treble: -0.5, tilt: 0 },

  // IEM-specific
  'Harman IE 2019':{ bass: 10,  ear: 3,   treble: 0,  tilt: 0   },
  'Harman IE 2017':{ bass: 7.5, ear: 2.8, treble: -1, tilt: 0   },
  'IEF Neutral':   { bass: 4,   ear: 3,   treble: 0,  tilt: 0   },
  'JM-1':          { bass: 6,   ear: 2.5, treble: 1,  tilt: 0   },
  'Crinacle 2024': { bass: 5,   ear: 2.8, treble: 0,  tilt: 0   },
  'ER-4S Neutral': { bass: 1,   ear: 3,   treble: 0,  tilt: 0.5 },
  'Diffuse Field': { bass: 0,   ear: 3.5, treble: 1,  tilt: 0   },
  'Studio Reference': { bass: 3, ear: 2.5, treble: 0.5, tilt: 0.5 },

  // Flavor presets
  'Flat':          { bass: 0,   ear: 0,   treble: 0,  tilt: 0   },
  'Bass Boost':    { bass: 10,  ear: 2,   treble: -1, tilt: -1  },
  'V-Shape':       { bass: 8,   ear: 1.5, treble: 3,  tilt: -1.5 },
  'Bright':        { bass: 4,   ear: 4,   treble: 3,  tilt: 1   },
  'Warm':          { bass: 7,   ear: 2,   treble: -2, tilt: 2   },
  'Vocal Focus':   { bass: 3,   ear: 4.5, treble: 0,  tilt: 0   },
}

export const PRESET_META: Record<string, { family: PresetFamily; note?: string }> = {
  'Harman 2019':       { family: 'Over-ear', note: 'Olive–Welti 2019 over-ear target' },
  'Harman 2018':       { family: 'Over-ear' },
  'Sean Olive 2018':   { family: 'Over-ear', note: 'Sean Olive AES paper preference target' },
  'AKG K371':          { family: 'Over-ear', note: 'K371 closed-back leaning — slightly warm' },
  'Harman IE 2019':    { family: 'IEM',      note: 'Harman in-ear target — strong bass shelf' },
  'Harman IE 2017':    { family: 'IEM' },
  'IEF Neutral':       { family: 'IEM',      note: 'Crinacle IEF / DF-neutral leaning' },
  'JM-1':              { family: 'IEM',      note: 'Headphones.com JM-1 balanced reference' },
  'Crinacle 2024':     { family: 'IEM',      note: 'Crinacle preference target — moderate bass, neutral mids' },
  'ER-4S Neutral':     { family: 'IEM',      note: 'Etymotic ER-4S — flat, no bass shelf' },
  'Diffuse Field':     { family: 'Universal',note: 'Classic DF — bright, lean' },
  'Studio Reference':  { family: 'Universal',note: 'Mixing/mastering reference — slightly bright' },
  'Flat':              { family: 'Universal' },
  'Bass Boost':        { family: 'Universal' },
  'V-Shape':           { family: 'Universal', note: 'Boosted bass + treble — fun signature' },
  'Bright':            { family: 'Universal' },
  'Warm':              { family: 'Universal' },
  'Vocal Focus':       { family: 'Universal', note: 'Forward mids for vocal listening' },
}

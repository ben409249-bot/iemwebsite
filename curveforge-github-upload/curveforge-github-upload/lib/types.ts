export interface FrequencyPoint {
  frequency: number
  response: number
}

export type EqFilterType = 'PK' | 'LS' | 'HS'

export interface EqFilter {
  id: string
  type: EqFilterType
  frequency: number
  gain: number
  q: number
  enabled: boolean
}

export type OutputFormat =
  | 'equalizer-apo'
  | 'peace'
  | 'wavelet-graphic-eq'
  | 'poweramp'
  | 'generic-json'
  | 'plain-text'
  | 'qudelix-5k'
  | 'autoeq'

export interface EqPreset {
  preamp: number
  filters: EqFilter[]
  metrics: {
    beforeRmse: number
    afterRmse: number
    matchPct: number
    maxPositiveGain: number
  }
}

export interface HeadphoneEntry {
  id: string
  name: string
  brand: string
  mark: string
  type: 'Over-ear' | 'In-ear' | 'Wireless'
  driver: string
  impedance: string
  bass: number
  tilt: number
  bumps: Array<{ fc: number; gain: number; width: number }>
}

export interface HpIndexEntry {
  id: string
  name: string
  brand: string
  type: 'In-ear' | 'Over-ear' | 'Wireless'
  source: string
  rawUrl: string
}

export type HpTypeFilter = 'All' | 'In-ear' | 'Over-ear' | 'Wireless'

export interface GeneratorState {
  hpId: string
  hpDisplayName: string
  hpRawUrl: string
  fetchedFr: FrequencyPoint[] | null
  frLoading: boolean
  query: string
  searchOpen: boolean
  typeFilter: HpTypeFilter
  source: string
  presetName: string
  targets: { bass: number; ear: number; treble: number; tilt: number }
  eqType: 'parametric' | 'graphic' | 'fixed'
  numFilters: number
  maxGain: number
  showRaw: boolean
  showTarget: boolean
  showCorrected: boolean
  activeFormat: OutputFormat
  copied: boolean
  uploadedMeasurement: FrequencyPoint[] | null
  uploadedTarget: FrequencyPoint[] | null
  disabledFilterIdx: number[]
  smoothFrac: 0 | 1 | 2 | 3 | 6 | 12 | 24
  // Per-filter additive gain offset in dB (drag-to-tune on the graph). Indexed
  // by the optimizer's filter index. Reset when the underlying fit changes.
  filterGainTrims: Record<number, number>
}

export interface DerivedCurves {
  F: number[]
  rawN: number[]
  targetN: number[]
  sumEQ: number[]
  corrected: number[]
  filters: Array<{ fc: number; gain: number; q: number }>
  preamp: number
  matchPct: number
  beforeRmse: number
  afterRmse: number
  preferenceScore: { total: number; bass: number; mids: number; earGain: number; treble: number }
}

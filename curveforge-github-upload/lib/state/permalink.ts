import type { GeneratorState, OutputFormat } from '../types'

// Compact shape: only fields the user actually controls. Uploaded
// measurements/targets are intentionally NOT serialized — they're files,
// not state, and would blow the URL up.
interface CompactState {
  v: number
  hp?: string
  hpn?: string
  hpu?: string
  src?: string
  pn?: string
  t?: [number, number, number, number] | number[]  // bass, ear, treble, tilt
  eq?: string
  n?: number
  mg?: number
  fmt?: string
  sm?: number
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out as T
}

export function encodeState(s: GeneratorState): string {
  const compact: CompactState = clean({
    v: 1,
    hp: s.hpId,
    hpn: s.hpDisplayName,
    hpu: s.hpRawUrl,
    src: s.source,
    pn: s.presetName,
    t: [s.targets.bass, s.targets.ear, s.targets.treble, s.targets.tilt],
    eq: s.eqType,
    n: s.numFilters,
    mg: s.maxGain,
    fmt: s.activeFormat,
    sm: s.smoothFrac,
  })
  const json = JSON.stringify(compact)
  if (typeof window === 'undefined') return ''
  // base64url
  return window.btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeState(encoded: string): Partial<GeneratorState> | null {
  if (!encoded || typeof window === 'undefined') return null
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = decodeURIComponent(escape(window.atob(padded)))
    const c = JSON.parse(json) as CompactState
    if (c.v !== 1) return null

    const partial: Partial<GeneratorState> = {}
    if (c.hp) partial.hpId = c.hp
    if (c.hpn) partial.hpDisplayName = c.hpn
    if (c.hpu) partial.hpRawUrl = c.hpu
    if (c.src) partial.source = c.src
    if (c.pn) partial.presetName = c.pn
    if (c.t && c.t.length === 4) {
      partial.targets = { bass: c.t[0], ear: c.t[1], treble: c.t[2], tilt: c.t[3] }
    }
    if (c.eq && (c.eq === 'parametric' || c.eq === 'graphic' || c.eq === 'fixed')) {
      partial.eqType = c.eq
    }
    if (typeof c.n === 'number') partial.numFilters = c.n
    if (typeof c.mg === 'number') partial.maxGain = c.mg
    if (c.fmt) partial.activeFormat = c.fmt as OutputFormat
    if (typeof c.sm === 'number' && [0,1,2,3,6,12,24].includes(c.sm)) {
      partial.smoothFrac = c.sm as GeneratorState['smoothFrac']
    }
    return partial
  } catch {
    return null
  }
}

export function readHash(): string {
  if (typeof window === 'undefined') return ''
  const h = window.location.hash
  if (!h.startsWith('#s=')) return ''
  return h.slice(3)
}

export function writeHash(encoded: string) {
  if (typeof window === 'undefined') return
  const next = encoded ? `#s=${encoded}` : ''
  if (window.location.hash === next) return
  // replace, not push — don't pollute history with every slider tick
  const url = window.location.pathname + window.location.search + next
  window.history.replaceState(null, '', url)
}

export function shareUrl(encoded: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname}#s=${encoded}`
}

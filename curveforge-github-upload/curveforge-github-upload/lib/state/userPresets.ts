import type { GeneratorState } from '../types'

const KEY = 'curvelab.userPresets.v1'

export interface UserPreset {
  id: string
  name: string
  savedAt: number  // ms since epoch
  state: Partial<GeneratorState>
}

// Only persist the fields the user actually authored. Skip ephemeral things
// (loading flags, search open, copied indicator) and uploaded blobs (those
// would balloon localStorage and aren't safe to round-trip as JSON anyway).
function snapshot(s: GeneratorState): Partial<GeneratorState> {
  return {
    hpId: s.hpId,
    hpDisplayName: s.hpDisplayName,
    hpRawUrl: s.hpRawUrl,
    source: s.source,
    presetName: s.presetName,
    targets: { ...s.targets },
    eqType: s.eqType,
    numFilters: s.numFilters,
    maxGain: s.maxGain,
    activeFormat: s.activeFormat,
    smoothFrac: s.smoothFrac,
    disabledFilterIdx: [...s.disabledFilterIdx],
  }
}

export function listPresets(): UserPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p: any): p is UserPreset =>
      p && typeof p.id === 'string' && typeof p.name === 'string' && p.state
    )
  } catch { return [] }
}

function writeAll(presets: UserPreset[]) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KEY, JSON.stringify(presets)) } catch {}
}

export function savePreset(name: string, state: GeneratorState): UserPreset {
  const trimmed = name.trim() || 'Untitled preset'
  const all = listPresets()
  const id = `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const entry: UserPreset = {
    id, name: trimmed, savedAt: Date.now(),
    state: snapshot(state),
  }
  writeAll([entry, ...all].slice(0, 50))  // cap at 50 to keep localStorage small
  return entry
}

export function renamePreset(id: string, name: string) {
  const all = listPresets()
  const next = all.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p)
  writeAll(next)
}

export function deletePreset(id: string) {
  writeAll(listPresets().filter(p => p.id !== id))
}

export function applyPreset(p: UserPreset, current: GeneratorState): GeneratorState {
  // Preserve volatile/UI fields from the current state; overlay the persisted
  // user inputs from the preset.
  return {
    ...current,
    ...p.state,
    targets: p.state.targets ? { ...p.state.targets } : current.targets,
    disabledFilterIdx: p.state.disabledFilterIdx ? [...p.state.disabledFilterIdx] : [],
    // these are runtime-only — always reset
    fetchedFr: null,
    frLoading: !!p.state.hpRawUrl,
    searchOpen: false,
    copied: false,
  }
}

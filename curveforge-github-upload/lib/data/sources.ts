import type { HpIndexEntry } from '../types'

// Index entries grouped by canonical headphone name → array of sources.
// AutoEQ has the same IEM measured by multiple rigs/reviewers — letting users
// switch between oratory1990 / crinacle / Rtings is one of the things that
// makes the AutoEQ site authoritative. We replicate that here.

export interface SourceEntry {
  source: string
  rawUrl: string
  id: string
}

// Lower is better. Drives default selection when an IEM has multiple sources.
export const SOURCE_PRIORITY: Record<string, number> = {
  'oratory1990': 0,
  'Super* Review': 1,
  'Super Review': 1,
  'ToneDeafMonk': 2,
  'crinacle': 3,
  'Crinacle': 3,
  'Innerfidelity': 4,
  'headphones.com': 5,
  'rtings': 6,
  'Rtings': 6,
  'freeryder05': 7,
  'HypetheSonics': 8,
  'DHRME': 9,
  'kr0mka': 10,
  'built-in': 99,
}

export function priorityOf(source: string): number {
  return SOURCE_PRIORITY[source] ?? 50
}

function canonicalKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

export interface SourcesByName {
  // canonical name → ordered list of available sources (best first)
  byName: Map<string, SourceEntry[]>
  // ID → canonical name (so we can find sibling sources from a selected entry)
  idToName: Map<string, string>
}

export function buildSourcesIndex(entries: HpIndexEntry[]): SourcesByName {
  const byName = new Map<string, SourceEntry[]>()
  const idToName = new Map<string, string>()
  for (const e of entries) {
    if (!e.rawUrl) continue
    const key = canonicalKey(e.name)
    idToName.set(e.id, key)
    const list = byName.get(key) ?? []
    list.push({ source: e.source, rawUrl: e.rawUrl, id: e.id })
    byName.set(key, list)
  }
  // Sort each group: best priority first, tie-break by source name
  byName.forEach(list => {
    list.sort((a: SourceEntry, b: SourceEntry) => {
      const dp = priorityOf(a.source) - priorityOf(b.source)
      return dp !== 0 ? dp : a.source.localeCompare(b.source)
    })
  })
  return { byName, idToName }
}

export function sourcesForId(idx: SourcesByName, id: string): SourceEntry[] {
  const name = idx.idToName.get(id)
  if (!name) return []
  return idx.byName.get(name) ?? []
}

import type { FrequencyPoint } from '../types'

export interface ParseResult {
  points: FrequencyPoint[]
  error: string | null
}

export function parseFrequencyCsv(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/)
  const points: FrequencyPoint[] = []
  const seen = new Map<number, number[]>()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue

    const parts = trimmed.split(/[,;\t\s]+/)
    if (parts.length < 2) continue

    // skip header rows
    const maybeFreq = parts[0].replace(/[^\d.eE+-]/g, '')
    const maybeResp = parts[1].replace(/[^\d.eE+-]/g, '')
    if (!maybeFreq || !maybeResp) continue

    const f = parseFloat(maybeFreq)
    const r = parseFloat(maybeResp)
    if (isNaN(f) || isNaN(r) || f <= 0) continue

    const existing = seen.get(f)
    if (existing) existing.push(r)
    else seen.set(f, [r])
  }

  seen.forEach((vals, f) => {
    const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length
    points.push({ frequency: f, response: avg })
  })

  points.sort((a, b) => a.frequency - b.frequency)

  if (points.length < 20) {
    return {
      points: [],
      error: `Only ${points.length} valid data points found. Need at least 20.`,
    }
  }

  return { points, error: null }
}

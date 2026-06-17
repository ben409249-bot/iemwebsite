import type { FitFilter } from '../dsp/optimizer'

export function formatGenericJson(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc)
  const obj = {
    preamp: parseFloat(preamp.toFixed(1)),
    filters: sorted.map(fl => ({
      type: fl.type,
      frequency: Math.round(fl.fc),
      gain: parseFloat(fl.gain.toFixed(2)),
      q: parseFloat(fl.q.toFixed(2)),
    })),
  }
  return JSON.stringify(obj, null, 2)
}

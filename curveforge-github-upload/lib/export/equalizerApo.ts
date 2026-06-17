import type { FitFilter } from '../dsp/optimizer'

function typeLabel(type: string, fc: number): string {
  if (type === 'LS') return 'LSC'
  if (type === 'HS') return 'HSC'
  return 'PK'
}

export function formatEqualizerApo(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc)
  const lines = [`Preamp: ${preamp.toFixed(1)} dB`]
  sorted.forEach((fl, i) => {
    lines.push(
      `Filter ${i + 1}: ON ${typeLabel(fl.type, fl.fc)} Fc ${Math.round(fl.fc)} Hz Gain ${fl.gain.toFixed(1)} dB Q ${fl.q.toFixed(2)}`
    )
  })
  return lines.join('\n')
}

export function formatPeace(filters: FitFilter[], preamp: number): string {
  return formatEqualizerApo(filters, preamp)
}

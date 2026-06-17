import type { FitFilter } from '../dsp/optimizer'

// Qudelix 5K supports up to 10 PEQ bands with Peak/LS/HS types.
// Format roughly matches what the Qudelix app accepts on paste / clipboard import.
export function formatQudelix5K(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc).slice(0, 10)
  const lines = [
    '# CurveLab — Qudelix 5K Parametric EQ',
    '# Paste into the Qudelix app PEQ tab (or use the import-from-clipboard option).',
    `# Preamp: ${preamp.toFixed(1)} dB`,
    '',
  ]
  sorted.forEach((fl, i) => {
    const type = fl.type === 'LS' ? 'LowShelf' : fl.type === 'HS' ? 'HighShelf' : 'Peak'
    lines.push(`Band ${i + 1}: ${type}  ${Math.round(fl.fc)} Hz  ${fl.gain.toFixed(1)} dB  Q ${fl.q.toFixed(2)}`)
  })
  return lines.join('\n')
}

// AutoEQ project "ParametricEQ.txt" format — identical to APO but with the
// AutoEQ header so it drops straight into the AutoEQ folder structure.
export function formatAutoEqParametric(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc)
  const lines = [`Preamp: ${preamp.toFixed(1)} dB`]
  sorted.forEach((fl, i) => {
    const t = fl.type === 'LS' ? 'LSC' : fl.type === 'HS' ? 'HSC' : 'PK'
    lines.push(`Filter ${i + 1}: ON ${t} Fc ${Math.round(fl.fc)} Hz Gain ${fl.gain.toFixed(1)} dB Q ${fl.q.toFixed(2)}`)
  })
  return lines.join('\n')
}

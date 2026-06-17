import type { FitFilter } from '../dsp/optimizer'

export function formatPoweramp(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc)
  const lines = [
    '# CurveLab — Poweramp-style manual entry',
    '# Note: This is a reference format. Manual entry required.',
    '',
    `Preamp: ${preamp.toFixed(1)} dB`,
  ]
  sorted.forEach((fl, i) => {
    const sign = fl.gain >= 0 ? '+' : ''
    lines.push(`${i + 1}. ${fl.type}  ${Math.round(fl.fc)} Hz  ${sign}${fl.gain.toFixed(1)} dB  Q ${fl.q.toFixed(2)}`)
  })
  return lines.join('\n')
}

export function formatPlainText(filters: FitFilter[], preamp: number): string {
  const sorted = [...filters].sort((a, b) => a.fc - b.fc)
  const lines = ['CurveLab Auto-PEQ Result', `Preamp: ${preamp.toFixed(1)} dB`]
  sorted.forEach((fl, i) => {
    const sign = fl.gain >= 0 ? '+' : ''
    lines.push(`${i + 1}. ${fl.type}  ${Math.round(fl.fc)} Hz  ${sign}${fl.gain.toFixed(1)} dB  Q ${fl.q.toFixed(2)}`)
  })
  return lines.join('\n')
}

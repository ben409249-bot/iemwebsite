import type { FitFilter } from '../dsp/optimizer'
import { sumFilterMagnitudesDb } from '../dsp/biquad'

const ISO_BANDS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
]

export function formatWaveletGraphicEq(filters: FitFilter[], preamp: number): string {
  const magnitudes = sumFilterMagnitudesDb(
    filters.map(f => ({ ...f, enabled: true })),
    ISO_BANDS
  )

  const bands = ISO_BANDS.map((f, i) => {
    const gain = magnitudes[i] + preamp
    return `${Math.round(f)} ${gain.toFixed(1)}`
  }).join('; ')

  return [
    '# CurveLab — Wavelet GraphicEQ Export',
    '# Paste into Wavelet > Custom Filter > Graphic EQ.',
    '',
    `GraphicEQ: ${bands}`,
  ].join('\n')
}

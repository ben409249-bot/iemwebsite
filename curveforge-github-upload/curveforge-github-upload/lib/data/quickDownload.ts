import { parseFrequencyCsv } from '../csv/parseFrequencyCsv'
import { makeFreqGrid, idxNearest, logInterpolate } from '../dsp/freqGrid'
import { smoothOctave } from '../dsp/smooth'
import { computeTargetCurve, PRESETS } from '../curves/targetCurve'
import { fitFilters } from '../dsp/optimizer'
import { sumFilterMagnitudesDb } from '../dsp/biquad'
import { formatEqualizerApo, formatPeace } from '../export/equalizerApo'
import { formatWaveletGraphicEq } from '../export/wavelet'
import { formatGenericJson } from '../export/genericJson'
import { formatPoweramp, formatPlainText } from '../export/poweramp'
import { formatQudelix5K, formatAutoEqParametric } from '../export/qudelix'
import type { OutputFormat } from '../types'

const F = makeFreqGrid(170)

function normalizeAt1k(curve: number[]): number[] {
  const i1k = idxNearest(F, 1000)
  const ref = curve[i1k]
  return curve.map(v => v - ref)
}

export interface QuickFitOpts {
  presetName?: string
  numFilters?: number
  maxGain?: number
  smoothFrac?: 0 | 12 | 24
}

export interface QuickFitResult {
  text: string
  preamp: number
  filterCount: number
}

const FORMAT_EXT: Record<OutputFormat, string> = {
  'equalizer-apo': 'GraphicEq.txt',
  'peace': 'Peace.txt',
  'wavelet-graphic-eq': 'WaveletGraphicEq.txt',
  'poweramp': 'Poweramp.txt',
  'generic-json': 'preset.json',
  'plain-text': 'preset.txt',
  'qudelix-5k': 'Qudelix5K.txt',
  'autoeq': 'ParametricEQ.txt',
}

export function formatExt(fmt: OutputFormat) { return FORMAT_EXT[fmt] }

export async function fetchAndFit(rawUrl: string, format: OutputFormat, opts: QuickFitOpts = {}): Promise<QuickFitResult> {
  const presetName = opts.presetName ?? 'Harman IE 2019'
  const numFilters = opts.numFilters ?? 8
  const maxGain = opts.maxGain ?? 6
  const smoothFrac = opts.smoothFrac ?? 12

  const text = await fetch(rawUrl).then(r => r.text())
  const { points, error } = parseFrequencyCsv(text)
  if (error || points.length === 0) throw new Error(error || 'No data points parsed')

  const srcF = points.map(p => p.frequency)
  const srcV = points.map(p => p.response)
  const rawRaw = logInterpolate(srcF, srcV, F)
  const rawSmoothed = smoothFrac > 0 ? smoothOctave(F, rawRaw, smoothFrac) : rawRaw

  const knobs = PRESETS[presetName] ?? PRESETS['Harman IE 2019']
  const tgtRaw = computeTargetCurve(knobs, F)

  const rawN = normalizeAt1k(rawSmoothed)
  const targetN = normalizeAt1k(tgtRaw)
  const err = targetN.map((v, i) => v - rawN[i])

  const filters = fitFilters(F, err, numFilters, maxGain)
  const sumEQ = sumFilterMagnitudesDb(filters.map(f => ({ ...f, enabled: true })), F)
  const maxPositive = Math.max(0, ...sumEQ)
  const preamp = Math.min(0, parseFloat((-maxPositive - 1).toFixed(1)))

  let body: string
  switch (format) {
    case 'equalizer-apo': body = formatEqualizerApo(filters, preamp); break
    case 'peace': body = formatPeace(filters, preamp); break
    case 'wavelet-graphic-eq': body = formatWaveletGraphicEq(filters, preamp); break
    case 'generic-json': body = formatGenericJson(filters, preamp); break
    case 'poweramp': body = formatPoweramp(filters, preamp); break
    case 'plain-text': body = formatPlainText(filters, preamp); break
    case 'qudelix-5k': body = formatQudelix5K(filters, preamp); break
    case 'autoeq': body = formatAutoEqParametric(filters, preamp); break
    default: body = formatEqualizerApo(filters, preamp)
  }
  return { text: body, preamp, filterCount: filters.length }
}

export function saveText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9 \-_\.()]+/gi, '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

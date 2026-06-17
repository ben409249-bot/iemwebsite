'use client'
import { memo, useState } from 'react'
import GlassCard from './GlassCard'
import ChipButton from './ChipButton'
import type { FitFilter } from '../lib/dsp/optimizer'
import type { OutputFormat } from '../lib/types'
import { formatEqualizerApo, formatPeace } from '../lib/export/equalizerApo'
import { formatWaveletGraphicEq } from '../lib/export/wavelet'
import { formatGenericJson } from '../lib/export/genericJson'
import { formatPoweramp, formatPlainText } from '../lib/export/poweramp'
import { formatQudelix5K, formatAutoEqParametric } from '../lib/export/qudelix'

interface Props {
  filters: FitFilter[]
  preamp: number
  activeFormat: OutputFormat
  onFormatChange: (f: OutputFormat) => void
}

const FORMATS: Array<{ key: OutputFormat; label: string }> = [
  { key: 'equalizer-apo', label: 'Equalizer APO' },
  { key: 'wavelet-graphic-eq', label: 'Wavelet' },
  { key: 'poweramp', label: 'Poweramp' },
  { key: 'qudelix-5k', label: 'Qudelix 5K' },
  { key: 'autoeq', label: 'AutoEQ' },
  { key: 'peace', label: 'Peace' },
  { key: 'generic-json', label: 'Generic JSON' },
  { key: 'plain-text', label: 'Plain Text' },
]

function buildExport(filters: FitFilter[], preamp: number, format: OutputFormat): string {
  switch (format) {
    case 'equalizer-apo': return formatEqualizerApo(filters, preamp)
    case 'peace': return formatPeace(filters, preamp)
    case 'wavelet-graphic-eq': return formatWaveletGraphicEq(filters, preamp)
    case 'generic-json': return formatGenericJson(filters, preamp)
    case 'poweramp': return formatPoweramp(filters, preamp)
    case 'plain-text': return formatPlainText(filters, preamp)
    case 'qudelix-5k': return formatQudelix5K(filters, preamp)
    case 'autoeq': return formatAutoEqParametric(filters, preamp)
    default: return formatEqualizerApo(filters, preamp)
  }
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

function ExportCardImpl({ filters, preamp, activeFormat, onFormatChange }: Props) {
  const [copied, setCopied] = useState(false)
  const exportText = buildExport(filters, preamp, activeFormat)

  function handleCopy() {
    try { navigator.clipboard.writeText(exportText) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleDownload() {
    const ext = FORMAT_EXT[activeFormat] ?? 'preset.txt'
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CurveLab_${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  return (
    <GlassCard animDelay="0.3s" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
        Export
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FORMATS.map(f => (
          <ChipButton
            key={f.key}
            label={f.label}
            active={activeFormat === f.key}
            onClick={() => onFormatChange(f.key)}
            gridCol
          />
        ))}
      </div>

      <pre style={{
        margin: 0, padding: 14, borderRadius: 13,
        background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, lineHeight: 1.65,
        color: 'rgba(255,255,255,0.78)', maxHeight: 148, overflow: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        width: '100%', minWidth: 0, boxSizing: 'border-box',
      }}>
        {exportText || '— Generate filters first —'}
      </pre>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '12px 18px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(180deg,#6a9bff,#a06bf0)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(108,120,240,0.4)',
            transition: 'filter .18s, transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
        >
          {copied ? 'Copied ✓' : 'Copy filters'}
        </button>
        <button
          onClick={handleDownload}
          title={`Download as ${FORMAT_EXT[activeFormat] ?? 'preset.txt'}`}
          style={{
            padding: '12px 14px', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background .15s, border-color .15s, transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
        >
          Download
        </button>
      </div>
    </GlassCard>
  )
}

export default memo(ExportCardImpl)

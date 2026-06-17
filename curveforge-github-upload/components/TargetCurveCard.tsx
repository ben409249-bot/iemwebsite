'use client'
import { useRef, useState } from 'react'
import GlassCard from './GlassCard'
import GlassSlider from './GlassSlider'
import ChipButton from './ChipButton'
import { PRESETS, PRESET_META, type PresetFamily } from '../lib/curves/targetCurve'
import { parseFrequencyCsv } from '../lib/csv/parseFrequencyCsv'
import type { GeneratorState } from '../lib/types'
import { Upload } from 'lucide-react'

interface Props {
  state: GeneratorState
  onChange: (partial: Partial<GeneratorState>) => void
}

const SLIDER_DEFS = [
  { key: 'bass' as const, label: 'Bass', min: 0, max: 12, step: 0.1 },
  { key: 'ear' as const, label: 'Ear Gain', min: 0, max: 6, step: 0.1 },
  { key: 'treble' as const, label: 'Treble', min: -6, max: 6, step: 0.1 },
  { key: 'tilt' as const, label: 'Tilt', min: -4, max: 4, step: 0.1 },
]

function fmt(key: string, val: number): string {
  if (key === 'treble' || key === 'tilt') return (val >= 0 ? '+' : '') + val.toFixed(1)
  return val.toFixed(1)
}

export default function TargetCurveCard({ state, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleFile(file: File) {
    file.text().then(text => {
      const { points, error } = parseFrequencyCsv(text)
      if (error) { setUploadError(error); onChange({ uploadedTarget: null }) }
      else { setUploadError(null); onChange({ uploadedTarget: points, presetName: 'Custom' }) }
    })
  }

  return (
    <GlassCard animDelay="0.15s" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 15, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
          Target Curve
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#c4b6ff', padding: '4px 10px', borderRadius: 999, background: 'rgba(123,140,255,0.12)', border: '1px solid rgba(123,140,255,0.25)' }}>
          {state.presetName}
        </div>
      </div>

      {/* preset chips grouped by family */}
      {!state.uploadedTarget && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['IEM', 'Over-ear', 'Universal'] as PresetFamily[]).map(family => {
            const names = Object.keys(PRESETS).filter(n => PRESET_META[n]?.family === family)
            if (!names.length) return null
            return (
              <div key={family} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
                  {family}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {names.map(name => (
                    <ChipButton
                      key={name}
                      label={name}
                      active={state.presetName === name}
                      onClick={() => onChange({ presetName: name, targets: { ...PRESETS[name] } })}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* sliders */}
      {!state.uploadedTarget && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 2 }}>
          {SLIDER_DEFS.map(sl => (
            <GlassSlider
              key={sl.key}
              label={sl.label}
              value={state.targets[sl.key]}
              min={sl.min}
              max={sl.max}
              step={sl.step}
              display={fmt(sl.key, state.targets[sl.key])}
              suffix=" dB"
              onChange={v => onChange({
                presetName: 'Custom',
                targets: { ...state.targets, [sl.key]: v },
              })}
            />
          ))}
        </div>
      )}

      {/* upload zone */}
      <div
        onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: 12, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'border-color .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(160,107,240,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
      >
        <Upload size={14} color="rgba(255,255,255,0.4)" />
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
          {state.uploadedTarget ? 'Replace target CSV' : 'Upload custom target CSV'}
        </span>
        <input ref={inputRef} type="file" accept=".csv,.txt" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {uploadError && <div style={{ fontSize: 12, color: '#ff8a8a' }}>{uploadError}</div>}
      {state.uploadedTarget && (
        <button
          onClick={() => { onChange({ uploadedTarget: null, presetName: 'Harman 2019', targets: { ...PRESETS['Harman 2019'] } }); setUploadError(null) }}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          ← Use preset target
        </button>
      )}
    </GlassCard>
  )
}

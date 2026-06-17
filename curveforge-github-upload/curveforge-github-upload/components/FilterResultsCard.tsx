'use client'
import { memo } from 'react'
import GlassCard from './GlassCard'
import SegmentedControl from './SegmentedControl'
import type { FitFilter } from '../lib/dsp/optimizer'
import type { GeneratorState } from '../lib/types'
import { idxNearest } from '../lib/dsp/freqGrid'
import { explainFilter } from '../lib/dsp/filterExplain'

interface Props {
  state: GeneratorState
  filters: FitFilter[]
  sumEQ: number[]
  F: number[]
  onChange: (partial: Partial<GeneratorState>) => void
}

const TABS = [
  { key: 'parametric' as const, label: 'Parametric' },
  { key: 'graphic' as const, label: 'Graphic' },
  { key: 'fixed' as const, label: 'Fixed Band' },
]

function fcFmt(f: number): string {
  if (f >= 10000) return (f / 1000).toFixed(1) + 'k'
  if (f >= 1000) return (f / 1000).toFixed(2) + 'k'
  return Math.round(f) + ''
}
function sign(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(1) }

const GRAPHIC_BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const GRAPHIC_LABELS = ['31', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k']
const FIXED_BANDS = [62, 160, 400, 1000, 2500, 6300, 16000]
const FIXED_LABELS = ['62', '160', '400', '1k', '2.5k', '6.3k', '16k']

function FilterResultsCardImpl({ state, filters, sumEQ, F, onChange }: Props) {
  const isParametric = state.eqType === 'parametric'
  const bandFreqs = state.eqType === 'fixed' ? FIXED_BANDS : GRAPHIC_BANDS
  const bandLabels = state.eqType === 'fixed' ? FIXED_LABELS : GRAPHIC_LABELS

  const disabled = new Set(state.disabledFilterIdx)
  const toggleFilter = (idx: number) => {
    const next = new Set(disabled)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    onChange({ disabledFilterIdx: Array.from(next) })
  }
  const enabledCount = filters.length - disabled.size

  const bands = bandFreqs.map((bf, i) => {
    const g = sumEQ[idxNearest(F, bf)] ?? 0
    const mag = Math.min(1, Math.abs(g) / 12)
    return { label: bandLabels[i], gain: g, mag }
  })

  return (
    <GlassCard animDelay="0.2s" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SegmentedControl options={TABS} value={state.eqType} onChange={v => onChange({ eqType: v })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
            {isParametric && disabled.size > 0
              ? <>{enabledCount}/{filters.length} on</>
              : <>{filters.length} filters</>
            }
          </div>
          {isParametric && disabled.size > 0 && (
            <button
              onClick={() => onChange({ disabledFilterIdx: [] })}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}
            >
              enable all
            </button>
          )}
          {isParametric && Object.keys(state.filterGainTrims).length > 0 && (
            <button
              onClick={() => onChange({ filterGainTrims: {} })}
              title="Discard your gain drags and restore the optimizer's values"
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}
            >
              reset trims
            </button>
          )}
        </div>
      </div>

      {isParametric && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '54px 1fr 1fr 64px 1.7fr', gap: 8,
            padding: '0 12px 8px',
            fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span>Type</span>
            <span style={{ textAlign: 'right' }}>Freq</span>
            <span style={{ textAlign: 'right' }}>Gain</span>
            <span style={{ textAlign: 'right' }}>Q</span>
            <span style={{ paddingLeft: 12, color: 'rgba(255,255,255,0.32)' }}>Why</span>
          </div>
          {filters.map((fl, i) => {
            const off = disabled.has(i)
            return (
              <div
                key={i}
                className="filter-row-in"
                onClick={() => toggleFilter(i)}
                title={off ? 'Click to enable this filter' : 'Click to mute this filter (A/B test)'}
                style={{
                  display: 'grid', gridTemplateColumns: '54px 1fr 1fr 64px 1.7fr', gap: 8, alignItems: 'center',
                  padding: '9px 12px', borderRadius: 10, transition: 'background .15s, opacity .15s',
                  cursor: 'pointer', opacity: off ? 0.42 : 1,
                  animationDelay: `${i * 0.04}s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = off ? 'rgba(255,255,255,0.04)' : 'rgba(123,140,255,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: off ? 'rgba(255,255,255,0.4)' : '#bda7ff', fontFamily: 'ui-monospace,Menlo,monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: off ? 'rgba(255,255,255,0.2)' : '#bda7ff',
                    boxShadow: off ? 'none' : '0 0 6px rgba(189,167,255,0.55)',
                  }} />
                  {fl.type === 'LS' ? 'LSC' : fl.type === 'HS' ? 'HSC' : 'PK'}
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, color: 'rgba(255,255,255,0.85)', textDecoration: off ? 'line-through' : 'none' }}>
                  {fcFmt(fl.fc)}<span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}> Hz</span>
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, textDecoration: off ? 'line-through' : 'none' }}>
                  {sign(fl.gain)}<span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}> dB</span>
                </span>
                <span style={{ textAlign: 'right', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: off ? 'line-through' : 'none' }}>
                  {fl.q.toFixed(2)}
                </span>
                <span style={{
                  paddingLeft: 12, fontSize: 11.5, color: 'rgba(255,255,255,0.5)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={explainFilter(fl)}>
                  {explainFilter(fl)}
                </span>
              </div>
            )
          })}
          {filters.length === 0 && (
            <div style={{ padding: '20px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
              No filters generated yet.
            </div>
          )}
        </div>
      )}

      {!isParametric && (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, padding: '8px 4px 0' }}>
          {bands.map((b, i) => {
            const up = b.gain >= 0
            const h = b.mag * 46
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: '100%', height: 158 }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(255,255,255,0.14)' }} />
                  <div style={{
                    position: 'absolute', left: '16%', right: '16%',
                    ...(up ? { bottom: '50%' } : { top: '50%' }),
                    height: `${h}%`,
                    borderRadius: up ? '5px 5px 0 0' : '0 0 5px 5px',
                    background: up
                      ? 'linear-gradient(180deg,#9bbcff,#5b9bff)'
                      : 'linear-gradient(180deg,#b07cf5,#9b6bf0)',
                    boxShadow: up
                      ? '0 0 14px rgba(91,155,255,0.5)'
                      : '0 0 14px rgba(176,124,245,0.5)',
                    transformOrigin: up ? 'bottom' : 'top',
                    transition: 'height .3s cubic-bezier(.4,0,.2,1)',
                    animation: `barGrow .5s ${i * 0.035}s cubic-bezier(.34,1.4,.64,1) both`,
                  }} />
                </div>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
                  {b.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

export default memo(FilterResultsCardImpl)

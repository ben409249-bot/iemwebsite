'use client'
import { useState, useMemo, useEffect, useDeferredValue } from 'react'
import GlowBlobs from '../../components/GlowBlobs'
import AppHeader from '../../components/AppHeader'
import GlassCard from '../../components/GlassCard'
import FrequencyGraph from '../../components/FrequencyGraph'
import MeasurementCard from '../../components/MeasurementCard'
import TargetCurveCard from '../../components/TargetCurveCard'
import FilterResultsCard from '../../components/FilterResultsCard'
import EqualizerSettingsCard from '../../components/EqualizerSettingsCard'
import ExportCard from '../../components/ExportCard'
import AudioPreviewCard from '../../components/AudioPreviewCard'
import { deriveAll } from '../../lib/dsp/deriveAll'
import { HEADPHONES } from '../../lib/data/headphones'
import { parseFrequencyCsv } from '../../lib/csv/parseFrequencyCsv'
import type { GeneratorState } from '../../lib/types'
import { PRESETS } from '../../lib/curves/targetCurve'
import { formatEqualizerApo } from '../../lib/export/equalizerApo'
import { encodeState, decodeState, readHash, writeHash, shareUrl } from '../../lib/state/permalink'

const DEFAULT_STATE: GeneratorState = {
  hpId: 'hd600',
  hpDisplayName: 'Sennheiser HD 600',
  hpRawUrl: '',
  fetchedFr: null,
  frLoading: false,
  query: '',
  searchOpen: false,
  typeFilter: 'All',
  source: 'oratory1990',
  presetName: 'Harman 2019',
  targets: { ...PRESETS['Harman 2019'] },
  eqType: 'parametric',
  numFilters: 8,
  maxGain: 6,
  showRaw: true,
  showTarget: true,
  showCorrected: true,
  activeFormat: 'equalizer-apo',
  copied: false,
  uploadedMeasurement: null,
  uploadedTarget: null,
  disabledFilterIdx: [],
  smoothFrac: 12,
  filterGainTrims: {},
}

export default function GeneratorPage() {
  const [state, setState] = useState<GeneratorState>(DEFAULT_STATE)
  const [headerCopied, setHeaderCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  function onChange(partial: Partial<GeneratorState>) {
    setState(prev => ({ ...prev, ...partial }))
  }

  // Hydrate from URL hash on first mount
  useEffect(() => {
    const restored = decodeState(readHash())
    if (restored) setState(prev => ({ ...prev, ...restored }))
    setHydrated(true)
  }, [])

  // Stale-index guard: filter indices refer to a specific generated filter
  // set. Reset disables AND trims when the underlying IEM or filter count changes.
  useEffect(() => {
    setState(prev => {
      const hasState = prev.disabledFilterIdx.length || Object.keys(prev.filterGainTrims).length
      return hasState ? { ...prev, disabledFilterIdx: [], filterGainTrims: {} } : prev
    })
  }, [state.hpId, state.numFilters, state.uploadedMeasurement])

  // Mirror state back into the URL hash (debounced) once hydrated
  useEffect(() => {
    if (!hydrated) return
    const id = setTimeout(() => writeHash(encodeState(state)), 200)
    return () => clearTimeout(id)
  }, [state, hydrated])

  function handleShare() {
    const url = shareUrl(encodeState(state))
    try { navigator.clipboard.writeText(url) } catch {}
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 1500)
  }

  // Fetch real FR data when a headphone with a rawUrl is selected
  useEffect(() => {
    if (!state.hpRawUrl) return
    let cancelled = false
    onChange({ frLoading: true })
    fetch(state.hpRawUrl)
      .then(r => r.text())
      .then(text => {
        if (cancelled) return
        const { points } = parseFrequencyCsv(text)
        onChange({ fetchedFr: points ?? null, frLoading: false })
      })
      .catch(() => { if (!cancelled) onChange({ fetchedFr: null, frLoading: false }) })
    return () => { cancelled = true }
  }, [state.hpRawUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Defer the heavy DSP fit so slider drags stay responsive: React will
  // interrupt an in-flight derivation if the user keeps moving the knob.
  const deferredState = useDeferredValue(state)
  const derived = useMemo(() => deriveAll(deferredState), [
    deferredState.hpId,
    deferredState.targets.bass,
    deferredState.targets.ear,
    deferredState.targets.treble,
    deferredState.targets.tilt,
    deferredState.numFilters,
    deferredState.maxGain,
    deferredState.uploadedMeasurement,
    deferredState.uploadedTarget,
    deferredState.source,
    deferredState.fetchedFr,
    deferredState.disabledFilterIdx,
    deferredState.smoothFrac,
    deferredState.filterGainTrims,
  ])
  const isStale = deferredState !== state

  const hp = HEADPHONES.find(h => h.id === state.hpId) ?? HEADPHONES[0]

  function handleHeaderCopy() {
    try { navigator.clipboard.writeText(formatEqualizerApo(derived.filters, derived.preamp)) } catch {}
    setHeaderCopied(true)
    setTimeout(() => setHeaderCopied(false), 1500)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'radial-gradient(1200px 760px at 16% -8%, #18203f 0%, transparent 55%), radial-gradient(1000px 720px at 96% 6%, #2c1644 0%, transparent 52%), linear-gradient(180deg,#08080f 0%,#06060c 55%,#080510 100%)' }}>
      <GlowBlobs />
      <div style={{ position: 'relative', maxWidth: 1340, margin: '0 auto', padding: '24px 24px 44px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <AppHeader
          hpName={state.uploadedMeasurement ? 'Custom Upload' : (state.hpDisplayName || hp.name)}
          matchPct={derived.matchPct}
          prefScore={derived.preferenceScore.total}
          onCopy={handleHeaderCopy}
          copied={headerCopied}
          onShare={handleShare}
          shareCopied={shareCopied}
          currentState={state}
          onApplyPreset={setState}
        />

        {/* Main grid: left = graph + filters, right = all controls */}
        <div className="generator-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.62fr) minmax(0,1fr)', gap: 18, alignItems: 'stretch', position: 'relative', zIndex: 2 }}>

          {/* Left column: graph card then filter table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <GlassCard animDelay="0.05s" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* graph header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
                    Frequency Response
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: '-0.01em', marginTop: 3 }}>
                    {state.uploadedMeasurement ? 'Custom Upload' : (state.hpDisplayName || hp.name)}
                    {state.frLoading
                      ? <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> · loading…</span>
                      : <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> · {state.source}</span>
                    }
                    {isStale && !state.frLoading && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontStyle: 'italic' }}> · refining…</span>
                    )}
                  </div>
                </div>
                {/* legend toggles */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => onChange({ showRaw: !state.showRaw })}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', background: 'none', border: 'none', opacity: state.showRaw ? 1 : 0.38, transition: 'opacity .2s, transform .15s' }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff8a8a', boxShadow: '0 0 8px #ff8a8a', flexShrink: 0, display: 'inline-block' }} />
                    Raw
                  </button>
                  <button
                    onClick={() => onChange({ showTarget: !state.showTarget })}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', background: 'none', border: 'none', opacity: state.showTarget ? 1 : 0.38, transition: 'opacity .2s, transform .15s' }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', flexShrink: 0, display: 'inline-block' }} />
                    Target
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.78)' }}>
                    <span className="pulse-dot-slow" style={{ width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(90deg,#5b9bff,#c07cf5)', boxShadow: '0 0 8px rgba(123,140,255,0.7)', flexShrink: 0, display: 'inline-block' }} />
                    Equalized
                  </div>
                </div>
              </div>

              {/* plot */}
              <div style={{ width: '100%' }}>
                <FrequencyGraph
                  F={derived.F}
                  rawN={derived.rawN}
                  targetN={derived.targetN}
                  sumEQ={derived.sumEQ}
                  corrected={derived.corrected}
                  showRaw={state.showRaw}
                  showTarget={state.showTarget}
                  showCorrected={state.showCorrected}
                  filters={derived.filters}
                  filterTrims={state.filterGainTrims}
                  disabledIdx={state.disabledFilterIdx}
                  maxGain={state.maxGain}
                  onTrim={(idx, delta) => onChange({
                    filterGainTrims: { ...state.filterGainTrims, [idx]: delta },
                  })}
                />
              </div>

              {/* stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Error before', value: `${derived.beforeRmse.toFixed(2)} dB`, color: '#ff8a8a' },
                  { label: 'Error after', value: `${derived.afterRmse.toFixed(2)} dB`, color: '#6ea8ff' },
                  { label: 'Match', value: `${derived.matchPct}%`, color: '#4ade80', large: true },
                ].map(m => (
                  <div key={m.label} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: m.large ? 22 : 16, fontWeight: 700, fontFamily: 'ui-monospace,Menlo,monospace', color: m.color, letterSpacing: '-0.02em' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Tonality sub-scores — what's wrong about the raw IEM, per band */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {([
                  { key: 'bass',    label: 'Bass',     v: derived.preferenceScore.bass    },
                  { key: 'mids',    label: 'Mids',     v: derived.preferenceScore.mids    },
                  { key: 'earGain', label: 'Ear Gain', v: derived.preferenceScore.earGain },
                  { key: 'treble',  label: 'Treble',   v: derived.preferenceScore.treble  },
                ]).map(s => {
                  const color = s.v >= 80 ? '#4ade80' : s.v >= 60 ? '#a3e635' : s.v >= 40 ? '#facc15' : '#ff8a8a'
                  return (
                    <div key={s.key} style={{ padding: '9px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace,Menlo,monospace', color }}>{s.v}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.v}%`, background: color, borderRadius: 2, transition: 'width .25s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCard>

            <FilterResultsCard
              state={state}
              filters={derived.filters}
              sumEQ={derived.sumEQ}
              F={derived.F}
              onChange={onChange}
            />
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
              <MeasurementCard state={state} onChange={onChange} />
            </div>
            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
              <TargetCurveCard state={state} onChange={onChange} />
            </div>
          </div>
        </div>

        {/* Bottom row: EQ settings + Export side by side */}
        <div className="generator-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18, alignItems: 'stretch' }}>
          <ExportCard
            filters={derived.filters}
            preamp={derived.preamp}
            activeFormat={state.activeFormat}
            onFormatChange={f => onChange({ activeFormat: f })}
          />
          <EqualizerSettingsCard
            state={state}
            preamp={derived.preamp}
            afterRmse={derived.afterRmse}
            actualFilterCount={derived.filters.length}
            sumEQPeak={derived.sumEQ.reduce((m, v) => Math.max(m, Math.abs(v)), 0)}
            onChange={onChange}
          />
        </div>

        <AudioPreviewCard filters={derived.filters} preamp={derived.preamp} />

        {/* warnings */}
        <GlassCard animDelay="0.35s" style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', marginBottom: 10 }}>
            Notes & Limitations
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
            {[
              'This is a starting point, not a perfect correction.',
              'Measurements vary by rig, insertion depth, coupler, and your ears.',
              'Avoid large boosts for narrow dips above 8 kHz.',
              'Always adjust by ear after applying.',
            ].map(note => (
              <div key={note} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span> {note}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

'use client'
import GlassCard from './GlassCard'
import GlassSlider from './GlassSlider'
import type { GeneratorState } from '../lib/types'

interface Props {
  state: GeneratorState
  preamp: number
  afterRmse: number
  actualFilterCount: number
  sumEQPeak: number
  onChange: (partial: Partial<GeneratorState>) => void
}

interface Hint { kind: 'more' | 'cap' | 'plenty'; text: string; action?: () => void; actionLabel?: string }

function buildHints(state: GeneratorState, afterRmse: number, actualFilterCount: number, sumEQPeak: number, onChange: Props['onChange']): Hint[] {
  const out: Hint[] = []
  // "could use more bands": optimizer used everything we gave it but residual error is still large
  if (afterRmse > 1.5 && actualFilterCount >= state.numFilters && state.numFilters < 10) {
    out.push({
      kind: 'more',
      text: `Residual error ${afterRmse.toFixed(2)} dB — more filter bands could tighten this.`,
      actionLabel: `Use ${Math.min(10, state.numFilters + 2)} bands`,
      action: () => onChange({ numFilters: Math.min(10, state.numFilters + 2) }),
    })
  }
  // "hitting the gain cap": peak EQ very close to the max
  if (sumEQPeak >= state.maxGain - 0.4 && state.maxGain < 12) {
    out.push({
      kind: 'cap',
      text: `Bands hit the ±${state.maxGain.toFixed(1)} dB cap — raise the limit for a fuller correction.`,
      actionLabel: `Raise to ±${Math.min(12, state.maxGain + 2).toFixed(0)} dB`,
      action: () => onChange({ maxGain: Math.min(12, state.maxGain + 2) }),
    })
  }
  // "over-allocated": optimizer pruned several filters as too small to matter
  if (state.numFilters - actualFilterCount >= 2 && state.numFilters > 4) {
    out.push({
      kind: 'plenty',
      text: `Only ${actualFilterCount} of ${state.numFilters} bands needed — feel free to dial down.`,
      actionLabel: `Drop to ${actualFilterCount}`,
      action: () => onChange({ numFilters: actualFilterCount }),
    })
  }
  return out
}

export default function EqualizerSettingsCard({ state, preamp, afterRmse, actualFilterCount, sumEQPeak, onChange }: Props) {
  const hints = buildHints(state, afterRmse, actualFilterCount, sumEQPeak, onChange)
  return (
    <GlassCard animDelay="0.25s" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 15, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
          Equalizer
        </div>
        <div style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: 'rgba(91,155,255,0.12)', border: '1px solid rgba(91,155,255,0.25)', color: '#9bbcff', fontWeight: 600 }}>
          Parametric
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GlassSlider
          label="Filter bands"
          value={state.numFilters}
          min={3} max={10} step={1}
          display={`${Math.round(state.numFilters)} bands`}
          onChange={v => onChange({ numFilters: Math.round(v) })}
        />
        <GlassSlider
          label="Max boost / cut"
          value={state.maxGain}
          min={3} max={12} step={0.5}
          display={`± ${state.maxGain.toFixed(1)}`}
          suffix=" dB"
          onChange={v => onChange({ maxGain: v })}
        />
      </div>

      {/* hints — only render when something actionable shows up */}
      {hints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hints.map((h, i) => {
            const accent = h.kind === 'cap' ? '#facc15' : h.kind === 'more' ? '#9bbcff' : 'rgba(255,255,255,0.6)'
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 11px', borderRadius: 10,
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 6px ${accent}` }} />
                <span style={{ flex: 1, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{h.text}</span>
                {h.action && (
                  <button onClick={h.action} style={{
                    fontSize: 11, fontWeight: 600, color: accent, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>{h.actionLabel}</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* preamp readout */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 15px', borderRadius: 14,
        background: 'rgba(123,140,255,0.08)', border: '1px solid rgba(123,140,255,0.18)',
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Preamp gain</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>prevents clipping</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: '-0.02em' }}>
          {preamp.toFixed(1)} dB
        </div>
      </div>

      {/* band visualizer */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Band allocation</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 36 }}>
          {Array.from({ length: Math.round(state.numFilters) }, (_, i) => {
            const h = 28 - Math.abs(i - Math.round(state.numFilters) / 2 + 0.5) * (20 / Math.round(state.numFilters))
            return (
              <div key={i} style={{
                flex: 1, borderRadius: 3,
                height: Math.max(8, h),
                background: `linear-gradient(180deg, rgba(91,155,255,${0.5 - i * 0.03}), rgba(160,100,240,0.3))`,
                transition: 'height 0.3s ease',
              }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
          <span>20Hz</span><span>1kHz</span><span>20kHz</span>
        </div>
      </div>
    </GlassCard>
  )
}

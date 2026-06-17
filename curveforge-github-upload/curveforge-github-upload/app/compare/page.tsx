'use client'
import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import Link from 'next/link'
import GlowBlobs from '../../components/GlowBlobs'
import GlassCard from '../../components/GlassCard'
import TopNav from '../../components/TopNav'
import CompareGraph, { type CompareCurve } from '../../components/CompareGraph'
import { parseFrequencyCsv } from '../../lib/csv/parseFrequencyCsv'
import { makeFreqGrid, idxNearest, logInterpolate } from '../../lib/dsp/freqGrid'
import { computePreferenceScore } from '../../lib/dsp/preferenceScore'
import { computeTargetCurve, PRESETS, PRESET_META, type PresetFamily } from '../../lib/curves/targetCurve'
import { buildSourcesIndex, sourcesForId, priorityOf } from '../../lib/data/sources'
import type { HpIndexEntry } from '../../lib/types'

const SLOT_COLORS = ['#5b9bff', '#ff8a8a', '#a3e635', '#facc15', '#c07cf5']
const F = makeFreqGrid(170)

interface Slot {
  entry: HpIndexEntry | null
  values: number[] | null
  loading: boolean
  error: string | null
}

function emptySlot(): Slot { return { entry: null, values: null, loading: false, error: null } }

function normalizeAt1k(curve: number[]): number[] {
  const i1k = idxNearest(F, 1000)
  const ref = curve[i1k]
  return curve.map(v => v - ref)
}

export default function ComparePage() {
  const [index, setIndex] = useState<HpIndexEntry[]>([])
  const [slots, setSlots] = useState<Slot[]>([emptySlot(), emptySlot(), emptySlot(), emptySlot()])
  const [query, setQuery] = useState('')
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(0)
  const [presetName, setPresetName] = useState('Harman IE 2019')
  const [showTarget, setShowTarget] = useState(true)

  useEffect(() => {
    fetch('/hp-index.json').then(r => r.json()).then(setIndex).catch(() => {})
  }, [])

  const dedupedNames = useMemo(() => {
    const best = new Map<string, HpIndexEntry>()
    for (const e of index) {
      const k = e.name.toLowerCase().trim()
      const ex = best.get(k)
      if (!ex || priorityOf(e.source) < priorityOf(ex.source)) best.set(k, e)
    }
    return Array.from(best.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [index])

  const sourcesIdx = useMemo(() => buildSourcesIndex(index), [index])

  const deferredQuery = useDeferredValue(query)
  const searchResults = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return dedupedNames.slice(0, 14)
    return dedupedNames
      .filter(e => (e.name + ' ' + e.brand).toLowerCase().includes(q))
      .slice(0, 14)
  }, [deferredQuery, dedupedNames])

  async function loadIntoSlot(entry: HpIndexEntry, slotIdx: number) {
    setSlots(prev => prev.map((s, i) => i === slotIdx ? { entry, values: null, loading: true, error: null } : s))
    try {
      const res = await fetch(entry.rawUrl)
      const text = await res.text()
      const { points, error } = parseFrequencyCsv(text)
      if (error || points.length === 0) {
        setSlots(prev => prev.map((s, i) => i === slotIdx ? { entry, values: null, loading: false, error: error || 'No data' } : s))
        return
      }
      const srcF = points.map(p => p.frequency)
      const srcV = points.map(p => p.response)
      const interp = logInterpolate(srcF, srcV, F)
      const values = normalizeAt1k(interp)
      setSlots(prev => prev.map((s, i) => i === slotIdx ? { entry, values, loading: false, error: null } : s))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSlots(prev => prev.map((s, i) => i === slotIdx ? { entry, values: null, loading: false, error: msg } : s))
    }
  }

  function clearSlot(idx: number) {
    setSlots(prev => prev.map((s, i) => i === idx ? emptySlot() : s))
  }

  function swapSource(slotIdx: number, sourceId: string) {
    const sib = index.find(e => e.id === sourceId)
    if (sib) loadIntoSlot(sib, slotIdx)
  }

  const targetKnobs = PRESETS[presetName] ?? PRESETS['Harman IE 2019']
  const targetValues = useMemo(() => normalizeAt1k(computeTargetCurve(targetKnobs, F)), [presetName])

  const curves: CompareCurve[] = slots.map((s, i) => ({
    id: s.entry ? `${s.entry.id}-${i}` : `empty-${i}`,
    name: s.entry?.name ?? '',
    source: s.entry?.source ?? '',
    color: SLOT_COLORS[i],
    values: s.values,
  })).filter(c => c.name !== '')

  const filledSlots = slots.filter(s => s.entry !== null).length

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'radial-gradient(1200px 760px at 16% -8%, #18203f 0%, transparent 55%), radial-gradient(1000px 720px at 96% 6%, #2c1644 0%, transparent 52%), linear-gradient(180deg,#08080f 0%,#06060c 55%,#080510 100%)' }}>
      <GlowBlobs />
      <div style={{ position: 'relative', maxWidth: 1340, margin: '0 auto', padding: '24px 24px 44px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* header */}
        <header className="glass-header animate-fadeup" style={{ position: 'relative', zIndex: 50, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 13, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: 'linear-gradient(150deg,#6a9bff,#a06bf0)',
              boxShadow: '0 6px 18px rgba(108,120,240,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, padding: '11px 0 12px',
            }}>
              <span className="eq-bar-1" style={{ width: 4, height: 16, borderRadius: 2, background: 'rgba(255,255,255,0.95)' }} />
              <span className="eq-bar-2" style={{ width: 4, height: 21, borderRadius: 2, background: 'rgba(255,255,255,0.95)' }} />
              <span className="eq-bar-3" style={{ width: 4, height: 13, borderRadius: 2, background: 'rgba(255,255,255,0.95)' }} />
            </div>
            <div>
              <div className="shimmer-text" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>CurveLab</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Compare IEMs</div>
            </div>
          </Link>
          <div style={{ flex: 1 }} />
          <TopNav />
        </header>

        {/* graph */}
        <GlassCard animDelay="0.05s" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
                Overlay
              </div>
              <div style={{ fontSize: 16, fontWeight: 650, marginTop: 3 }}>
                {filledSlots === 0 ? 'Pick up to 4 IEMs below to compare' : `${filledSlots} IEM${filledSlots > 1 ? 's' : ''} · normalised at 1 kHz`}
              </div>
            </div>
            <button
              onClick={() => setShowTarget(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.78)',
                cursor: 'pointer', background: 'none', border: 'none', opacity: showTarget ? 1 : 0.4,
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
              Target ({presetName})
            </button>
          </div>

          <CompareGraph F={F} curves={curves} showTarget={showTarget} targetValues={targetValues} />

          {/* color legend */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {slots.map((s, i) => s.entry && (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SLOT_COLORS[i], boxShadow: `0 0 6px ${SLOT_COLORS[i]}` }} />
                {s.entry.name}
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>· {s.entry.source}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* target picker */}
        <GlassCard animDelay="0.1s" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>Target</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(['IEM', 'Over-ear', 'Universal'] as PresetFamily[]).flatMap(family =>
              Object.keys(PRESETS).filter(n => PRESET_META[n]?.family === family).map(name => {
                const active = name === presetName
                return (
                  <button
                    key={name}
                    onClick={() => setPresetName(name)}
                    style={{
                      padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 500,
                      border: active ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: active ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#c4b6ff' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                    }}
                  >
                    {name}
                  </button>
                )
              })
            )}
          </div>
        </GlassCard>

        {/* slot rail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
          {slots.map((s, i) => {
            const isActive = activeSlotIdx === i
            const score = s.values ? computePreferenceScore(F, s.values, targetValues).total : null
            const scoreColor = score == null ? 'rgba(255,255,255,0.3)'
              : score >= 80 ? '#4ade80' : score >= 60 ? '#a3e635' : score >= 40 ? '#facc15' : '#ff8a8a'
            const siblingSources = s.entry ? sourcesForId(sourcesIdx, s.entry.id) : []
            return (
              <GlassCard key={i} animDelay={`${0.12 + i * 0.04}s`} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, border: isActive ? `1px solid ${SLOT_COLORS[i]}` : undefined, boxShadow: isActive ? `0 0 0 1px ${SLOT_COLORS[i]}55, 0 10px 40px rgba(0,0,0,0.55)` : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: SLOT_COLORS[i], boxShadow: `0 0 8px ${SLOT_COLORS[i]}` }} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
                      Slot {i + 1}
                    </span>
                  </div>
                  {s.entry && (
                    <button onClick={() => clearSlot(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 12 }}>clear</button>
                  )}
                </div>
                {s.entry ? (
                  <>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.entry.name}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                        {s.loading ? 'fetching…' : s.error ? <span style={{ color: '#ff8a8a' }}>{s.error}</span> : s.entry.brand + ' · ' + s.entry.source}
                      </div>
                    </div>
                    {!s.loading && !s.error && score != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>tone</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor, fontFamily: 'ui-monospace,Menlo,monospace' }}>{score}</span>
                        <span style={{ flex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.32)', textAlign: 'right' }}>vs {presetName}</span>
                      </div>
                    )}
                    {siblingSources.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>sources</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {siblingSources.map(sib => {
                            const sibActive = sib.id === s.entry!.id
                            return (
                              <button
                                key={sib.id}
                                onClick={() => !sibActive && swapSource(i, sib.id)}
                                style={{
                                  padding: '3px 8px', borderRadius: 6, fontSize: 11,
                                  border: sibActive ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                  background: sibActive ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                                  color: sibActive ? '#c4b6ff' : 'rgba(255,255,255,0.55)',
                                  cursor: sibActive ? 'default' : 'pointer',
                                }}
                              >
                                {sib.source}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setActiveSlotIdx(i)}
                    style={{
                      padding: '14px', borderRadius: 12, border: isActive ? `1px solid ${SLOT_COLORS[i]}` : '1px dashed rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.025)', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {isActive ? '↓ Pick from search below' : 'Click to fill this slot'}
                  </button>
                )}
              </GlassCard>
            )
          })}
        </div>

        {/* search */}
        <GlassCard animDelay="0.2s" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
              Library {index.length > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 6 }}>{dedupedNames.length.toLocaleString()} IEMs</span>}
            </div>
            {activeSlotIdx != null && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>→ slot {activeSlotIdx + 1}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by IEM or brand…"
              style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 6, maxHeight: 260, overflow: 'auto' }}>
            {searchResults.map(e => {
              const slotI = activeSlotIdx ?? slots.findIndex(s => s.entry === null)
              const disabled = slotI < 0
              return (
                <button
                  key={e.id}
                  disabled={disabled}
                  onClick={() => slotI >= 0 && loadIntoSlot(e, slotI)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 1, padding: '7px 10px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                    opacity: disabled ? 0.4 : 1, color: '#fff', transition: 'background .12s',
                  }}
                  onMouseEnter={ev => { if (!disabled) ev.currentTarget.style.background = 'rgba(123,140,255,0.1)' }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>{e.brand} · {e.type}</span>
                </button>
              )
            })}
            {dedupedNames.length === 0 && (
              <div style={{ padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', gridColumn: '1 / -1' }}>
                Loading library…
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

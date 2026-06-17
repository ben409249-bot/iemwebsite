'use client'
import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import Link from 'next/link'
import GlowBlobs from '../../components/GlowBlobs'
import GlassCard from '../../components/GlassCard'
import TopNav from '../../components/TopNav'
import GlassSelect, { type SelectOption } from '../../components/GlassSelect'
import { encodeState } from '../../lib/state/permalink'
import { fetchAndFit, saveText, formatExt, sanitizeFilename } from '../../lib/data/quickDownload'
import { priorityOf } from '../../lib/data/sources'
import { PRESETS, PRESET_META, type PresetFamily } from '../../lib/curves/targetCurve'
import type { HpIndexEntry, OutputFormat, GeneratorState } from '../../lib/types'

type SortKey = 'name' | 'brand' | 'type' | 'source'
type TypeKey = 'All' | 'In-ear' | 'Over-ear' | 'Wireless'

const ROW_H = 56
const VIEW_H = 560

const TYPES: Array<{ key: TypeKey; label: string }> = [
  { key: 'All', label: 'All' },
  { key: 'In-ear', label: 'IEMs' },
  { key: 'Over-ear', label: 'Over-ear' },
  { key: 'Wireless', label: 'Wireless' },
]

const FORMAT_OPTIONS: Array<{ key: OutputFormat; label: string }> = [
  { key: 'equalizer-apo', label: 'Equalizer APO' },
  { key: 'wavelet-graphic-eq', label: 'Wavelet' },
  { key: 'qudelix-5k', label: 'Qudelix 5K' },
  { key: 'autoeq', label: 'AutoEQ' },
  { key: 'poweramp', label: 'Poweramp' },
  { key: 'peace', label: 'Peace' },
  { key: 'generic-json', label: 'JSON' },
  { key: 'plain-text', label: 'Plain Text' },
]

function generatorLinkFor(e: HpIndexEntry, presetName: string): string {
  // Build a state stub the generator can hydrate from its hash.
  const stub: Partial<GeneratorState> = {
    hpId: e.id,
    hpDisplayName: e.name,
    hpRawUrl: e.rawUrl,
    source: e.source,
    presetName,
    targets: { ...PRESETS[presetName] },
  }
  const encoded = encodeState({ ...(stub as GeneratorState) })
  return `/generator#s=${encoded}`
}

export default function BrowsePage() {
  const [index, setIndex] = useState<HpIndexEntry[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeKey>('In-ear')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [target, setTarget] = useState('Harman IE 2019')
  const [format, setFormat] = useState<OutputFormat>('equalizer-apo')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    fetch('/hp-index.json').then(r => r.json()).then(setIndex).catch(() => {})
  }, [])

  const deferredQuery = useDeferredValue(query)

  // Dedupe by name (keep best-priority source) so each IEM shows once.
  const dedupedByName = useMemo(() => {
    const best = new Map<string, HpIndexEntry>()
    for (const e of index) {
      const k = e.name.toLowerCase().trim()
      const ex = best.get(k)
      if (!ex || priorityOf(e.source) < priorityOf(ex.source)) best.set(k, e)
    }
    return Array.from(best.values())
  }, [index])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const arr = dedupedByName.filter(e => {
      if (typeFilter !== 'All' && e.type !== typeFilter) return false
      if (q && !(e.name + ' ' + e.brand).toLowerCase().includes(q)) return false
      return true
    })
    arr.sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      if (av < bv) return -1 * sortDir
      if (av > bv) return 1 * sortDir
      return 0
    })
    return arr
  }, [dedupedByName, deferredQuery, typeFilter, sortKey, sortDir])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(k); setSortDir(1) }
  }

  async function quickDownload(e: HpIndexEntry) {
    setDownloading(e.id); setDownloadError(null)
    try {
      const { text } = await fetchAndFit(e.rawUrl, format, { presetName: target })
      const stem = sanitizeFilename(`${e.name} - ${target}`)
      saveText(`CurveLab_${stem}_${formatExt(format)}`, text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed'
      setDownloadError(`${e.name}: ${msg}`)
    } finally {
      setDownloading(null)
    }
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 4)
  const end = Math.min(filtered.length, Math.ceil((scrollTop + VIEW_H) / ROW_H) + 4)
  const visible = filtered.slice(start, end)

  const targetOptions = useMemo<SelectOption[]>(() => {
    const out: SelectOption[] = []
    for (const family of (['IEM', 'Over-ear', 'Universal'] as PresetFamily[])) {
      const names = Object.keys(PRESETS).filter(n => PRESET_META[n]?.family === family)
      for (const name of names) out.push({ value: name, label: name, group: family })
    }
    return out
  }, [])

  const counts = useMemo(() => ({
    All: dedupedByName.length,
    'In-ear': dedupedByName.filter(e => e.type === 'In-ear').length,
    'Over-ear': dedupedByName.filter(e => e.type === 'Over-ear').length,
    'Wireless': dedupedByName.filter(e => e.type === 'Wireless').length,
  }), [dedupedByName])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'radial-gradient(1200px 760px at 16% -8%, #18203f 0%, transparent 55%), radial-gradient(1000px 720px at 96% 6%, #2c1644 0%, transparent 52%), linear-gradient(180deg,#08080f 0%,#06060c 55%,#080510 100%)' }}>
      <GlowBlobs />
      <div style={{ position: 'relative', maxWidth: 1340, margin: '0 auto', padding: '24px 24px 44px', display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Browse {counts.All.toLocaleString()} headphones</div>
            </div>
          </Link>
          <div style={{ flex: 1 }} />
          <TopNav />
        </header>

        {/* search + filter row */}
        <GlassCard animDelay="0.05s" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search brand or model…"
                style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TYPES.map(t => {
                const active = typeFilter === t.key
                return (
                  <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{
                    padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: active ? 600 : 500,
                    border: active ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: active ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#c4b6ff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}>
                    {t.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{counts[t.key].toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* quick-download target + format row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', borderRadius: 12, background: 'rgba(91,155,255,0.04)', border: '1px solid rgba(91,155,255,0.15)' }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Quick download
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>target</span>
              <GlassSelect
                ariaLabel="Target curve"
                width={170}
                value={target}
                onChange={setTarget}
                options={targetOptions}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>format</span>
              <GlassSelect
                ariaLabel="Export format"
                width={170}
                value={format}
                onChange={v => setFormat(v as OutputFormat)}
                options={FORMAT_OPTIONS.map(f => ({ value: f.key, label: f.label }))}
              />
            </div>
            {downloadError && <span style={{ fontSize: 11.5, color: '#ff8a8a', marginLeft: 'auto' }}>{downloadError}</span>}
          </div>
        </GlassCard>

        {/* Table */}
        <GlassCard animDelay="0.12s" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.4fr 0.8fr 1.2fr 220px', gap: 12, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {(['name', 'brand', 'type', 'source'] as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 10.5, color: sortKey === k ? '#c4b6ff' : 'rgba(255,255,255,0.42)',
                  fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 5, padding: 0, fontWeight: 600,
                }}
              >
                {k} {sortKey === k && <span>{sortDir === 1 ? '↑' : '↓'}</span>}
              </button>
            ))}
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: 'right' }}>
              actions
            </span>
          </div>

          {/* virtual body */}
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {index.length === 0 ? 'Loading library…' : 'No matches'}
            </div>
          ) : (
            <div
              onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
              style={{ height: Math.min(VIEW_H, filtered.length * ROW_H), overflow: 'auto', position: 'relative' }}
            >
              <div style={{ height: filtered.length * ROW_H, position: 'relative' }}>
                {visible.map((e, i) => {
                  const idx = start + i
                  const isDownloading = downloading === e.id
                  return (
                    <div
                      key={e.id}
                      style={{
                        position: 'absolute', top: idx * ROW_H, left: 0, right: 0, height: ROW_H,
                        display: 'grid', gridTemplateColumns: '2.5fr 1.4fr 0.8fr 1.2fr 220px', gap: 12,
                        padding: '0 12px', alignItems: 'center', borderRadius: 10, transition: 'background .12s',
                      }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}
                    >
                      <Link href={generatorLinkFor(e, target)} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, textDecoration: 'none', color: '#fff' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(150deg,#3a4a72,#4a3a66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          {(e.brand || e.name).slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                      </Link>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.brand}</span>
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', justifySelf: 'start' }}>
                        {e.type === 'In-ear' ? 'IEM' : e.type === 'Over-ear' ? 'OE' : 'BT'}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.source}</span>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => quickDownload(e)}
                          disabled={isDownloading}
                          title={`Download ${target} PEQ for ${e.name} as ${format}`}
                          style={{
                            padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                            background: isDownloading ? 'rgba(91,155,255,0.1)' : 'rgba(91,155,255,0.18)',
                            border: '1px solid rgba(91,155,255,0.35)',
                            color: '#9bbcff', cursor: isDownloading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {isDownloading ? '…' : 'Download'}
                        </button>
                        <Link
                          href={generatorLinkFor(e, target)}
                          style={{
                            padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.8)', textDecoration: 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          Tune →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ padding: '10px 12px 4px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
            {filtered.length.toLocaleString()} of {dedupedByName.length.toLocaleString()} · click <b style={{ color: 'rgba(255,255,255,0.55)' }}>Download</b> for a one-click PEQ file, or <b style={{ color: 'rgba(255,255,255,0.55)' }}>Tune</b> to open the full editor.
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

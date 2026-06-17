'use client'
import { useRef, useState, useEffect, useMemo, useDeferredValue } from 'react'
import GlassCard from './GlassCard'
import { HEADPHONES } from '../lib/data/headphones'
import { parseFrequencyCsv } from '../lib/csv/parseFrequencyCsv'
import type { GeneratorState, HpTypeFilter, HpIndexEntry } from '../lib/types'
import { buildSourcesIndex, sourcesForId, priorityOf } from '../lib/data/sources'
import { SMOOTH_OPTIONS, type SmoothFraction } from '../lib/dsp/smooth'
import { Upload } from 'lucide-react'

interface Props {
  state: GeneratorState
  onChange: (partial: Partial<GeneratorState>) => void
}

const TYPE_FILTERS: Array<{ key: HpTypeFilter; label: string }> = [
  { key: 'All', label: 'All' },
  { key: 'In-ear', label: 'IEM' },
  { key: 'Over-ear', label: 'Over-ear' },
]

function markFor(brand: string, name: string): string {
  const src = brand || name
  return src.slice(0, 2).toUpperCase()
}

// Search-list dedupe: collapse to one row per IEM name. The chosen row is the
// highest-priority source; once selected, the user can switch sources via the
// source picker below (which lists every source available for that IEM).
function dedupeByName(entries: HpIndexEntry[]): HpIndexEntry[] {
  const best = new Map<string, HpIndexEntry>()
  for (const e of entries) {
    const key = e.name.toLowerCase().trim()
    const existing = best.get(key)
    if (!existing) best.set(key, e)
    else if (priorityOf(e.source) < priorityOf(existing.source)) best.set(key, e)
  }
  return Array.from(best.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// Virtualised result list — renders only the rows currently in view (+ a few
// for overscan). Lets the dropdown show all 3,000 IEMs alphabetically without
// mounting 3,000 DOM nodes.
const ROW_H = 46
const VIEW_H = 320
const OVERSCAN = 4

function VirtualResultList({ items, onPick }: { items: HpIndexEntry[]; onPick: (e: HpIndexEntry) => void }) {
  const [scrollTop, setScrollTop] = useState(0)
  const total = items.length

  // Reset scroll position when the list contents change (e.g., the user changes
  // the type filter or types a query). Otherwise scrolling stays at the old
  // offset, which can land mid-list and feel disorienting.
  useEffect(() => { setScrollTop(0) }, [items])

  if (total === 0) {
    return (
      <div style={{ padding: '14px 10px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
        No results
      </div>
    )
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const end = Math.min(total, Math.ceil((scrollTop + VIEW_H) / ROW_H) + OVERSCAN)
  const visible = items.slice(start, end)

  return (
    <div
      onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      style={{ height: Math.min(VIEW_H, total * ROW_H), overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: total * ROW_H, position: 'relative' }}>
        {visible.map((h, i) => {
          const idx = start + i
          return (
            <div
              key={h.id}
              onMouseDown={() => onPick(h)}
              style={{
                position: 'absolute', top: idx * ROW_H, left: 0, right: 0, height: ROW_H,
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px',
                borderRadius: 10, cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(150deg,#3a4a72,#4a3a66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                {markFor(h.brand, h.name)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{h.brand}</div>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', flexShrink: 0, padding: '2px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.05)' }}>
                {h.type === 'In-ear' ? 'IEM' : h.type === 'Over-ear' ? 'OE' : 'BT'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Paste-URL row — collapsed to a tiny link by default, expands to an inline
// input. Lets reviewers paste any oratory1990 / Squig.link / AutoEQ raw CSV
// URL and load it directly.
function PasteUrlRow({ onLoad }: { onLoad: (name: string, url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  function submit() {
    if (!url.trim().startsWith('http')) return
    const guessedName = name.trim() || (url.split('/').pop()?.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ') ?? 'Pasted measurement')
    onLoad(guessedName, url.trim())
    setOpen(false); setUrl(''); setName('')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', textDecoration: 'underline',
          textDecorationColor: 'rgba(255,255,255,0.18)', textUnderlineOffset: 3, padding: 0,
        }}
      >
        … or paste a measurement URL
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', borderRadius: 11, background: 'rgba(91,155,255,0.05)', border: '1px solid rgba(91,155,255,0.18)' }}>
      <input
        autoFocus
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setUrl(''); setName('') } }}
        placeholder="https://… (raw CSV/TXT URL — GitHub, Squig.link, oratory)"
        style={{ padding: '7px 11px', borderRadius: 8, fontSize: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="Display name (optional)"
          style={{ flex: 1, padding: '7px 11px', borderRadius: 8, fontSize: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
        />
        <button onClick={submit} disabled={!url.trim().startsWith('http')} style={{ padding: '7px 12px', borderRadius: 8, background: 'linear-gradient(180deg,#6a9bff,#a06bf0)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: url.trim().startsWith('http') ? 1 : 0.4 }}>Load</button>
        <button onClick={() => { setOpen(false); setUrl(''); setName('') }} style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}

// Convert built-in HeadphoneEntry to HpIndexEntry shape for unified search
const BUILTIN_AS_INDEX: HpIndexEntry[] = HEADPHONES.map(h => ({
  id: h.id,
  name: h.name,
  brand: h.brand,
  type: h.type,
  source: 'built-in',
  rawUrl: '',
}))


export default function MeasurementCard({ state, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [bigIndex, setBigIndex] = useState<HpIndexEntry[]>([])

  useEffect(() => {
    fetch('/hp-index.json')
      .then(r => r.json())
      .then((data: HpIndexEntry[]) => setBigIndex(data))
      .catch(() => {}) // silently fall back to built-in
  }, [])

  // Click-outside: close the search dropdown when the user clicks anywhere
  // outside the type-filter row + search input + dropdown. Type-filter buttons
  // explicitly open the dropdown via onClick, so they must be *inside* this
  // detection scope — otherwise they'd flicker the menu shut and back open.
  useEffect(() => {
    if (!state.searchOpen) return
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (target && !searchWrapRef.current?.contains(target)) {
        onChange({ searchOpen: false })
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
    // onChange is stable enough in practice; including it would re-attach every
    // parent render. Effect depends only on whether the menu is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.searchOpen])

  // The full pool (every source × every IEM) — used for the sources-per-IEM index.
  const allEntries = useMemo<HpIndexEntry[]>(() => {
    if (bigIndex.length === 0) return BUILTIN_AS_INDEX
    const bigIds = new Set(bigIndex.map(e => e.id))
    const extras = BUILTIN_AS_INDEX.filter(e => !bigIds.has(e.id))
    return [...bigIndex, ...extras]
  }, [bigIndex])

  // De-duped list for the search dropdown (one row per IEM name).
  const fullIndex = useMemo<HpIndexEntry[]>(() => dedupeByName(allEntries), [allEntries])

  // Name → all available sources (for the source picker).
  const sourcesIdx = useMemo(() => buildSourcesIndex(allEntries), [allEntries])

  const availableSources = useMemo(() => sourcesForId(sourcesIdx, state.hpId), [sourcesIdx, state.hpId])

  const builtInHp = HEADPHONES.find(h => h.id === state.hpId)
  const indexHp = useMemo(() => fullIndex.find(e => e.id === state.hpId), [fullIndex, state.hpId])

  const selectedName = state.uploadedMeasurement
    ? (uploadName ?? 'Custom Upload')
    : (state.hpDisplayName || builtInHp?.name || indexHp?.name || '—')

  const selectedBrand = state.uploadedMeasurement
    ? 'Custom measurement'
    : `${builtInHp?.brand ?? indexHp?.brand ?? ''} · ${builtInHp?.type ?? indexHp?.type ?? ''}`

  const selectedMark = state.uploadedMeasurement
    ? '↑'
    : markFor(builtInHp?.brand ?? indexHp?.brand ?? '', selectedName)

  const query = state.query.trim().toLowerCase()
  const typeFilter = state.typeFilter ?? 'All'

  // Defer the heavy filter on a 3K+ index so each keystroke stays responsive.
  const deferredQuery = useDeferredValue(query)

  // Full filtered list — no cap. The dropdown virtualises it so 4,938 rows
  // mount as cheaply as 30. Always show the full alphabetical list when the
  // dropdown is open — popular entries appear naturally inside it.
  const searchResults = useMemo(() => {
    return fullIndex
      .filter(h => typeFilter === 'All' || h.type === typeFilter)
      .filter(h => !deferredQuery || (h.name + ' ' + h.brand).toLowerCase().includes(deferredQuery))
  }, [fullIndex, deferredQuery, typeFilter])

  const showResults = state.searchOpen
  const listToShow = searchResults

  const totalCount = fullIndex.length || HEADPHONES.length
  const iemCount = useMemo(() => fullIndex.filter(h => h.type === 'In-ear').length || HEADPHONES.filter(h => h.type === 'In-ear').length, [fullIndex])
  const overCount = useMemo(() => fullIndex.filter(h => h.type === 'Over-ear').length || HEADPHONES.filter(h => h.type === 'Over-ear').length, [fullIndex])
  const wirCount  = useMemo(() => fullIndex.filter(h => h.type === 'Wireless').length || HEADPHONES.filter(h => h.type === 'Wireless').length, [fullIndex])

  function selectEntry(entry: HpIndexEntry) {
    onChange({
      hpId: entry.id,
      hpDisplayName: entry.name,
      hpRawUrl: entry.rawUrl,
      source: entry.source as GeneratorState['source'],
      fetchedFr: null,
      frLoading: entry.rawUrl !== '',
      searchOpen: false,
      query: '',
    })
  }

  function handleFile(file: File) {
    setUploadName(file.name)
    file.text().then(text => {
      const { points, error } = parseFrequencyCsv(text)
      if (error) { setUploadError(error); onChange({ uploadedMeasurement: null }) }
      else { setUploadError(null); onChange({ uploadedMeasurement: points }) }
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const countFor = (tf: HpTypeFilter) =>
    tf === 'All' ? totalCount : tf === 'In-ear' ? iemCount : tf === 'Over-ear' ? overCount : wirCount

  return (
    <GlassCard animDelay="0.1s" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      {/* eyebrow + count badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
          Selected IEM / Headphone
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
          {totalCount.toLocaleString()} in library
        </div>
      </div>

      {/* avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 54, height: 54, borderRadius: 15, flexShrink: 0,
          background: 'linear-gradient(150deg,#3a4a72,#4a3a66)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 600,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.07) rotate(-3deg)')}
          onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
          {state.frLoading
            ? <span style={{ fontSize: 12, animation: 'pulseDot 1s ease-in-out infinite' }}>···</span>
            : selectedMark
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 680, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedName}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {state.frLoading ? 'Fetching measurement…' : selectedBrand}
          </div>
        </div>
      </div>

      {/* stat grid — only for built-in headphones with full metadata */}
      {!state.uploadedMeasurement && builtInHp && !state.frLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Form', builtInHp.type], ['Driver', builtInHp.driver], ['Imp.', builtInHp.impedance]].map(([label, val]) => (
            <div key={label} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* stat grid for index-only headphones */}
      {!state.uploadedMeasurement && !builtInHp && indexHp && !state.frLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Type', indexHp.type], ['Source', indexHp.source]].map(([label, val]) => (
            <div key={label} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* type filter + search — wrapped together so click-outside detection
          treats both as "inside" (otherwise type-filter clicks would race
          with the document mousedown handler and flicker the dropdown shut). */}
      {!state.uploadedMeasurement && (
        <div ref={searchWrapRef} style={{ display: 'contents' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPE_FILTERS.map(tf => {
            const active = typeFilter === tf.key
            return (
              <button
                key={tf.key}
                onClick={() => onChange({ typeFilter: tf.key, searchOpen: true })}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 500,
                  border: active ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: active ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#c4b6ff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                }}
              >
                {tf.label} <span style={{ opacity: 0.5 }}>{countFor(tf.key).toLocaleString()}</span>
              </button>
            )
          })}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
            <input
              value={state.query}
              onChange={e => onChange({ query: e.target.value, searchOpen: true })}
              onFocus={() => onChange({ searchOpen: true })}
              placeholder={`Search ${totalCount.toLocaleString()}+ headphones…`}
              style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            {state.query && (
              <button onClick={() => onChange({ query: '' })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            )}
          </div>
          {showResults && (
            <div className="drop-in" style={{
              position: 'absolute', top: 46, left: 0, right: 0, zIndex: 60,
              background: 'linear-gradient(165deg,rgba(18,18,30,0.97),rgba(12,12,22,0.97))',
              backdropFilter: 'blur(40px) saturate(170%)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
              padding: 6,
            }}>
              <div style={{ padding: '6px 10px 4px', fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'ui-monospace,Menlo,monospace', display: 'flex', justifyContent: 'space-between' }}>
                <span>{listToShow.length.toLocaleString()} {typeFilter === 'All' ? 'headphones' : typeFilter}{query ? ` · "${query}"` : ''}</span>
                <span style={{ opacity: 0.7 }}>A → Z</span>
              </div>
              <VirtualResultList items={listToShow} onPick={selectEntry} />
            </div>
          )}
        </div>
        </div>
      )}

      {/* upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '11px', borderRadius: 11, border: '1px dashed rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.025)', cursor: 'pointer', textAlign: 'center',
          transition: 'border-color .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(160,107,240,0.5)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
      >
        <Upload size={13} color="rgba(255,255,255,0.35)" />
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
          {state.uploadedMeasurement ? 'Replace measurement CSV' : 'Upload custom measurement CSV'}
        </span>
        <input ref={inputRef} type="file" accept=".csv,.txt" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {uploadError && <div style={{ fontSize: 12, color: '#ff8a8a' }}>{uploadError}</div>}

      {/* Paste-URL — for Squig.link / GitHub raw / oratory1990 direct links */}
      {!state.uploadedMeasurement && (
        <PasteUrlRow onLoad={(name, url) => onChange({
          hpDisplayName: name,
          hpRawUrl: url,
          hpId: `url_${url.split('/').pop()?.replace(/\.[a-z]+$/i, '') || 'custom'}`,
          source: 'custom URL',
          fetchedFr: null,
          frLoading: true,
        })} />
      )}

      {state.uploadedMeasurement && (
        <button
          onClick={() => { onChange({ uploadedMeasurement: null }); setUploadName(null); setUploadError(null) }}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          ← Use library headphone
        </button>
      )}

      {/* source picker — lists every rig/reviewer that measured this IEM */}
      {!state.uploadedMeasurement && availableSources.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>Measurement source</span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace,Menlo,monospace' }}>
              {availableSources.length === 1 ? '1 rig' : `${availableSources.length} rigs available`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availableSources.map(s => {
              const active = s.id === state.hpId
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (active) return
                    onChange({
                      hpId: s.id,
                      hpRawUrl: s.rawUrl,
                      source: s.source as GeneratorState['source'],
                      fetchedFr: null,
                      frLoading: true,
                    })
                  }}
                  title={`Load measurement from ${s.source}`}
                  style={{
                    padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 500,
                    border: active ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    background: active ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#c4b6ff' : 'rgba(255,255,255,0.65)',
                    cursor: active ? 'default' : 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                  }}
                >
                  {s.source}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Smoothing — pre-process the raw FR before fitting. Audiophiles expect
          1/12-octave by default (matches what oratory1990 / Squig.link show). */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>Smoothing</span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace,Menlo,monospace' }} title="Reduces rig noise above 6 kHz so the optimizer doesn't chase phantom peaks">
            fractional octave
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SMOOTH_OPTIONS.map(opt => {
            const active = state.smoothFrac === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => onChange({ smoothFrac: opt.key as SmoothFraction })}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 500,
                  border: active ? '1px solid rgba(123,140,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: active ? 'rgba(123,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#c4b6ff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}

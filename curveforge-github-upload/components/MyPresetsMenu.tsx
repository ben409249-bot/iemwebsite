'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GeneratorState } from '../lib/types'
import { listPresets, savePreset, deletePreset, applyPreset, type UserPreset } from '../lib/state/userPresets'

interface Props {
  current: GeneratorState
  onApply: (next: GeneratorState) => void
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const MENU_W = 320

export default function MyPresetsMenu({ current, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [presets, setPresets] = useState<UserPreset[]>([])
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Portal target needs to be document.body which only exists client-side.
  useEffect(() => { setMounted(true) }, [])

  // Refresh presets list each time the menu opens.
  useEffect(() => {
    if (open) setPresets(listPresets())
    else { setNaming(false); setName(''); setConfirmDelId(null) }
  }, [open])

  // Compute the menu's fixed position from the trigger's bounding rect.
  // Done in useLayoutEffect so it lands on the very first paint of the menu —
  // otherwise the user briefly sees it at (0, 0).
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      // Align the menu's right edge with the trigger's right edge.
      const right = Math.max(8, window.innerWidth - rect.right)
      const top = rect.bottom + 6
      setPos({ top, right })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true as unknown as EventListenerOptions)
    }
  }, [open])

  // Close on outside click. Both the trigger AND the menu count as "inside" —
  // the trigger because clicking it toggles, the menu because clicking
  // anything in it is meant to be interactive (input, list items, delete X).
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  // Esc closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => { if (naming) inputRef.current?.focus() }, [naming])

  function startSave() {
    const suggested = `${current.hpDisplayName || 'My tuning'} · ${current.presetName}`
    setName(suggested)
    setNaming(true)
  }

  function confirmSave() {
    if (!name.trim()) return
    savePreset(name, current)
    setPresets(listPresets())
    setNaming(false)
    setName('')
  }

  function pickPreset(p: UserPreset) {
    onApply(applyPreset(p, current))
    setOpen(false)
  }

  function askDelete(e: React.MouseEvent, p: UserPreset) {
    e.stopPropagation()
    setConfirmDelId(p.id)
  }

  function confirmDelete(e: React.MouseEvent, p: UserPreset) {
    e.stopPropagation()
    deletePreset(p.id)
    setPresets(listPresets())
    setConfirmDelId(null)
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDelId(null)
  }

  const menu = open && pos ? (
    <div
      ref={menuRef}
      className="drop-in"
      style={{
        position: 'fixed', top: pos.top, right: pos.right, width: MENU_W, zIndex: 1000,
        background: 'linear-gradient(165deg,rgba(18,18,30,0.97),rgba(12,12,22,0.97))',
        backdropFilter: 'blur(40px) saturate(170%)',
        WebkitBackdropFilter: 'blur(40px) saturate(170%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      {!naming ? (
        <button onClick={startSave} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 10,
          background: 'rgba(123,140,255,0.12)', border: '1px solid rgba(123,140,255,0.3)',
          color: '#c4b6ff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <span>+ Save current tuning</span>
          <span style={{ fontSize: 10.5, color: 'rgba(196,182,255,0.6)', fontFamily: 'ui-monospace,Menlo,monospace' }}>localStorage</span>
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 6, padding: 4 }}>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmSave(); if (e.key === 'Escape') { setNaming(false); setName('') } }}
            placeholder="Name this tuning…"
            style={{
              flex: 1, padding: '7px 11px', borderRadius: 9, fontSize: 13,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', outline: 'none', minWidth: 0,
            }}
          />
          <button onClick={confirmSave} style={{ padding: '7px 12px', borderRadius: 9, background: 'linear-gradient(180deg,#6a9bff,#a06bf0)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
          <button onClick={() => { setNaming(false); setName('') }} style={{ padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 4px' }} />

      {presets.length === 0 ? (
        <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          No saved tunings yet.<br />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Save once, load with a click on any visit.</span>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {presets.map(p => {
            const askingDelete = confirmDelId === p.id
            return (
              <div
                key={p.id}
                onClick={() => !askingDelete && pickPreset(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 9, cursor: askingDelete ? 'default' : 'pointer',
                  transition: 'background .12s',
                  background: askingDelete ? 'rgba(255,90,90,0.07)' : 'transparent',
                }}
                onMouseEnter={e => { if (!askingDelete) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!askingDelete) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {askingDelete ? (
                    <div style={{ fontSize: 12.5, color: '#ff8a8a', fontWeight: 500 }}>
                      Delete <span style={{ color: '#fff', fontWeight: 600 }}>{p.name}</span>?
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>
                        {p.state.presetName ?? '—'} · {timeAgo(p.savedAt)}
                      </div>
                    </>
                  )}
                </div>
                {askingDelete ? (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={e => confirmDelete(e, p)}
                      style={{
                        background: 'rgba(255,90,90,0.18)', color: '#ff8a8a',
                        border: '1px solid rgba(255,90,90,0.4)', borderRadius: 7,
                        padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >Delete</button>
                    <button
                      onClick={cancelDelete}
                      style={{
                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                        padding: '4px 10px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                      }}
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={e => askDelete(e, p)}
                    title="Delete"
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.32)', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,90,90,0.12)'; e.currentTarget.style.color = '#ff8a8a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.32)' }}
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        title="Your saved tunings (stored locally)"
        style={{
          padding: '7px 12px', borderRadius: 10,
          background: open ? 'rgba(123,140,255,0.15)' : 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(123,140,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
          color: open ? '#c4b6ff' : 'rgba(255,255,255,0.78)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all .15s',
        }}
      >
        My presets
      </button>
      {mounted && menu && createPortal(menu, document.body)}
    </>
  )
}

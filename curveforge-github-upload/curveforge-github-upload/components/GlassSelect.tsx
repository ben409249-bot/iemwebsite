'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  group?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  width?: number | string
  ariaLabel?: string
}

export default function GlassSelect({ options, value, onChange, width = 160, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Group options by their `group` field, preserving original order.
  const groups: Array<{ name: string | null; items: SelectOption[] }> = []
  for (const opt of options) {
    const gname = opt.group ?? null
    const last = groups[groups.length - 1]
    if (last && last.name === gname) last.items.push(opt)
    else groups.push({ name: gname, items: [opt] })
  }

  const selected = options.find(o => o.value === value)

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true as unknown as EventListenerOptions)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const menu = open && pos ? (
    <div
      ref={menuRef}
      className="drop-in"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 1000,
        background: 'linear-gradient(165deg,rgba(20,20,32,0.97),rgba(14,14,24,0.97))',
        backdropFilter: 'blur(40px) saturate(170%)',
        WebkitBackdropFilter: 'blur(40px) saturate(170%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        padding: 5, maxHeight: 360, overflow: 'auto',
      }}
    >
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.name && (
            <div style={{
              padding: '7px 10px 3px', fontSize: 9.5, color: 'rgba(255,255,255,0.32)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: 'ui-monospace,Menlo,monospace',
            }}>
              {g.name}
            </div>
          )}
          {g.items.map(opt => {
            const active = opt.value === value
            return (
              <div
                key={opt.value}
                onMouseDown={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  padding: '7px 10px', borderRadius: 7, fontSize: 12.5,
                  color: active ? '#c4b6ff' : 'rgba(255,255,255,0.78)',
                  background: active ? 'rgba(123,140,255,0.15)' : 'transparent',
                  cursor: 'pointer', transition: 'background .1s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{opt.label}</span>
                {active && <span style={{ fontSize: 11, color: '#c4b6ff' }}>✓</span>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, width, padding: '6px 11px', borderRadius: 8,
          fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
          background: open ? 'rgba(123,140,255,0.1)' : 'rgba(255,255,255,0.05)',
          border: open ? '1px solid rgba(123,140,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
          cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap',
          textAlign: 'left', transition: 'background .15s, border-color .15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? value}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" style={{ flexShrink: 0, opacity: 0.55, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }}>
          <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {mounted && menu && createPortal(menu, document.body)}
    </>
  )
}

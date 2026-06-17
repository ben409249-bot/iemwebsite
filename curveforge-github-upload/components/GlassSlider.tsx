'use client'
import { useCallback, useRef } from 'react'

interface Props {
  label: string
  display: string
  suffix?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

// Snap to step, then to a safe number of decimals to avoid 0.30000000000004.
function snap(v: number, min: number, max: number, step: number): number {
  if (step) v = Math.round(v / step) * step
  v = Math.max(min, Math.min(max, v))
  // step="0.1" → 1 decimal, "0.01" → 2, etc.
  const decimals = step >= 1 ? 0 : Math.min(6, Math.max(0, -Math.floor(Math.log10(step))))
  return parseFloat(v.toFixed(decimals))
}

export default function GlassSlider({ label, display, suffix, value, min, max, step, onChange }: Props) {
  const pct = Math.max(0, Math.min(100, (value - min) / (max - min) * 100))

  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<number | null>(null)
  const lastSentRef = useRef<number>(value)
  const trackRef = useRef<HTMLDivElement | null>(null)

  // Flush at most once per animation frame, and only if the value actually changed.
  const schedule = useCallback((v: number) => {
    pendingRef.current = v
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const p = pendingRef.current
      pendingRef.current = null
      if (p == null) return
      if (p === lastSentRef.current) return
      lastSentRef.current = p
      onChange(p)
    })
  }, [onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const track = trackRef.current
    if (!track) return
    track.setPointerCapture(e.pointerId)

    const rect = track.getBoundingClientRect()
    const apply = (cx: number) => {
      let t = (cx - rect.left) / rect.width
      t = Math.max(0, Math.min(1, t))
      schedule(snap(min + t * (max - min), min, max, step))
    }
    apply(e.clientX)

    document.body.classList.add('is-dragging')

    const onMove = (ev: PointerEvent) => apply(ev.clientX)
    const cleanup = () => {
      track.removeEventListener('pointermove', onMove)
      track.removeEventListener('pointerup', cleanup)
      track.removeEventListener('pointercancel', cleanup)
      try { track.releasePointerCapture(e.pointerId) } catch {}
      document.body.classList.remove('is-dragging')
      // Make sure the final, snapped value is committed even if the user releases
      // mid-frame and the rAF queued one is the latest.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      const p = pendingRef.current
      pendingRef.current = null
      if (p != null && p !== lastSentRef.current) {
        lastSentRef.current = p
        onChange(p)
      }
    }
    track.addEventListener('pointermove', onMove)
    track.addEventListener('pointerup', cleanup)
    track.addEventListener('pointercancel', cleanup)
  }, [min, max, step, schedule, onChange])

  // Keyboard: ←/→ nudge by step, ↑/↓ by 10×step.
  const handleKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step
    else if (e.key === 'PageDown') delta = -10 * step
    else if (e.key === 'PageUp') delta = 10 * step
    else if (e.key === 'Home') { e.preventDefault(); schedule(min); return }
    else if (e.key === 'End') { e.preventDefault(); schedule(max); return }
    else return
    e.preventDefault()
    schedule(snap(value + delta, min, max, step))
  }, [value, min, max, step, schedule])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, color: '#fff' }}>
          {display}
          {suffix && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{suffix}</span>}
        </span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKey}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', userSelect: 'none', outline: 'none' }}
      >
        <div style={{
          position: 'relative', width: '100%', height: 6,
          borderRadius: 4, background: 'rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${pct}%`, borderRadius: 4,
            background: 'linear-gradient(90deg,#5b9bff,#a06bf0)',
            boxShadow: '0 0 10px rgba(123,140,255,0.45)',
            pointerEvents: 'none',
            willChange: 'width',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: `${pct}%`,
            transform: 'translate(-50%,-50%)',
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5), 0 0 0 3px rgba(160,107,240,0.25)',
            cursor: 'grab', pointerEvents: 'none',
            willChange: 'left',
          }} />
        </div>
      </div>
    </div>
  )
}

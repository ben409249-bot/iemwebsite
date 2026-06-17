'use client'
import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react'
import type { FitFilter } from '../lib/dsp/optimizer'

interface Props {
  F: number[]
  rawN: number[]
  targetN: number[]
  sumEQ: number[]
  corrected: number[]
  showRaw: boolean
  showTarget: boolean
  showCorrected: boolean
  // drag-to-tune
  filters?: FitFilter[]
  filterTrims?: Record<number, number>
  disabledIdx?: number[]
  maxGain?: number
  onTrim?: (idx: number, trimDb: number) => void
}

const W = 1000, H = 470
const PX0 = 42, PX1 = 992, PY0 = 18, PY1 = 424, LY = 452, LX = 22
const YMAX = 13, YMIN = -13
const L20 = Math.log10(20), L20K = Math.log10(20000)

const xOf = (f: number) => PX0 + (Math.log10(f) - L20) / (L20K - L20) * (PX1 - PX0)
const yOf = (d: number) => PY0 + (YMAX - d) / (YMAX - YMIN) * (PY1 - PY0)
const dbPerPx = (YMAX - YMIN) / (PY1 - PY0)

function toPath(F: number[], vals: number[]): string {
  return vals.map((v, i) => (i === 0 ? 'M' : 'L') + xOf(F[i]).toFixed(1) + ' ' + yOf(v).toFixed(1)).join(' ')
}
function toArea(F: number[], vals: number[]): string {
  return (
    'M' + xOf(F[0]).toFixed(1) + ' ' + yOf(0).toFixed(1) + ' ' +
    vals.map((v, i) => 'L' + xOf(F[i]).toFixed(1) + ' ' + yOf(v).toFixed(1)).join(' ') +
    ' L' + xOf(F[F.length - 1]).toFixed(1) + ' ' + yOf(0).toFixed(1) + ' Z'
  )
}

const F_GRID = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
const F_LABELS = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k']
const D_GRID = [-12, -9, -6, -3, 0, 3, 6, 9, 12]

interface DragState {
  idx: number
  pointerId: number
  startClientY: number          // raw viewport coordinate at drag start
  startTrim: number             // trim value that was in state when drag started
  baseGain: number              // filter's gain BEFORE any trim — anchor for the math
  scaleY: number                // SVG-Y per CSS pixel — cached on pointerdown so the math is consistent even if the page reflows mid-drag
  rafId: number | null
  pendingTrim: number | null    // most-recent computed trim, awaiting commit
}

function FrequencyGraphImpl({ F, rawN, targetN, sumEQ, corrected, showRaw, showTarget, showCorrected, filters, filterTrims, disabledIdx, maxGain, onTrim }: Props) {
  const paths = useMemo(() => ({
    raw: toPath(F, rawN),
    target: toPath(F, targetN),
    eq: toPath(F, corrected),
    eqArea: toArea(F, sumEQ),
  }), [F, rawN, targetN, sumEQ, corrected])

  const firstPaintRef = useRef(true)
  const playDrawIn = firstPaintRef.current
  if (firstPaintRef.current) firstPaintRef.current = false

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)

  // Local "live" trim — what the dot shows during a drag. Decouples the visual
  // from the (deferred) global state update so the dot tracks the mouse
  // exactly instead of lagging behind the DSP recompute.
  const [liveTrim, setLiveTrim] = useState<{ idx: number; trim: number } | null>(null)

  const cleanupDrag = useCallback(() => {
    const d = dragRef.current
    if (d?.rafId != null) cancelAnimationFrame(d.rafId)
    dragRef.current = null
    setLiveTrim(null)
    document.body.classList.remove('is-dragging')
  }, [])

  // Global pointermove/up while a drag is active. Listening on the window
  // means the drag tracks the mouse even when the cursor leaves the dot or
  // the SVG entirely — no more "jumps to the far left" when the dot moves
  // out from under your cursor.
  useEffect(() => {
    if (!liveTrim) return  // only attach while dragging

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const dyCss = e.clientY - d.startClientY
      const dySvg = dyCss * d.scaleY
      const deltaDb = -dySvg * dbPerPx  // y grows downward → up-drag = +gain
      // Round to 0.1 dB and clamp via baseGain so the trim never overshoots
      // the filter's ±maxGain cap.
      const cap = maxGain ?? 12
      const wantGain = d.baseGain + d.startTrim + deltaDb
      const clampedGain = Math.max(-cap, Math.min(cap, wantGain))
      const trim = Math.round((clampedGain - d.baseGain) * 10) / 10
      // Update visual immediately
      setLiveTrim({ idx: d.idx, trim })
      // Schedule a commit to global state at most once per frame
      d.pendingTrim = trim
      if (d.rafId == null) {
        d.rafId = requestAnimationFrame(() => {
          d.rafId = null
          if (d.pendingTrim != null && onTrim) onTrim(d.idx, d.pendingTrim)
          d.pendingTrim = null
        })
      }
    }

    const finish = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      // Make sure the FINAL trim is committed even if it was still queued.
      if (d.rafId != null) {
        cancelAnimationFrame(d.rafId); d.rafId = null
      }
      if (d.pendingTrim != null && onTrim) onTrim(d.idx, d.pendingTrim)
      cleanupDrag()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [liveTrim, onTrim, maxGain, cleanupDrag])

  const handleDown = useCallback((e: React.PointerEvent<SVGGElement>, idx: number) => {
    if (!onTrim || !filters) return
    e.preventDefault()
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleY = H / rect.height
    const trimAtStart = filterTrims?.[idx] ?? 0
    // baseGain = optimizer's untrimmed value. filter.gain already has the
    // existing trim folded in, so subtract it back out to get the anchor.
    const baseGain = filters[idx].gain - trimAtStart

    dragRef.current = {
      idx,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startTrim: trimAtStart,
      baseGain,
      scaleY,
      rafId: null,
      pendingTrim: null,
    }
    setLiveTrim({ idx, trim: trimAtStart })  // triggers the global-listener effect
    document.body.classList.add('is-dragging')
  }, [onTrim, filters, filterTrims])

  const disabledSet = useMemo(() => new Set(disabledIdx ?? []), [disabledIdx])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
    >
      <defs>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5b9bff" />
          <stop offset="55%" stopColor="#8a8cff" />
          <stop offset="100%" stopColor="#c07cf5" />
        </linearGradient>
        <linearGradient id="eqAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(110,168,255,0.22)" />
          <stop offset="100%" stopColor="rgba(110,168,255,0)" />
        </linearGradient>
      </defs>

      {F_GRID.map((f, i) => {
        const x = xOf(f)
        return (
          <g key={`vg${i}`}>
            <line x1={x} y1={PY0} x2={x} y2={PY1} stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={x} y={LY} fill="rgba(255,255,255,0.40)" fontSize="12" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace">{F_LABELS[i]}</text>
          </g>
        )
      })}
      {D_GRID.map((d, i) => {
        const y = yOf(d)
        const isZero = d === 0
        return (
          <g key={`hg${i}`}>
            <line x1={PX0} y1={y} x2={PX1} y2={y} stroke={isZero ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={LX} y={y + 4} fill={isZero ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)'} fontSize="11" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace">{d > 0 ? '+' : ''}{d}</text>
          </g>
        )
      })}

      <path d={paths.eqArea} fill="url(#eqAreaGrad)" stroke="none" />

      {showRaw && (
        <path d={paths.raw} fill="none" stroke="#ff8a8a" strokeWidth={2} strokeOpacity={0.80} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      {showTarget && (
        <path d={paths.target} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.7} strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}
      {showCorrected && (
        <path
          d={paths.eq}
          fill="none"
          stroke="url(#accentGrad)"
          strokeWidth={3.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(123,140,255,0.55))',
            ...(playDrawIn ? {
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'drawIn 1.2s 0.1s cubic-bezier(.4,0,.2,1) forwards',
            } : null),
          }}
          {...(playDrawIn ? { pathLength: 1000 } : {})}
        />
      )}

      {/* Filter handles — drag vertically to trim gain */}
      {filters && onTrim && filters.map((f, i) => {
        const off = disabledSet.has(i)
        const isDragging = liveTrim?.idx === i

        // Render position: while dragging, use the live trim so the dot
        // tracks the mouse precisely. Otherwise, use whatever's in filters
        // (which already has the committed trim folded in).
        let displayGain = f.gain
        if (isDragging) {
          const d = dragRef.current
          if (d) {
            // baseGain + liveTrim — exact pointer-aligned position
            displayGain = d.baseGain + (liveTrim?.trim ?? 0)
          }
        }
        const committedTrim = filterTrims?.[i] ?? 0
        const shownTrim = isDragging ? (liveTrim?.trim ?? committedTrim) : committedTrim

        const x = xOf(f.fc)
        const y = yOf(displayGain)
        const color = off ? 'rgba(255,255,255,0.25)' : displayGain >= 0 ? '#9bbcff' : '#c07cf5'
        const radius = isDragging ? 9 : 6.5

        return (
          <g
            key={`flh${i}`}
            onPointerDown={e => handleDown(e, i)}
            style={{ cursor: off ? 'not-allowed' : 'ns-resize', touchAction: 'none' }}
          >
            {/* 20-px transparent hit region for easier grabbing */}
            <circle cx={x} cy={y} r={20} fill="transparent" />
            <circle
              cx={x} cy={y} r={radius}
              fill={color} stroke="#fff" strokeWidth={isDragging ? 2.2 : 1.5}
              opacity={off ? 0.4 : 1}
              style={{
                filter: `drop-shadow(0 0 ${isDragging ? 10 : 4}px ${color})`,
                transition: isDragging ? 'none' : 'r .12s, filter .12s',
              }}
            />
            {isDragging && (
              <g pointerEvents="none">
                {/* horizontal guide */}
                <line x1={PX0} y1={y} x2={PX1} y2={y} stroke={color} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
                {/* readout chip */}
                <rect x={x + 14} y={y - 13} width={shownTrim === 0 ? 78 : 104} height={26} rx={7} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={1.2} />
                <text x={x + 22} y={y + 4} fontSize="12" fill="#fff" fontFamily="ui-monospace,Menlo,monospace" fontWeight={600}>
                  {(displayGain >= 0 ? '+' : '') + displayGain.toFixed(1)} dB
                  {shownTrim !== 0 && <tspan fill={shownTrim > 0 ? '#9bbcff' : '#c07cf5'} dx="6">({shownTrim >= 0 ? '+' : ''}{shownTrim.toFixed(1)})</tspan>}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default memo(FrequencyGraphImpl)

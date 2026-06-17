'use client'
import { memo, useMemo } from 'react'

export interface CompareCurve {
  id: string
  name: string
  source: string
  color: string
  values: number[] | null  // null = loading
}

interface Props {
  F: number[]
  curves: CompareCurve[]
  showTarget: boolean
  targetValues?: number[]
}

const W = 1000, H = 460
const PX0 = 42, PX1 = 992, PY0 = 18, PY1 = 414, LY = 442, LX = 22
const YMAX = 14, YMIN = -14
const L20 = Math.log10(20), L20K = Math.log10(20000)

const xOf = (f: number) => PX0 + (Math.log10(f) - L20) / (L20K - L20) * (PX1 - PX0)
const yOf = (d: number) => PY0 + (YMAX - d) / (YMAX - YMIN) * (PY1 - PY0)

function toPath(F: number[], vals: number[]): string {
  return vals.map((v, i) => (i === 0 ? 'M' : 'L') + xOf(F[i]).toFixed(1) + ' ' + yOf(v).toFixed(1)).join(' ')
}

const F_GRID = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
const F_LABELS = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k']
const D_GRID = [-12, -9, -6, -3, 0, 3, 6, 9, 12]

function CompareGraphImpl({ F, curves, showTarget, targetValues }: Props) {
  const paths = useMemo(
    () => curves.map(c => ({ ...c, d: c.values ? toPath(F, c.values) : '' })),
    [F, curves]
  )
  const targetPath = useMemo(
    () => showTarget && targetValues ? toPath(F, targetValues) : '',
    [F, targetValues, showTarget]
  )

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
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

      {targetPath && (
        <path d={targetPath} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.7} strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}

      {paths.map(p => p.d && (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 4px ${p.color}88)` }}
        />
      ))}
    </svg>
  )
}

export default memo(CompareGraphImpl)

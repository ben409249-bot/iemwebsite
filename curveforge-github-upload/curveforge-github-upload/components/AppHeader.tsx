'use client'
import Link from 'next/link'
import MyPresetsMenu from './MyPresetsMenu'
import TopNav from './TopNav'
import type { GeneratorState } from '../lib/types'

interface Props {
  hpName: string
  matchPct: number
  prefScore: number
  onCopy: () => void
  copied: boolean
  onShare: () => void
  shareCopied: boolean
  currentState: GeneratorState
  onApplyPreset: (next: GeneratorState) => void
}

function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#a3e635'
  if (score >= 40) return '#facc15'
  return '#ff8a8a'
}

export default function AppHeader({ hpName, matchPct, prefScore, onCopy, copied, onShare, shareCopied, currentState, onApplyPreset }: Props) {
  return (
    <header className="glass-header animate-fadeup" style={{
      position: 'relative', zIndex: 50,
      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 18,
    }}>
      {/* logo — links back to home */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 13, flexShrink: 0, textDecoration: 'none' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13,
          background: 'linear-gradient(150deg,#6a9bff,#a06bf0)',
          boxShadow: '0 6px 18px rgba(108,120,240,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 3, padding: '11px 0 12px',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(-4deg)'; e.currentTarget.style.boxShadow = '0 8px 26px rgba(108,120,240,0.65), inset 0 1px 0 rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 18px rgba(108,120,240,0.45), inset 0 1px 0 rgba(255,255,255,0.4)' }}
        >
          <span className="eq-bar-1" style={{ width: 4, height: 16, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
          <span className="eq-bar-2" style={{ width: 4, height: 21, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
          <span className="eq-bar-3" style={{ width: 4, height: 13, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
        </div>
        <div>
          <div className="shimmer-text" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
            CurveLab
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>IEM Equalizer</div>
        </div>
      </Link>

      {/* selected headphone */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {hpName}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
          active profile
        </div>
      </div>

      {/* right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <TopNav />
        <MyPresetsMenu current={currentState} onApply={onApplyPreset} />
        {/* preference score (raw tonality vs. target, before EQ) */}
        <div title="Raw tonality vs. active target, before EQ" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>tone</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(prefScore), fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: '-0.01em' }}>
            {prefScore}
          </span>
        </div>

        {/* corrected match % */}
        <div title="EQ match vs. target" style={{
          display: 'flex', alignItems: 'baseline', gap: 7, padding: '6px 12px',
          borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>match</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: '-0.01em' }}>{matchPct}%</span>
        </div>

        <button
          onClick={onShare}
          title="Copy a shareable link to this exact tuning"
          style={{
            padding: '10px 14px', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background .15s, border-color .15s, transform .15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
        >
          {shareCopied ? 'Link copied ✓' : 'Share'}
        </button>

        <button
          onClick={onCopy}
          className="glow-btn"
          style={{
            padding: '10px 18px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(180deg,#6a9bff,#a06bf0)',
            color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            transition: 'filter .18s, transform .15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
        >
          {copied ? 'Copied ✓' : 'Copy filters'}
        </button>
      </div>
    </header>
  )
}

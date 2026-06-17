import Link from 'next/link'
import GlowBlobs from '../components/GlowBlobs'

export default function HomePage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'radial-gradient(1200px 760px at 16% -8%, #18203f 0%, transparent 55%), radial-gradient(1000px 720px at 96% 6%, #2c1644 0%, transparent 52%), linear-gradient(180deg,#08080f 0%,#06060c 55%,#080510 100%)' }}>
      <GlowBlobs />
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '24px 24px 64px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* nav */}
        <nav className="glass-header animate-fadeup" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(150deg,#6a9bff,#a06bf0)', boxShadow: '0 4px 14px rgba(108,120,240,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, padding: '9px 0 10px' }}>
              <span className="eq-bar-1" style={{ width: 3, height: 13, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
              <span className="eq-bar-2" style={{ width: 3, height: 18, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
              <span className="eq-bar-3" style={{ width: 3, height: 11, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
            </div>
            <span className="shimmer-text" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>CurveLab</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/how-it-works" style={{ padding: '8px 16px', borderRadius: 12, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'color .2s' }}>How it works</Link>
            <Link href="/generator" style={{ padding: '9px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(180deg,#6a9bff,#a06bf0)', boxShadow: '0 4px 16px rgba(108,120,240,0.4)' }}>Open Generator</Link>
          </div>
        </nav>

        {/* hero */}
        <div className="animate-fadeup-1" style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: '#a06bf0', textTransform: 'uppercase', marginBottom: 20, fontFamily: 'ui-monospace,Menlo,monospace' }}>
            Auto-PEQ for IEMs
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 24px' }}>
            Turn any IEM into<br />
            <span style={{ background: 'linear-gradient(90deg,#6a9bff,#a06bf0,#c07cf5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              your sound
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Upload a measurement, choose a target, and generate clean parametric EQ filters with a live graph preview. Export to any EQ app instantly.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/generator" style={{
              padding: '14px 28px', borderRadius: 15, fontSize: 15, fontWeight: 700,
              color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(180deg,#6a9bff,#a06bf0)',
              boxShadow: '0 8px 28px rgba(108,120,240,0.45)',
              transition: 'transform .15s, filter .15s',
            }}>
              Open Generator →
            </Link>
            <Link href="/how-it-works" style={{
              padding: '14px 28px', borderRadius: 15, fontSize: 15, fontWeight: 600,
              color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
            }}>
              How it works
            </Link>
          </div>
        </div>

        {/* feature cards */}
        <div className="animate-fadeup-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { icon: '📈', title: 'Upload FR + Target', desc: 'Drop a CSV measurement and pick a reference target curve.' },
            { icon: '⚡', title: 'Generate PEQ Filters', desc: 'Greedy optimizer places biquad filters to match the target.' },
            { icon: '👁', title: 'Live Corrected Preview', desc: 'See the corrected frequency response update instantly.' },
            { icon: '📤', title: 'Export to Any App', desc: 'Equalizer APO, Wavelet, Poweramp, and more.' },
          ].map(card => (
            <div key={card.title} className="glass-card" style={{ padding: '22px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{card.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

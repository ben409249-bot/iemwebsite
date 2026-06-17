import Link from 'next/link'
import GlowBlobs from '../../components/GlowBlobs'

export default function HowItWorksPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'radial-gradient(1200px 760px at 16% -8%, #18203f 0%, transparent 55%), radial-gradient(1000px 720px at 96% 6%, #2c1644 0%, transparent 52%), linear-gradient(180deg,#08080f 0%,#06060c 55%,#080510 100%)' }}>
      <GlowBlobs />
      <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', padding: '24px 24px 64px' }}>
        <nav className="glass-header animate-fadeup" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(150deg,#6a9bff,#a06bf0)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, padding: '8px 0 8px' }}>
              <span style={{ width: 3, height: 11, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
              <span style={{ width: 3, height: 16, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
              <span style={{ width: 3, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.95)', display: 'block' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>CurveLab</span>
          </Link>
          <Link href="/generator" style={{ padding: '8px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(180deg,#6a9bff,#a06bf0)', boxShadow: '0 4px 16px rgba(108,120,240,0.35)' }}>
            Open Generator
          </Link>
        </nav>

        <div className="animate-fadeup-1" style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#a06bf0', textTransform: 'uppercase', fontFamily: 'ui-monospace,Menlo,monospace', marginBottom: 14 }}>
            How it works
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 720, letterSpacing: '-0.025em', margin: '0 0 16px' }}>
            Auto-PEQ explained
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
            CurveLab computes parametric equalizer settings that nudge your IEM's measured frequency response toward a chosen target curve.
          </p>
        </div>

        {[
          {
            n: '01', title: 'Frequency Response Measurements',
            body: 'A frequency response measurement shows how loud a headphone or IEM reproduces each frequency. CurveLab accepts CSV files with frequency/dB columns, or you can select from the built-in library of simulated headphones.',
          },
          {
            n: '02', title: 'Target Curves',
            body: 'A target curve describes the "ideal" sound signature — typically based on research into how humans perceive sound (e.g. Harman target). CurveLab ships with Harman 2019, Harman 2018, Flat, Bass Boost, Bright, and Warm presets, with adjustable bass, ear-gain, treble, and tilt sliders.',
          },
          {
            n: '03', title: 'The Optimization Algorithm',
            body: 'CurveLab uses a greedy parametric EQ optimizer:\n1. Normalize both curves at 1 kHz.\n2. Compute the error (target − measured).\n3. Iteratively place biquad filters at the largest error points.\n4. Run coordinate descent refinement passes.\n5. Calculate preamp to avoid digital clipping.',
          },
          {
            n: '04', title: 'Biquad Filter Math',
            body: 'Filters are calculated using the RBJ Audio EQ Cookbook formulas at 48000 Hz sample rate. Peaking (PK), low shelf (LS), and high shelf (HS) filter types are used. The magnitude response is computed exactly — not approximated.',
          },
          {
            n: '05', title: 'Exporting EQ Settings',
            body: 'CurveLab exports to Equalizer APO / Peace, Wavelet GraphicEQ, Poweramp-style text, plain text, and generic JSON. Copy and paste into your EQ app of choice.',
          },
          {
            n: '06', title: 'Limitations',
            body: 'CurveLab is an MVP. Measurements vary by rig, insertion depth, coupler type, and individual ear anatomy. High-frequency corrections above 8–10 kHz are less reliable. Narrow dips should not be aggressively boosted. Always adjust by ear after applying.',
          },
        ].map(s => (
          <div key={s.n} className="glass-card animate-fadeup-2" style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a06bf0', fontFamily: 'ui-monospace,Menlo,monospace', marginBottom: 8 }}>{s.n}</div>
            <div style={{ fontSize: 17, fontWeight: 650, marginBottom: 10, letterSpacing: '-0.01em' }}>{s.title}</div>
            <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{s.body}</div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/generator" style={{
            display: 'inline-block', padding: '14px 28px', borderRadius: 15,
            fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none',
            background: 'linear-gradient(180deg,#6a9bff,#a06bf0)',
            boxShadow: '0 8px 28px rgba(108,120,240,0.45)',
          }}>
            Try the Generator →
          </Link>
        </div>
      </div>
    </div>
  )
}

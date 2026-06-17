// Blobs use radial gradients only — NO filter:blur (that's the scroll-lag killer).
// A radial gradient with a wide soft stop looks identical at a fraction of the GPU cost.
export default function GlowBlobs() {
  return (
    <>
      <div
        className="animate-float-glow"
        style={{
          position: 'absolute', top: -220, left: -180,
          width: 760, height: 760, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,155,255,0.26) 0%, rgba(91,155,255,0.10) 35%, transparent 68%)',
          pointerEvents: 'none', willChange: 'transform',
        }}
      />
      <div
        className="animate-float-glow-r"
        style={{
          position: 'absolute', top: 60, right: -220,
          width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,100,240,0.22) 0%, rgba(160,100,240,0.08) 38%, transparent 68%)',
          pointerEvents: 'none', willChange: 'transform',
        }}
      />
      <div
        className="animate-float-glow-2"
        style={{
          position: 'absolute', bottom: -260, left: '34%',
          width: 640, height: 640, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(70,190,170,0.12) 0%, rgba(70,190,170,0.04) 40%, transparent 68%)',
          pointerEvents: 'none', willChange: 'transform',
        }}
      />
      <div
        className="animate-float-glow"
        style={{
          position: 'absolute', top: '50%', right: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,110,170,0.10) 0%, rgba(240,110,170,0.03) 40%, transparent 68%)',
          pointerEvents: 'none', willChange: 'transform',
          animationDuration: '25s', animationDelay: '-10s',
        }}
      />
    </>
  )
}

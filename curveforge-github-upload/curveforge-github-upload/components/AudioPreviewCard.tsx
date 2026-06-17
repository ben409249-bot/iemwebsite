'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import GlassCard from './GlassCard'
import type { FitFilter } from '../lib/dsp/optimizer'

interface Props {
  filters: FitFilter[]
  preamp: number
}

type Signal = 'pink' | 'white' | 'sweep' | 'music'

const SIGNALS: Array<{ key: Signal; label: string }> = [
  { key: 'pink',  label: 'Pink Noise' },
  { key: 'white', label: 'White Noise' },
  { key: 'sweep', label: '20→20k Sweep' },
  { key: 'music', label: 'Your Music' },
]

function buildPinkBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 5
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759
    b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856
    b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11
    b6 = w * 0.115926
  }
  return buf
}

function buildWhiteBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 3
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.25
  return buf
}

interface AudioGraph {
  ctx: AudioContext
  source: AudioBufferSourceNode | OscillatorNode
  eqBank: BiquadFilterNode[]
  bypassGain: GainNode
  eqGain: GainNode
  outGain: GainNode
  analyser: AnalyserNode
  isMusic: boolean
  startedAt: number
  duration: number
}

export default function AudioPreviewCard({ filters, preamp }: Props) {
  const [playing, setPlaying] = useState(false)
  const [signal, setSignal] = useState<Signal>('pink')
  const [eqOn, setEqOn] = useState(true)
  const [level, setLevel] = useState(0)
  const [musicBuf, setMusicBuf] = useState<AudioBuffer | null>(null)
  const [musicName, setMusicName] = useState<string | null>(null)
  const [musicLoading, setMusicLoading] = useState(false)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const graphRef = useRef<AudioGraph | null>(null)
  const rafRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Persist decoded AudioContext for music decoding (lives outside playback)
  const decodeCtxRef = useRef<AudioContext | null>(null)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    graphRef.current?.ctx.close().catch(() => {})
    graphRef.current = null
    setPlaying(false)
    setLevel(0)
    setProgress(0)
  }, [])

  useEffect(() => () => { stop(); decodeCtxRef.current?.close().catch(() => {}) }, [stop])

  // Live A/B crossfade
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    const now = g.ctx.currentTime
    const ramp = 0.08
    g.eqGain.gain.cancelScheduledValues(now)
    g.bypassGain.gain.cancelScheduledValues(now)
    g.eqGain.gain.setTargetAtTime(eqOn ? 1 : 0, now, ramp)
    g.bypassGain.gain.setTargetAtTime(eqOn ? 0 : 1, now, ramp)
  }, [eqOn])

  // Live filter retune
  useEffect(() => {
    const g = graphRef.current
    if (!g) return
    for (let i = 0; i < g.eqBank.length; i++) {
      const fl = filters[i]
      const node = g.eqBank[i]
      if (fl) {
        node.type = fl.type === 'PK' ? 'peaking' : fl.type === 'LS' ? 'lowshelf' : 'highshelf'
        node.frequency.setTargetAtTime(fl.fc, g.ctx.currentTime, 0.02)
        node.gain.setTargetAtTime(fl.gain, g.ctx.currentTime, 0.02)
        node.Q.setTargetAtTime(fl.q, g.ctx.currentTime, 0.02)
      } else {
        node.gain.setTargetAtTime(0, g.ctx.currentTime, 0.02)
      }
    }
    g.outGain.gain.setTargetAtTime(Math.pow(10, Math.min(preamp, 0) / 20), g.ctx.currentTime, 0.05)
  }, [filters, preamp])

  async function handleMusicFile(file: File) {
    setMusicLoading(true)
    setMusicError(null)
    setMusicName(file.name)
    try {
      // Lazily create the decode context (separate from playback so we can
      // swap sources without losing the decoded buffer).
      if (!decodeCtxRef.current) {
        decodeCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const buffer = await file.arrayBuffer()
      const decoded = await decodeCtxRef.current.decodeAudioData(buffer)
      setMusicBuf(decoded)
      setSignal('music')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not decode this file'
      setMusicError(msg)
      setMusicBuf(null)
    } finally {
      setMusicLoading(false)
    }
  }

  function play() {
    if (playing) { stop(); return }
    if (signal === 'music' && !musicBuf) {
      fileInputRef.current?.click()
      return
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256

    const outGain = ctx.createGain()
    outGain.gain.value = Math.pow(10, Math.min(preamp, 0) / 20)

    const eqGain = ctx.createGain()
    const bypassGain = ctx.createGain()
    eqGain.gain.value = eqOn ? 1 : 0
    bypassGain.gain.value = eqOn ? 0 : 1

    const eqBank: BiquadFilterNode[] = []
    for (let i = 0; i < 10; i++) {
      const bq = ctx.createBiquadFilter()
      bq.type = 'peaking'
      bq.frequency.value = 1000
      bq.gain.value = 0
      bq.Q.value = 1
      eqBank.push(bq)
    }
    for (let i = 0; i < eqBank.length; i++) {
      const fl = filters[i]
      if (!fl) continue
      eqBank[i].type = fl.type === 'PK' ? 'peaking' : fl.type === 'LS' ? 'lowshelf' : 'highshelf'
      eqBank[i].frequency.value = fl.fc
      eqBank[i].gain.value = fl.gain
      eqBank[i].Q.value = fl.q
    }
    for (let i = 0; i < eqBank.length - 1; i++) eqBank[i].connect(eqBank[i + 1])

    let source: AudioBufferSourceNode | OscillatorNode
    let isMusic = false
    let duration = 0

    if (signal === 'sweep') {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(20, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 12)
      osc.start()
      osc.stop(ctx.currentTime + 12.5)
      osc.onended = () => { if (graphRef.current?.ctx === ctx) stop() }
      duration = 12.5
      source = osc
    } else if (signal === 'music' && musicBuf) {
      const src = ctx.createBufferSource()
      src.buffer = musicBuf
      src.loop = false
      src.onended = () => { if (graphRef.current?.ctx === ctx) stop() }
      src.start()
      duration = musicBuf.duration
      isMusic = true
      source = src
    } else {
      const buf = signal === 'pink' ? buildPinkBuffer(ctx) : buildWhiteBuffer(ctx)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      src.start()
      duration = 0
      source = src
    }

    source.connect(bypassGain)
    source.connect(eqBank[0])
    eqBank[eqBank.length - 1].connect(eqGain)

    eqGain.connect(outGain)
    bypassGain.connect(outGain)
    outGain.connect(analyser)
    analyser.connect(ctx.destination)

    const startedAt = ctx.currentTime
    graphRef.current = { ctx, source, eqBank, bypassGain, eqGain, outGain, analyser, isMusic, startedAt, duration }
    setPlaying(true)

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128
        if (v > peak) peak = v
      }
      setLevel(peak)
      const g = graphRef.current
      if (g && g.isMusic && g.duration > 0) {
        setProgress(Math.min(1, (ctx.currentTime - g.startedAt) / g.duration))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function clearMusic() {
    if (playing) stop()
    setMusicBuf(null)
    setMusicName(null)
    setMusicError(null)
    setProgress(0)
    setSignal('pink')
  }

  const bars = 14

  return (
    <GlassCard animDelay="0.38s" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,Menlo,monospace', textTransform: 'uppercase' }}>
          Audio Preview
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Web Audio · A/B switchable live</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SIGNALS.map(s => (
            <button key={s.key} onClick={() => {
              if (playing) stop()
              if (s.key === 'music' && !musicBuf && !musicLoading) {
                fileInputRef.current?.click()
              }
              setSignal(s.key)
            }}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: signal === s.key ? 600 : 400,
                cursor: 'pointer', border: signal === s.key ? '1px solid rgba(91,155,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: signal === s.key ? 'rgba(91,155,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: signal === s.key ? '#9bbcff' : 'rgba(255,255,255,0.55)',
                transition: 'all .18s',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        <button onClick={() => setEqOn(v => !v)}
          title="A/B compare — toggle EQ live while sound is playing"
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, fontSize: 12,
            fontWeight: 600, cursor: 'pointer', transition: 'all .18s',
            border: eqOn ? '1px solid rgba(160,100,240,0.5)' : '1px solid rgba(255,255,255,0.1)',
            background: eqOn ? 'rgba(160,100,240,0.15)' : 'rgba(255,255,255,0.04)',
            color: eqOn ? '#c07cf5' : 'rgba(255,255,255,0.45)',
          }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: eqOn ? '#c07cf5' : 'rgba(255,255,255,0.25)',
            boxShadow: eqOn ? '0 0 8px rgba(192,124,245,0.7)' : 'none',
            transition: 'all .18s',
          }} />
          EQ {eqOn ? 'On' : 'Off (A/B)'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
        hidden
        onChange={e => e.target.files?.[0] && handleMusicFile(e.target.files[0])}
      />

      {/* Music status */}
      {signal === 'music' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(91,155,255,0.05)', border: '1px solid rgba(91,155,255,0.18)' }}>
          {musicLoading ? (
            <span style={{ fontSize: 12, color: '#9bbcff' }}>Decoding {musicName}…</span>
          ) : musicError ? (
            <>
              <span style={{ fontSize: 12, color: '#ff8a8a' }}>{musicError}</span>
              <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>try again</button>
            </>
          ) : musicBuf ? (
            <>
              <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {musicName} · {musicBuf.duration.toFixed(1)}s · {musicBuf.sampleRate / 1000}kHz · {musicBuf.numberOfChannels}ch
              </span>
              <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>swap</button>
              <button onClick={clearMusic} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Drop an audio file or click to choose. MP3 / FLAC / WAV / M4A — your music, A/B'd against your EQ.</span>
              <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: '#9bbcff', background: 'rgba(91,155,255,0.15)', border: '1px solid rgba(91,155,255,0.4)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>Choose file</button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={play}
          disabled={signal === 'music' && !musicBuf && !musicLoading}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: playing
              ? 'linear-gradient(135deg,rgba(255,100,100,0.3),rgba(255,60,60,0.15))'
              : 'linear-gradient(135deg,rgba(91,155,255,0.35),rgba(160,100,240,0.25))',
            boxShadow: playing ? '0 0 24px rgba(255,80,80,0.4)' : '0 0 24px rgba(91,155,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s',
            opacity: (signal === 'music' && !musicBuf) ? 0.5 : 1,
          }}>
          {playing
            ? <span style={{ width: 14, height: 14, background: 'rgba(255,120,120,0.9)', borderRadius: 3 }} />
            : <span style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '9px 0 9px 16px', borderColor: 'transparent transparent transparent rgba(160,200,255,0.9)', marginLeft: 3 }} />
          }
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36 }}>
            {Array.from({ length: bars }, (_, i) => {
              const threshold = i / bars
              const active = playing && level > threshold * 0.7
              const hue = eqOn ? `rgba(160,100,240,${active ? 0.85 : 0.12})` : `rgba(91,155,255,${active ? 0.75 : 0.1})`
              const barH = 10 + (i / bars) * 26
              return (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  height: barH,
                  background: hue,
                  transition: 'background 0.05s',
                }} />
              )
            })}
          </div>
          {playing && signal === 'music' && musicBuf && (
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg,#5b9bff,#a06bf0)', transition: 'width .1s linear' }} />
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          {playing ? (eqOn ? '● EQ' : '● Raw') : 'stopped'}
        </div>
      </div>
    </GlassCard>
  )
}

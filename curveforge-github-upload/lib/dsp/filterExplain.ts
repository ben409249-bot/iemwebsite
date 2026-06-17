import type { FitFilter } from './optimizer'

// Plain-English one-liner per filter — runs through the same domain rules an
// audio reviewer would use ("pinna gain", "presence dip", etc.).
export function explainFilter(f: FitFilter): string {
  const { type, fc, gain } = f
  const boost = gain > 0
  const big = Math.abs(gain) >= 2.5
  const mag = big ? 'big ' : Math.abs(gain) < 1 ? 'gentle ' : ''

  if (type === 'LS') {
    return boost
      ? `${mag}bass shelf — adds weight & sub-rumble`
      : `${mag}bass cut — tightens up bloated low-end`
  }
  if (type === 'HS') {
    return boost
      ? `${mag}air shelf — opens up the top end`
      : `${mag}treble shelf — calms harsh upper register`
  }

  // Peaking — name the band
  if (fc < 80)   return boost ? `${mag}sub-bass lift (${Math.round(fc)} Hz) — rumble`
                              : `${mag}sub-bass cut (${Math.round(fc)} Hz) — cleans mud`
  if (fc < 200)  return boost ? `${mag}upper-bass lift (${Math.round(fc)} Hz) — fullness`
                              : `${mag}upper-bass cut (${Math.round(fc)} Hz) — removes boom`
  if (fc < 500)  return boost ? `${mag}low-mid lift (${Math.round(fc)} Hz) — warmth & body`
                              : `${mag}low-mid cut (${Math.round(fc)} Hz) — reduces muddiness`
  if (fc < 1500) return boost ? `${mag}mid lift (${Math.round(fc)} Hz) — vocal presence`
                              : `${mag}mid cut (${Math.round(fc)} Hz) — reduces honkiness`
  if (fc < 4000) return boost ? `${mag}pinna gain (${(fc/1000).toFixed(1)} kHz) — vocal clarity`
                              : `${mag}upper-mid cut (${(fc/1000).toFixed(1)} kHz) — tames shoutiness`
  if (fc < 8000) return boost ? `${mag}presence boost (${(fc/1000).toFixed(1)} kHz) — bite & detail`
                              : `${mag}presence cut (${(fc/1000).toFixed(1)} kHz) — tames harshness/sibilance`
  if (fc < 12000) return boost ? `${mag}upper-treble lift (${(fc/1000).toFixed(0)} kHz) — sparkle`
                               : `${mag}upper-treble cut (${(fc/1000).toFixed(0)} kHz) — softens hot peak`
  return boost ? `${mag}air lift (${(fc/1000).toFixed(0)} kHz) — extension`
               : `${mag}air cut (${(fc/1000).toFixed(0)} kHz) — removes hash`
}

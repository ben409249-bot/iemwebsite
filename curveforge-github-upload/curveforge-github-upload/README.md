# CurveForge

Auto-PEQ for IEMs — upload a measurement, choose a target, generate parametric EQ filters, export to any EQ app.

## Setup

```bash
cd curveforge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|---|---|
| `/` | Home page with hero and feature cards |
| `/generator` | The main PEQ tool |
| `/how-it-works` | Algorithm explanation |

## CSV Format

Any of these column names work:

```
frequency,response
freq,db
Frequency,Amplitude
Hz,dB
```

Delimiters: comma, semicolon, tab, or whitespace. Comments starting with `#` or `//` are ignored. At least 20 valid data points required.

Example:

```csv
frequency,response
20,-8.2
50,-5.1
100,-1.4
1000,0
3000,4.1
10000,2.2
20000,-3.5
```

## Export Formats

| Format | Notes |
|---|---|
| Equalizer APO | Works with Peace. Direct ParametricEQ.txt format. |
| Wavelet | GraphicEQ-sampled profile. Compatibility varies by version. |
| Poweramp | Manual entry format — not guaranteed import-compatible. |
| Generic JSON | `{ preamp, filters[] }` — use with any custom tool. |
| Peace | Same as Equalizer APO format. |
| Plain Text | Human-readable list. |

## PEQ Algorithm

1. Build 170-point log-spaced frequency grid (20 Hz – 20 kHz).
2. Interpolate measurement and target curves onto the grid.
3. Normalize both at 1 kHz (subtract value at 1000 Hz).
4. Compute error = target − measured.
5. Greedy filter placement: find largest error, place biquad (PK/LS/HS), subtract its response, repeat.
6. Candidate search: test 5 × 4 × 5 frequency/gain/Q combinations per filter slot.
7. 3 passes of coordinate descent refinement.
8. Preamp = −(max positive EQ gain) − 1 dB.

Filter math: RBJ Audio EQ Cookbook (fs = 48000 Hz). Magnitude computed exactly — not approximated.

## Limitations

- This MVP is not as mathematically advanced as mature AutoEQ implementations.
- Measurements vary by rig, insertion depth, coupler type, and ear anatomy.
- High-frequency corrections above 8–10 kHz are less reliable.
- Narrow dips should not be aggressively boosted.
- Always adjust by ear after applying the generated filters.
- Built-in headphone curves are simulated (not real measurements) — replace with a real measurement database for production use.

## Future Features

- Built-in IEM measurement database (oratory1990, Crinacle, Rtings)
- Built-in target library (Harman, Diffuse Field, Free Field)
- Shareable presets via URL
- Better nonlinear optimizer (gradient descent / L-BFGS)
- Comparison of two IEMs on one graph
- Make one IEM sound like another
- Audio demo player with IR convolution
- Preset cloud gallery
- Mobile app export (AUNBandEQ format)

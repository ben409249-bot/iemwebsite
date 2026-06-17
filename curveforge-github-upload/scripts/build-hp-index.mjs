#!/usr/bin/env node
/**
 * Builds public/hp-index.json from the AutoEQ GitHub repository.
 *
 * Usage:
 *   node scripts/build-hp-index.mjs
 *   node scripts/build-hp-index.mjs <github_token>   (recommended — skips rate limits)
 *   GITHUB_TOKEN=ghp_xxx node scripts/build-hp-index.mjs
 *
 * Requires Node 18+ (native fetch).
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'hp-index.json')

const TOKEN = process.argv[2] || process.env.GITHUB_TOKEN || ''
const OWNER = 'jaakkopasanen'
const REPO  = 'AutoEq'
const REF   = 'master'
const BASE_RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}`
const BASE_API = `https://api.github.com/repos/${OWNER}/${REPO}`

const HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'CurveLab-IndexBuilder/1.0',
  ...(TOKEN ? { Authorization: `token ${TOKEN}` } : {}),
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function apiGet(url) {
  const res = await fetch(url, { headers: HEADERS })
  const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? 999)
  if (remaining < 5) {
    const reset = res.headers.get('x-ratelimit-reset')
    const waitSec = reset ? Math.ceil(Number(reset) - Date.now() / 1000) + 5 : 60
    console.warn(`  ⚠ Rate limit hit. Waiting ${waitSec}s…`)
    await sleep(waitSec * 1000)
    return apiGet(url)
  }
  if (res.status === 403 || res.status === 429) {
    console.warn(`  ⚠ Rate limited (${res.status}). Waiting 60s…`)
    await sleep(60000)
    return apiGet(url)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${url}\n${body.slice(0, 200)}`)
  }
  return res.json()
}

function typeFromDir(dirName) {
  const d = dirName.toLowerCase()
  if (d.includes('in-ear') || d.includes('iem') || d.includes('inear') || d === 'earbud') return 'In-ear'
  if (d.includes('wireless') || d.includes('bluetooth')) return 'Wireless'
  return 'Over-ear'
}

const KNOWN_BRANDS = [
  'Campfire Audio', 'Audio-Technica', 'Bowers & Wilkins', 'Dan Clark Audio',
  'Empire Ears', 'Fir Audio', 'JH Audio', 'Kiwi Ears', 'Lime Ears',
  'Unique Melody', 'Vision Ears', 'Tin HiFi', 'Tin Hifi', 'Noble Audio',
  'Custom Art', 'Sennheiser', 'Beyerdynamic', 'HiFiMan', 'Sony', 'Apple',
  'Jabra', 'Bose', 'AKG', 'Focal', 'Audeze', 'Shure', 'Etymotic',
  'Moondrop', 'Thieaudio', 'Letshuoer', 'Tripowin', 'Tangzu', 'Hidizs',
  'Simgot', 'Truthear', 'Yanyin', 'Softears', 'Elysian', 'FiiO', 'DUNU',
  'Kinera', 'BGVP', 'CCA', 'TRN', 'Penon', 'Fearless', 'Sivga',
  'Kennerton', 'ZMF', 'Grado', 'Koss', 'Meze', 'Denon', 'Pioneer',
  'Yamaha', 'Philips', 'Samsung', 'Skullcandy', 'Beats', 'JBL', 'Anker',
  'Soundcore', 'Drop', 'Final', 'Seeaudio', 'Celest', 'BLON', 'Brainwavz',
  'Massdrop', '1MORE', 'Westone', 'Etymotic', 'Dethonray', 'iFi',
]

function inferBrand(name) {
  for (const b of KNOWN_BRANDS) {
    if (name.toLowerCase().startsWith(b.toLowerCase())) return b
  }
  // Heuristic: first token before space, parens, or hyphen
  const m = name.match(/^([A-Z][^\s\-_(]+)/)
  return m ? m[1] : name.split(/[\s\-_(]/)[0]
}

function toId(source, name) {
  return `${source}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

async function getSubtreeFiles(sourceSha, sourceName) {
  const data = await apiGet(`${BASE_API}/git/trees/${sourceSha}?recursive=1`)
  if (data.truncated) {
    console.warn(`  ⚠ Tree for ${sourceName} was truncated — some entries may be missing`)
  }
  return data.tree || []
}

async function main() {
  if (!TOKEN) {
    console.log('ℹ No GitHub token provided (60 req/hour unauthenticated).')
    console.log('  Pass a token as arg or GITHUB_TOKEN env for faster access.\n')
  }

  console.log('Listing measurement sources…')
  const sources = await apiGet(`${BASE_API}/contents/measurements`)
  const sourceDirs = sources.filter(s => s.type === 'dir')
  console.log(`Found ${sourceDirs.length} sources: ${sourceDirs.map(s => s.name).join(', ')}\n`)

  const seen = new Map()

  for (const src of sourceDirs) {
    process.stdout.write(`Processing ${src.name}… `)

    let treeItems
    try {
      treeItems = await getSubtreeFiles(src.sha, src.name)
      await sleep(400)
    } catch (e) {
      console.log(`✗ skipped (${e.message.split('\n')[0]})`)
      continue
    }

    // Two patterns:
    //   data/{type}/{name}.csv              (oratory1990, Innerfidelity, etc.)
    //   data/{type}/{rig}/{name}.csv        (rtings, HypetheSonics — rig is coupler name)
    const RE_DIRECT = /^data\/([^/]+)\/([^/]+)\.csv$/
    const RE_RIG    = /^data\/([^/]+)\/[^/]+\/([^/]+)\.csv$/

    let count = 0
    for (const item of treeItems) {
      if (item.type !== 'blob') continue

      let typeDir = null, hpName = null
      let m = item.path.match(RE_DIRECT)
      if (m) {
        [, typeDir, hpName] = m
      } else {
        m = item.path.match(RE_RIG)
        if (m) [, typeDir, hpName] = m
      }
      if (!typeDir || !hpName) continue

      const name = hpName  // regex captures name without .csv extension

      const key = `${src.name}|${name}`
      if (seen.has(key)) continue

      const fullPath = `measurements/${src.name}/${item.path}`
      seen.set(key, {
        id: toId(src.name, name),
        name,
        brand: inferBrand(name),
        type: typeFromDir(typeDir),
        source: src.name,
        rawUrl: `${BASE_RAW}/${encodePath(fullPath)}`,
      })
      count++
    }

    console.log(`${count} headphones`)
  }

  const entries = Array.from(seen.values())
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log(`\n✓ Total: ${entries.length.toLocaleString()} headphones across all sources`)

  mkdirSync(join(__dirname, '..', 'public'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(entries))
  const kb = (Buffer.byteLength(JSON.stringify(entries)) / 1024).toFixed(0)
  console.log(`✓ Saved → public/hp-index.json (${kb} KB)`)
}

main().catch(err => { console.error('\n✗ ' + err.message); process.exit(1) })

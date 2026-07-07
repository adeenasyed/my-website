// Generates public/stars/hyg.json from the public-domain HYG database (v4.1).
//
// Output: a compact JSON of naked-eye stars as [raDeg, decDeg, mag, bv] tuples.
// Also prints the catalog rows for a curated set of named stars, so their
// coordinates can be baked into src/data/celestial.js.
//
// Run: node scripts/build-star-catalog.mjs
// Needs network once; the generated JSON is committed and used offline at runtime.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HYG_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
const MAG_LIMIT = 6.5

// Curated stars we want exact coordinates for (matched on the `proper` column).
const CURATED = [
  'Sirius', 'Vega', 'Arcturus', 'Capella', 'Rigel', 'Betelgeuse', 'Procyon',
  'Altair', 'Aldebaran', 'Deneb', 'Pollux', 'Antares', 'Spica', 'Polaris',
]

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'stars', 'hyg.json')

// Minimal CSV line parser that respects double-quoted fields.
function parseLine(line) {
  const out = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { out.push(field); field = '' }
    else field += c
  }
  out.push(field)
  return out
}

async function main() {
  console.log('Fetching HYG catalog…')
  const res = await fetch(HYG_URL)
  if (!res.ok) throw new Error(`HYG download failed: ${res.status}`)
  const text = await res.text()

  const lines = text.split('\n')
  const header = parseLine(lines[0])
  const col = Object.fromEntries(header.map((h, i) => [h.replace(/"/g, ''), i]))
  const { ra, dec, mag, ci, proper, spect, con, dist } = col

  const stars = []
  const curatedRows = {}

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const f = parseLine(line)
    const name = f[proper]
    if (name === 'Sol') continue // the Sun
    const m = parseFloat(f[mag])
    if (!Number.isFinite(m) || m > MAG_LIMIT) continue

    const raDeg = parseFloat(f[ra]) * 15 // hours -> degrees
    const decDeg = parseFloat(f[dec])
    const bv = f[ci] === '' ? 0 : parseFloat(f[ci])
    if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) continue

    stars.push([
      round(raDeg, 3),
      round(decDeg, 3),
      round(m, 2),
      round(bv, 2),
    ])

    if (name && CURATED.includes(name)) {
      curatedRows[name] = {
        name,
        raDeg: round(raDeg, 3),
        decDeg: round(decDeg, 3),
        magnitude: round(m, 2),
        bv: round(bv, 2),
        spectralType: f[spect],
        con: f[con],
        distLy: round(parseFloat(f[dist]) * 3.26156, 1),
      }
    }
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(stars))
  console.log(`Wrote ${stars.length} stars (mag <= ${MAG_LIMIT}) to ${OUT}`)
  console.log(`File size: ${(JSON.stringify(stars).length / 1024).toFixed(0)} KB`)

  console.log('\n--- Curated star rows (bake into src/data/celestial.js) ---')
  for (const n of CURATED) {
    console.log(curatedRows[n] ? JSON.stringify(curatedRows[n]) : `MISSING: ${n}`)
  }
}

function round(n, d) {
  const p = 10 ** d
  return Math.round(n * p) / p
}

main().catch((e) => { console.error(e); process.exit(1) })

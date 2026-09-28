import { NextResponse } from 'next/server'
import { redis, rateLimit } from '../redis.js'

const ENTRIES_KEY = 'visitor-book:entries:v1'
const ALLOWED_TOOLS = new Set(['pencil', 'eraser'])
const MAX_ENTRIES = 40
const MAX_STROKES = 500
const MAX_TOTAL_POINTS = 5_000
const MAX_BODY_BYTES = 250_000

function sanitizeStroke(stroke) {
  if (!stroke || !ALLOWED_TOOLS.has(stroke.tool) || !Array.isArray(stroke.points)) return null
  if (!stroke.points.length) return null
  const points = stroke.points.map((point) => {
    if (!Array.isArray(point) || point.length !== 2) return null
    const [x, y] = point
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return null
    return [Math.round(x * 10_000) / 10_000, Math.round(y * 10_000) / 10_000]
  })
  if (points.some((point) => point === null)) return null
  return { tool: stroke.tool, points }
}

export async function GET() {
  try {
    const entries = await redis.lrange(ENTRIES_KEY, 0, MAX_ENTRIES - 1)
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('visitor-book:', error)
    return NextResponse.json({ entries: [] })
  }
}

export async function POST(request) {
  if (!await rateLimit('visitor-book', request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body
  try {
    const bytes = await request.arrayBuffer()
    if (bytes.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Drawing is too large' }, { status: 413 })
    }
    body = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return NextResponse.json({ error: 'Invalid drawing' }, { status: 400 })
  }

  if (!Array.isArray(body?.strokes) || !body.strokes.length || body.strokes.length > MAX_STROKES) {
    return NextResponse.json({ error: 'Invalid drawing' }, { status: 400 })
  }
  const strokes = body.strokes.map(sanitizeStroke)
  if (strokes.some((stroke) => stroke === null)) {
    return NextResponse.json({ error: 'Invalid drawing' }, { status: 400 })
  }
  const totalPoints = strokes.reduce((total, stroke) => total + stroke.points.length, 0)
  if (totalPoints > MAX_TOTAL_POINTS) {
    return NextResponse.json({ error: 'Drawing is too large' }, { status: 413 })
  }

  const entry = { strokes }

  try {
    await redis.multi()
      .lpush(ENTRIES_KEY, entry)
      .ltrim(ENTRIES_KEY, 0, MAX_ENTRIES - 1)
      .exec()
    return NextResponse.json({ entry, maxEntries: MAX_ENTRIES }, { status: 201 })
  } catch (error) {
    console.error('visitor-book:', error)
    return NextResponse.json({ error: 'Visitor book is unavailable' }, { status: 503 })
  }
}

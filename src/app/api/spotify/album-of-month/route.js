import { NextResponse } from 'next/server'
import { spotifyFetch } from '../client.js'
import { redis, rateLimit } from '../redis.js'

const CACHE_KEY = 'spotify:album-of-month'
const CACHE_TTL = 24 * 60 * 60

export async function GET(request) {
  if (!await rateLimit('album-of-month', request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const cached = await redis.get(CACHE_KEY)
  if (cached) return NextResponse.json(cached)

  try {
    const data = await spotifyFetch('/me/top/tracks?limit=50&time_range=short_term')

    const albums = {}
    for (const [index, track] of data.items.entries()) {
      const album = track.album
      if (!albums[album.id]) {
        albums[album.id] = {
          image: album.images?.[0]?.url,
          name: album.name,
          artist: album.artists.map((a) => a.name).join(', '),
          score: 0,
        }
      }
      albums[album.id].score += (50 - index) ** 2
    }

    const album = Object.values(albums).sort((a, b) => b.score - a.score)[0]
    const payload = { image: album.image, name: album.name, artist: album.artist }

    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL })
    return NextResponse.json(payload)
  } catch (err) {
    console.error('spotify album-of-month failed:', err)
    return NextResponse.json({ error: 'Failed to fetch album of the month' }, { status: 500 })
  }
}

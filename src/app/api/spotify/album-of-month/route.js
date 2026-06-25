import { NextResponse } from 'next/server'
import { spotifyFetch } from '../client.js'

const ALBUM_OF_MONTH_TTL = 24 * 60 * 60 * 1000
let cache = null

export async function GET() {
  if (cache && Date.now() - cache.timestamp < ALBUM_OF_MONTH_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const data = await spotifyFetch('/me/top/tracks?limit=50&time_range=short_term')

    const albums = {}
    for (const [index, track] of data.items.entries()) {
      const album = track.album
      const score = 50 - index
      if (!albums[album.id]) {
        albums[album.id] = {
          image: album.images?.[0]?.url,
          name: album.name,
          artist: album.artists.map((a) => a.name).join(', '),
          score: 0,
        }
      }
      albums[album.id].score += score
    }

    const album = Object.values(albums).sort((a, b) => b.score - a.score)[0]

    const payload = { image: album.image, name: album.name, artist: album.artist }
    cache = { data: payload, timestamp: Date.now() }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('spotify album-of-month failed:', err)
    return NextResponse.json({ error: 'Failed to fetch album of the month' }, { status: 500 })
  }
}

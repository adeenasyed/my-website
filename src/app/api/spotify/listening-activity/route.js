import { NextResponse } from 'next/server'
import { spotifyFetch } from '../client.js'
import { redis, rateLimit } from '../redis.js'

const CACHE_KEY = 'spotify:last-track'

export async function GET(request) {
  if (!await rateLimit('listening-activity', request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const data = await spotifyFetch('/me/player/currently-playing')
    if (data?.item) {
      const track = {
        albumImage: data.item.album.images[0].url,
        track: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(', '),
      }
      await redis.set(CACHE_KEY, track)
      return NextResponse.json({ playing: data.is_playing, ...track })
    }
  } catch (err) {
    console.error('spotify listening-activity:', err)
  }

  const lastTrack = await redis.get(CACHE_KEY)
  if (lastTrack) return NextResponse.json({ playing: false, ...lastTrack })
  return NextResponse.json({ playing: false })
}

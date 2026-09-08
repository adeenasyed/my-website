import { NextResponse } from 'next/server'
import { spotifyFetch, getTrack } from '../client.js'
import { rateLimit } from '../redis.js'

export async function GET(request) {
  if (!await rateLimit('listening-activity', request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const recentlyPlayed = await spotifyFetch('/me/player/recently-played?limit=1')
    const track = getTrack(recentlyPlayed.items[0].track)
    return NextResponse.json({ playing: false, ...track })
  } catch (err) {
    console.error('spotify last-played:', err)
  }

  return NextResponse.json({ playing: false })
}

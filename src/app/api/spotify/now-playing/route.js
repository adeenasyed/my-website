import { NextResponse } from 'next/server'
import { spotifyFetch, getTrack } from '../client.js'
import { rateLimit } from '../redis.js'

export async function GET(request) {
  if (!await rateLimit('listening-activity', request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const currentlyPlaying = await spotifyFetch('/me/player/currently-playing')
    if (currentlyPlaying?.item) {
      const track = getTrack(currentlyPlaying.item)
      return NextResponse.json({ playing: currentlyPlaying.is_playing, ...track })
    }
  } catch (err) {
    console.error('spotify now-playing:', err)
  }

  return NextResponse.json({ playing: false })
}

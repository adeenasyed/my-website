import { NextResponse } from 'next/server'
import { spotifyFetch } from '../client.js'

let lastTrack = null

export async function GET() {
  try {
    const data = await spotifyFetch('/me/player/currently-playing')
    if (data?.item) {
      lastTrack = {
        albumImage: data.item.album.images[0].url,
        track: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(', '),
      }
      return NextResponse.json({ playing: data.is_playing, ...lastTrack })
    }
  } catch (err) {
    console.error('spotify listening-activity:', err)
  }

  if (lastTrack) return NextResponse.json({ playing: false, ...lastTrack })
  return NextResponse.json({ playing: false })
}

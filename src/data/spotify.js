export function createSpotifyConnection(onChange) {
  let listeningActivity = null

  async function pollListeningActivity() {
    try {
      const res = await fetch('/api/spotify/listening-activity')
      const data = await res.json()
      if (!data?.track) return

      const changed = !listeningActivity ||
        listeningActivity.track !== data.track ||
        listeningActivity.artist !== data.artist ||
        listeningActivity.playing !== data.playing
      if (!changed) return

      listeningActivity = { albumImage: data.albumImage, playing: data.playing, track: data.track, artist: data.artist }
      onChange({ listeningActivity })
    } catch { }
  }

  pollListeningActivity()
  const intervalId = setInterval(pollListeningActivity, 30000)

  return { dispose: () => clearInterval(intervalId) }
}

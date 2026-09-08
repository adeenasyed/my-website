export function createSpotifyConnection(onChange) {
  let listeningActivity = null

  async function pollSpotify() {
    try {
      let res = await fetch('/api/spotify/now-playing')
      let data = await res.json()
      if (!data?.track && !listeningActivity) {
        res = await fetch('/api/spotify/last-played')
        data = await res.json()
      }
      if (!data?.track) {
        if (!listeningActivity) return
        data = { ...listeningActivity, playing: false }
      }

      const changed = !listeningActivity ||
        listeningActivity.track !== data.track ||
        listeningActivity.artist !== data.artist ||
        listeningActivity.playing !== data.playing
      if (!changed) return

      listeningActivity = { albumImage: data.albumImage, playing: data.playing, track: data.track, artist: data.artist }
      onChange({ listeningActivity })
    } catch { }
  }

  pollSpotify()
  const intervalId = setInterval(pollSpotify, 30000)

  return { dispose: () => clearInterval(intervalId) }
}

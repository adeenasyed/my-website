export function createSpotifyConnection(onChange) {
  let listeningActivity = null
  let albumOfMonth = null

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
      onChange({ listeningActivity, albumOfMonth })
    } catch { }
  }

  async function fetchAlbumOfMonth() {
    try {
      const res = await fetch('/api/spotify/album-of-month')
      const album = await res.json()
      if (!album?.name) return

      albumOfMonth = { image: album.image, name: album.name, artist: album.artist }
      onChange({ listeningActivity, albumOfMonth })
    } catch { }
  }

  pollListeningActivity()
  // fetchAlbumOfMonth()
  const intervalId = setInterval(pollListeningActivity, 30000)

  return { dispose: () => clearInterval(intervalId) }
}

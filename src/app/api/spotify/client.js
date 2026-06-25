let accessToken = null
let tokenExpiry = 0

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken

  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(`Error fetching Spotify token: ${data.error}`)
  accessToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000

  return accessToken
}

export async function spotifyFetch(endpoint) {
  let token = await getAccessToken()
  let res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) {
    tokenExpiry = 0
    token = await getAccessToken()
    res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  if (res.status === 204) return null
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${body}`)
  }
  return res.json()
}

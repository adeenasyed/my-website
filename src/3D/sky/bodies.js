import { Observer, Equator, Horizon, Illumination, Body } from 'astronomy-engine'
import { BODIES } from '@/data/celestial.js'

const DEG = Math.PI / 180
const AU_KM = 149597870.7

// Computes current positions of the Moon and naked-eye planets for the observer,
// returning only those above the horizon. Each entry carries alt/az (radians)
// for placement plus live magnitude/distance for the popup.
export function computeBodies(date, latitude, longitude, height = 76) {
  const observer = new Observer(latitude, longitude, height)
  const out = []

  for (const meta of BODIES) {
    const body = Body[meta.body]
    if (body === undefined) continue

    const eq = Equator(body, date, observer, true, true) // ra (h), dec (deg) of-date
    const hor = Horizon(date, observer, eq.ra, eq.dec, 'normal')
    if (hor.altitude <= 0) continue

    // The Sun has no phase illumination; fall back to its fixed magnitude.
    let magnitude = meta.magnitude
    if (magnitude === undefined) {
      try { magnitude = Illumination(body, date).mag } catch { magnitude = undefined }
    }

    const distanceText = meta.type === 'moon'
      ? `${Math.round(eq.dist * AU_KM).toLocaleString()} km`
      : `${eq.dist.toFixed(2)} AU`

    out.push({
      alt: hor.altitude * DEG,
      az: hor.azimuth * DEG,
      data: {
        name: meta.name,
        type: meta.type,
        constellation: null,
        magnitude: magnitude !== undefined ? Math.round(magnitude * 100) / 100 : undefined,
        distanceText,
        blurb: meta.blurb,
        color: meta.color,
      },
    })
  }

  return out
}

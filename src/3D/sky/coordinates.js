import * as THREE from 'three'
import { SiderealTime } from 'astronomy-engine'

// Equatorial (RA/Dec) -> local horizontal (alt/az) -> Three.js scene position.
//
// Scene convention: zenith = +Y, north = -Z, east = +X. This bakes a fixed
// Toronto orientation directly into star positions, so the celestial sphere
// needs no group rotation. Stars below the horizon land at -Y (under the room
// floor), naturally hidden.

const DEG = Math.PI / 180

const normalizeDeg = (d) => ((d % 360) + 360) % 360
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Local apparent sidereal time in hours for a given date + east longitude.
export function localSiderealTime(date, longitudeDeg) {
  const gast = SiderealTime(date) // Greenwich apparent sidereal time, hours
  return ((gast + longitudeDeg / 15) % 24 + 24) % 24
}

// raDeg/decDeg (J2000 catalog), latDeg (+N), lstHours -> { alt, az } in radians.
// Azimuth is measured clockwise from north (N=0, E=+90°), matching astronomy-engine.
export function equatorialToAltAz(raDeg, decDeg, latDeg, lstHours) {
  const H = normalizeDeg(lstHours * 15 - raDeg) * DEG
  const dec = decDeg * DEG
  const lat = latDeg * DEG

  const sinDec = Math.sin(dec)
  const cosDec = Math.cos(dec)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)

  const sinAlt = clamp(sinDec * sinLat + cosDec * cosLat * Math.cos(H), -1, 1)
  const alt = Math.asin(sinAlt)
  const cosAlt = Math.cos(alt)

  const sinAz = -cosDec * Math.sin(H) / cosAlt
  const cosAz = (sinDec - sinLat * sinAlt) / (cosAlt * cosLat)
  const az = Math.atan2(sinAz, cosAz)

  return { alt, az }
}

// alt/az (radians) -> scene position vector at the given radius.
export function altAzToScene(alt, az, radius, target = new THREE.Vector3()) {
  const cosAlt = Math.cos(alt)
  return target.set(
    radius * cosAlt * Math.sin(az),   // east  -> +X
    radius * Math.sin(alt),           // up    -> +Y
    -radius * cosAlt * Math.cos(az),  // north -> -Z
  )
}

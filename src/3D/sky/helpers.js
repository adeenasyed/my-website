import {
  Spherical,
  VectorFromSphere,
  Rotation_EQJ_EQD,
  RotateVector,
  EquatorFromVector,
  Horizon,
} from 'astronomy-engine'

const DEG_TO_RAD = Math.PI / 180

export function createAltAz(date, observer) {
  const rotation = Rotation_EQJ_EQD(date)

  return (raDeg, decDeg) => {
    const eqj = VectorFromSphere(new Spherical(decDeg, raDeg, 1), date)
    const eqd = RotateVector(rotation, eqj)
    const equator = EquatorFromVector(eqd)
    const horizon = Horizon(date, observer, equator.ra, equator.dec, 'normal')
    return { alt: horizon.altitude * DEG_TO_RAD, az: horizon.azimuth * DEG_TO_RAD }
  }
}

export function altAzToScene(alt, az, radius, target) {
  const cosAlt = Math.cos(alt)
  return target.set(
    radius * cosAlt * Math.sin(az),
    radius * Math.sin(alt),
    -radius * cosAlt * Math.cos(az),
  )
}

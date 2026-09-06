import * as THREE from 'three'
import { Observer, Equator, Horizon, Illumination, MoonPhase, Body } from 'astronomy-engine'
import { OBJECTS, BODIES } from '@/data/celestial.js'
import { CONSTELLATIONS } from '@/data/constellations.js'
import { createAltAz } from './helpers.js'
import { createStarShell, createIntroStarField } from './stars.js'
import { createConstellations } from './constellations.js'
import { createMarkers } from './markers.js'

const DEG_TO_RAD = Math.PI / 180
const KM_PER_AU = 149597870.7

function getDirectionDegrees(alt, az) {
  return {
    altDeg: alt * 180 / Math.PI,
    azDeg: ((az * 180 / Math.PI) % 360 + 360) % 360,
  }
}

function calculateVisibleBodies(date, observer, phase) {
  const bodies = []

  for (const metadata of BODIES) {
    const body = Body[metadata.name]
    const equator = Equator(body, date, observer, true, true)
    const horizon = Horizon(date, observer, equator.ra, equator.dec, 'normal')
    if (horizon.altitude <= 0) continue

    const magnitude = metadata.magnitude ?? Illumination(body, date).mag
    const distance = metadata.type === 'moon'
      ? { value: equator.dist * KM_PER_AU, unit: 'km' }
      : { value: equator.dist, unit: 'au' }
    const alt = horizon.altitude * DEG_TO_RAD
    const az = horizon.azimuth * DEG_TO_RAD

    bodies.push({
      alt,
      az,
      data: {
        name: metadata.name,
        type: metadata.type,
        magnitude: Math.round(magnitude * 100) / 100,
        distance,
        phase: metadata.type === 'moon' ? phase : undefined,
        ...getDirectionDegrees(alt, az),
      },
    })
  }

  return bodies
}

export function createCelestialSphere({ date, latitude, longitude, height, pixelRatio, aspect }) {
  const group = new THREE.Group()
  const introStars = createIntroStarField(pixelRatio, aspect)
  group.add(introStars.points)

  const observer = new Observer(latitude, longitude, height)
  const toAltAz = createAltAz(date, observer)
  const constellations = createConstellations(CONSTELLATIONS, toAltAz)
  group.add(constellations.group)
  let starShell = null
  let markers = null
  let introComplete = false
  let disposed = false

  const ready = (async () => {
    let catalog
    try {
      const response = await fetch('/hyg.json')
      catalog = await response.json()
    } catch (error) {
      console.error('Failed to load star catalog', error)
      return []
    }
    if (disposed) return []

    starShell = createStarShell(catalog, toAltAz, pixelRatio)
    group.add(starShell.points)

    const elongation = MoonPhase(date)
    const phase = {
      illuminated: (1 - Math.cos(elongation * DEG_TO_RAD)) / 2,
      waxing: elongation < 180,
    }

    const items = []
    for (const object of OBJECTS) {
      const { alt, az } = toAltAz(object.raDeg, object.decDeg)
      if (alt <= 0) continue
      items.push({
        alt,
        az,
        data: {
          name: object.name,
          type: object.type,
          catalog: object.catalog,
          magnitude: object.magnitude,
          colorIndex: object.colorIndex,
          distance: { value: object.distance, unit: 'ly' },
          ...getDirectionDegrees(alt, az),
        },
      })
    }
    items.push(...calculateVisibleBodies(date, observer, phase))

    markers = createMarkers(items)
    markers.group.visible = introComplete
    group.add(markers.group)
    return markers.interactables
  })()

  function update(delta) {
    if (markers) markers.update(delta)
  }

  function setIntroProgress(progress) {
    introStars.setIntroProgress(progress)
    starShell?.setIntroProgress(progress)
    introComplete = progress >= 1
    if (markers) markers.group.visible = introComplete
  }

  function dispose() {
    disposed = true
    introStars.dispose()
    constellations.dispose()
    starShell?.dispose()
    markers?.dispose()
  }

  return {
    group,
    update,
    ready,
    setIntroProgress,
    setConstellationsVisible: constellations.setVisible,
    dispose,
  }
}

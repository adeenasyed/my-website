import * as THREE from 'three'
import { Observer, Equator, Horizon, Illumination, Body } from 'astronomy-engine'
import { CURATED_STARS, DEEP_SKY, BODIES } from '@/data/celestial.js'
import { localSiderealTime, equatorialToAltAz, buildStarShell } from './catalog.js'
import { createMarkers } from './markers.js'

const DEG = Math.PI / 180
const AU_KM = 149597870.7
const DUST_COUNT = 3500
const DUST_OUTER = 135000
const DUST_INNER = 500

function formatLy(ly) {
  if (ly >= 1e6) return `${(ly / 1e6).toFixed(1)} million light-years`
  if (ly >= 1e4) return `${Math.round(ly / 1000)},000 light-years`
  return `${ly.toLocaleString()} light-years`
}

function fixedData(obj, alt, az) {
  return {
    name: obj.name,
    type: obj.type,
    catalog: obj.catalog,
    constellation: obj.constellation,
    magnitude: obj.magnitude,
    distanceText: formatLy(obj.distanceLy),
    spectralType: obj.spectralType,
    blurb: obj.blurb,
    ...direction(alt, az),
  }
}

function direction(alt, az) {
  return {
    altDeg: alt * 180 / Math.PI,
    azDeg: ((az * 180 / Math.PI) % 360 + 360) % 360,
  }
}

function computeBodies(date, latitude, longitude, height) {
  const observer = new Observer(latitude, longitude, height)
  const bodies = []

  for (const meta of BODIES) {
    const body = Body[meta.body]
    const equator = Equator(body, date, observer, true, true)
    const horizon = Horizon(date, observer, equator.ra, equator.dec, 'normal')
    if (horizon.altitude <= 0) continue

    const magnitude = meta.magnitude ?? Illumination(body, date).mag
    const distanceText = meta.type === 'moon'
      ? `${Math.round(equator.dist * AU_KM).toLocaleString()} km`
      : `${equator.dist.toFixed(2)} AU`

    bodies.push({
      alt: horizon.altitude * DEG,
      az: horizon.azimuth * DEG,
      color: meta.color,
      data: {
        name: meta.name,
        type: meta.type,
        magnitude: Math.round(magnitude * 100) / 100,
        distanceText,
        blurb: meta.blurb,
      },
    })
  }

  return bodies
}

function buildDust() {
  const positions = new Float32Array(DUST_COUNT * 3)
  const colors = new Float32Array(DUST_COUNT * 3)

  for (let i = 0; i < DUST_COUNT; i++) {
    let x, y, z, radius
    do {
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      radius = DUST_OUTER * Math.cbrt(Math.random())
      x = radius * Math.sin(phi) * Math.cos(theta)
      y = radius * Math.sin(phi) * Math.sin(theta)
      z = radius * Math.cos(phi)
    } while (radius < DUST_INNER)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    const brightness = 0.25 + Math.random() * 0.35
    colors[i * 3] = brightness
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    fog: false,
  })

  const dust = new THREE.Points(geometry, material)
  dust.frustumCulled = false
  return dust
}

export function createCelestialSphere({ date, latitude, longitude, height, pixelRatio }) {
  const group = new THREE.Group()
  const dust = buildDust()
  group.add(dust)

  const lst = localSiderealTime(date, longitude)
  let starShell = null
  let markers = null
  let disposed = false

  const ready = (async () => {
    let catalog
    try {
      const response = await fetch('/stars/hyg.json')
      catalog = await response.json()
    } catch (err) {
      console.error('Failed to load star catalog', err)
      return []
    }
    if (disposed) return []

    starShell = buildStarShell(catalog, latitude, lst, pixelRatio)
    group.add(starShell)

    const items = []
    for (const obj of [...CURATED_STARS, ...DEEP_SKY]) {
      const { alt, az } = equatorialToAltAz(obj.raDeg, obj.decDeg, latitude, lst)
      if (alt <= 0) continue
      items.push({ alt, az, data: fixedData(obj, alt, az) })
    }
    for (const body of computeBodies(date, latitude, longitude, height)) {
      items.push({ ...body, data: { ...body.data, ...direction(body.alt, body.az) } })
    }

    markers = createMarkers(items)
    group.add(markers.group)
    return markers.interactables
  })()

  function update(delta) {
    if (markers) markers.update(delta)
  }

  function dispose() {
    disposed = true
    dust.geometry.dispose()
    dust.material.dispose()
    starShell?.geometry.dispose()
    starShell?.material.dispose()
    markers?.dispose()
  }

  return { group, update, ready, dispose }
}

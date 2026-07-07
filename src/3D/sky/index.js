import * as THREE from 'three'
import { CURATED_STARS, DEEP_SKY } from '@/data/celestial.js'
import { localSiderealTime, equatorialToAltAz } from './coordinates.js'
import { buildStarShell } from './catalog.js'
import { computeBodies } from './bodies.js'
import { createMarkers } from './markers.js'
import { buildDust } from './dust.js'

// Real celestial sphere over Toronto, oriented by local sidereal time at load
// (fixed, no rotation). Returns a controller that plugs into the existing `stars`
// plumbing: `group` goes into the scene, `update` drives twinkle, `ready`
// resolves the interactable pick targets once the catalog has loaded.

function formatLy(ly) {
  if (ly >= 1e6) return `${(ly / 1e6).toFixed(1)} million light-years`
  if (ly >= 1e4) return `${Math.round(ly / 1000)},000 light-years`
  return `${ly.toLocaleString()} light-years`
}

// Curated fixed object (star / deep-sky) -> popup data shape.
function fixedData(o) {
  return {
    name: o.name,
    type: o.type,
    catalog: o.catalog,
    constellation: o.constellation,
    magnitude: o.magnitude,
    distanceText: formatLy(o.distanceLy),
    spectralType: o.spectralType,
    blurb: o.blurb,
  }
}

// Attach the object's sky direction (as seen from Toronto) for the "where to look" line.
function addDirection(data, alt, az) {
  data.altDeg = alt * 180 / Math.PI
  data.azDeg = ((az * 180 / Math.PI) % 360 + 360) % 360
  return data
}

export function createCelestialSphere({ date, latitude, longitude, height = 76, pixelRatio = 1 }) {
  const group = new THREE.Group()
  group.add(buildDust()) // available immediately for the intro warp

  const lst = localSiderealTime(date, longitude)
  let markers = null

  const ready = (async () => {
    let catalog
    try {
      const res = await fetch('/stars/hyg.json')
      catalog = await res.json()
    } catch (err) {
      console.error('Failed to load star catalog', err)
      return { interactables: [] }
    }

    group.add(buildStarShell(catalog, latitude, lst, pixelRatio))

    // Above-horizon curated objects: fixed stars + deep-sky, then moving bodies.
    const items = []
    for (const o of [...CURATED_STARS, ...DEEP_SKY]) {
      const { alt, az } = equatorialToAltAz(o.raDeg, o.decDeg, latitude, lst)
      if (alt <= 0) continue
      items.push({ alt, az, data: addDirection(fixedData(o), alt, az) })
    }
    for (const b of computeBodies(date, latitude, longitude, height)) {
      items.push({ alt: b.alt, az: b.az, data: addDirection(b.data, b.alt, b.az) })
    }

    markers = createMarkers(items)
    group.add(markers.group)
    return { interactables: markers.interactables }
  })()

  function update(delta) {
    if (markers) markers.update(delta)
  }

  function dispose() {
    if (markers) markers.dispose()
  }

  return { group, update, ready, dispose }
}

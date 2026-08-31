import * as THREE from 'three'
import { Observer, Equator, Horizon, Illumination, MoonPhase, Body } from 'astronomy-engine'
import { OBJECTS, BODIES } from '@/data/celestial.js'
import { CONSTELLATIONS } from '@/data/constellations.js'
import { createAltAz } from './coordinates.js'
import { buildStarShell, starColor } from './stars.js'
import { createConstellations } from './constellations.js'
import { createMarkers } from './markers.js'

const DEG = Math.PI / 180
const AU_KM = 149597870.7
const DUST_COUNT = 7500
const DUST_INTRO_EXTRA = 5000
const DUST_TOTAL = DUST_COUNT + DUST_INTRO_EXTRA
const DUST_OUTER = 135000
const DUST_INNER = 500
const DUST_TINT = 0.55
const DUST_REST_BRIGHTNESS = 0.7
const DUST_INTRO_BRIGHTNESS = 0.92

const DUST_VERTEX_SHADER = `
  attribute float size;
  attribute float extra;
  varying vec3 vColor;
  varying float vFade;
  uniform float uPixelRatio;
  uniform float uExtra;
  void main() {
    vColor = color;
    vFade = mix(1.0, uExtra, extra);
    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const DUST_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vFade;
  uniform float uBrightness;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.15, d) * vFade;
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor * uBrightness, alpha);
  }
`

const SPECTRAL_COLORS = {
  O: '#9db8ff',
  B: '#aac4ff',
  A: '#d6e3ff',
  F: '#fff4df',
  G: '#fff0bd',
  K: '#ffc98f',
  M: '#ff946b',
}

function createObjectData(object, alt, az) {
  return {
    name: object.name,
    type: object.type,
    catalog: object.catalog,
    magnitude: object.magnitude,
    sizeDeg: object.sizeDeg,
    distance: { value: object.distance, unit: 'ly' },
    ...getDirection(alt, az),
  }
}

function getDirection(alt, az) {
  return {
    altDeg: alt * 180 / Math.PI,
    azDeg: ((az * 180 / Math.PI) % 360 + 360) % 360,
  }
}

function createBodyMarkers(date, observer, phase) {
  const bodies = []

  for (const metadata of BODIES) {
    const body = Body[metadata.name]
    const equator = Equator(body, date, observer, true, true)
    const horizon = Horizon(date, observer, equator.ra, equator.dec, 'normal')
    if (horizon.altitude <= 0) continue

    const magnitude = metadata.magnitude ?? Illumination(body, date).mag
    const distance = metadata.type === 'moon'
      ? { value: equator.dist * AU_KM, unit: 'km' }
      : { value: equator.dist, unit: 'au' }
    const alt = horizon.altitude * DEG
    const az = horizon.azimuth * DEG

    bodies.push({
      alt,
      az,
      color: metadata.color,
      data: {
        name: metadata.name,
        type: metadata.type,
        magnitude: Math.round(magnitude * 100) / 100,
        distance,
        phase: metadata.type === 'moon' ? phase : undefined,
        ...getDirection(alt, az),
      },
    })
  }

  return bodies
}

function moonPhase(date) {
  const elongation = MoonPhase(date)
  return {
    illuminated: (1 - Math.cos(elongation * DEG)) / 2,
    waxing: elongation < 180,
  }
}

function createDust(pixelRatio) {
  const positions = new Float32Array(DUST_TOTAL * 3)
  const colors = new Float32Array(DUST_TOTAL * 3)
  const sizes = new Float32Array(DUST_TOTAL)
  const extras = new Float32Array(DUST_TOTAL)

  for (let i = 0; i < DUST_TOTAL; i++) {
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
    const rank = Math.pow(Math.random(), 2.2)
    const brightness = 0.14 + 0.72 * rank
    sizes[i] = 1.1 + 2.6 * rank
    extras[i] = i < DUST_COUNT ? 0 : 1
    const [r, g, b] = starColor(-0.3 + Math.random() * 1.9)
    colors[i * 3] = brightness * (1 + (r - 1) * DUST_TINT)
    colors[i * 3 + 1] = brightness * (1 + (g - 1) * DUST_TINT)
    colors[i * 3 + 2] = brightness * (1 + (b - 1) * DUST_TINT)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('extra', new THREE.BufferAttribute(extras, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uBrightness: { value: DUST_REST_BRIGHTNESS },
      uExtra: { value: 1 },
    },
    vertexShader: DUST_VERTEX_SHADER,
    fragmentShader: DUST_FRAGMENT_SHADER,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })

  const dust = new THREE.Points(geometry, material)
  dust.frustumCulled = false
  return dust
}

export function createCelestialSphere({ date, latitude, longitude, height, pixelRatio }) {
  const group = new THREE.Group()
  const dust = createDust(pixelRatio)
  group.add(dust)

  const observer = new Observer(latitude, longitude, height)
  const toAltAz = createAltAz(date, observer)
  const constellations = createConstellations(CONSTELLATIONS, toAltAz)
  group.add(constellations.group)
  let starShell = null
  let markers = null
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

    starShell = buildStarShell(catalog, toAltAz, pixelRatio)
    group.add(starShell)

    const items = []
    const phase = moonPhase(date)
    for (const object of OBJECTS) {
      const { alt, az } = toAltAz(object.raDeg, object.decDeg)
      if (alt <= 0) continue
      items.push({
        alt,
        az,
        color: object.type === 'star' ? SPECTRAL_COLORS[object.spectralClass] : undefined,
        data: createObjectData(object, alt, az),
      })
    }
    items.push(...createBodyMarkers(date, observer, phase))

    markers = createMarkers(items, { moon: phase })
    group.add(markers.group)
    return markers.interactables
  })()

  function setIntroProgress(progress) {
    const interpolation = THREE.MathUtils.clamp(progress, 0, 1)
    const settled = interpolation * interpolation * (3 - 2 * interpolation)
    dust.material.uniforms.uBrightness.value =
      THREE.MathUtils.lerp(DUST_INTRO_BRIGHTNESS, DUST_REST_BRIGHTNESS, settled)
    const extra = 1 - settled
    dust.material.uniforms.uExtra.value = extra
    dust.geometry.setDrawRange(0, extra > 0 ? DUST_TOTAL : DUST_COUNT)
  }

  function update(delta) {
    if (markers) markers.update(delta)
  }

  function dispose() {
    disposed = true
    dust.geometry.dispose()
    dust.material.dispose()
    constellations.dispose()
    starShell?.geometry.dispose()
    starShell?.material.dispose()
    markers?.dispose()
  }

  setIntroProgress(0)

  return {
    group,
    update,
    ready,
    setIntroProgress,
    setConstellationsVisible: constellations.setVisible,
    dispose,
  }
}

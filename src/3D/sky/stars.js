import * as THREE from 'three'
import { altAzToScene } from './coordinates.js'
import {
  CAMERA_FOV,
  DEFAULT_CAMERA_POSITION,
  INTRO_CAMERA_POSITION,
} from '../constants.js'

export const STAR_RADIUS = 130000
export const COLOR_SATURATION = 1.2
const STAR_SIZE_SCALE = 1.15

const INTRO_STARS = {
  count: 800,
  sizeScale: 1.4,
  startClearance: 1200,
  endClearance: 50,
  viewportFill: 1.08,
  corridorDepth: 15000,
  finalPassCount: 2,
  tint: 0.65,
  brightness: 0.86,
}

const BV_STOPS = [
  [-0.40, [0.61, 0.70, 1.00]],
  [0.00, [0.79, 0.85, 1.00]],
  [0.30, [1.00, 1.00, 1.00]],
  [0.60, [1.00, 0.96, 0.86]],
  [1.00, [1.00, 0.88, 0.68]],
  [1.50, [1.00, 0.78, 0.55]],
  [2.00, [1.00, 0.69, 0.49]],
]

function bvToRGB(bv) {
  if (bv <= BV_STOPS[0][0]) return BV_STOPS[0][1]
  const last = BV_STOPS[BV_STOPS.length - 1]
  if (bv >= last[0]) return last[1]
  for (let i = 1; i < BV_STOPS.length; i++) {
    const [x1, c1] = BV_STOPS[i]
    if (bv <= x1) {
      const [x0, c0] = BV_STOPS[i - 1]
      const t = (bv - x0) / (x1 - x0)
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t]
    }
  }
  return last[1]
}

function starColor(bv) {
  const [r, g, b] = bvToRGB(bv)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const peak = Math.max(r, g, b)
  const saturated = [r, g, b].map((c) => THREE.MathUtils.clamp(
    luminance + (c - luminance) * COLOR_SATURATION, 0, 1,
  ))
  const boosted = Math.max(...saturated)
  return saturated.map((c) => c * (peak / boosted))
}

const CATALOG_VERTEX_SHADER = `
  attribute float size;
  attribute float introVisibility;
  varying vec3 vColor;
  varying float vVisibility;
  uniform float uPixelRatio;
  uniform float uIntroProgress;
  void main() {
    vColor = color;
    vVisibility = mix(introVisibility, 1.0, uIntroProgress);
    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CATALOG_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vVisibility;
  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.15, distanceFromCenter) * vVisibility;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

const INTRO_VERTEX_SHADER = `
  attribute float size;
  varying vec3 vColor;
  varying float vFlybyBrightness;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float cameraDepth = -mvPosition.z;
    float distanceRatio = 9000.0 / max(cameraDepth, 1.0);
    vFlybyBrightness = clamp(distanceRatio * distanceRatio, 0.08, 2.15);
    float flybyScale = clamp(1200.0 / max(cameraDepth, 1.0), 0.75, 4.0);
    gl_PointSize = size * uPixelRatio * flybyScale;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const INTRO_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vFlybyBrightness;
  uniform float uBrightness;
  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
    float halo = smoothstep(0.5, 0.08, distanceFromCenter);
    float core = smoothstep(0.18, 0.0, distanceFromCenter);
    if (halo <= 0.001) discard;
    vec3 glow = vColor * uBrightness * vFlybyBrightness * (1.0 + core * 0.45);
    gl_FragColor = vec4(glow, halo);
  }
`

function createIntroStarRandom() {
  let state = 0x6d2b79f5
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createStarPoints(attributes, uniforms, vertexShader, fragmentShader) {
  const geometry = new THREE.BufferGeometry()
  for (const [name, attribute] of Object.entries(attributes)) {
    geometry.setAttribute(name, attribute)
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return {
    points,
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

export function createIntroStarField(pixelRatio, aspect) {
  const positions = new Float32Array(INTRO_STARS.count * 3)
  const colors = new Float32Array(INTRO_STARS.count * 3)
  const sizes = new Float32Array(INTRO_STARS.count)
  const start = new THREE.Vector3(...INTRO_CAMERA_POSITION)
  const forward = new THREE.Vector3(...DEFAULT_CAMERA_POSITION).sub(start)
  const travelDistance = forward.length()
  forward.normalize()
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
  const up = right.clone().cross(forward).normalize()
  const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2))
  const position = new THREE.Vector3()
  const random = createIntroStarRandom()

  for (let i = 0; i < INTRO_STARS.count; i++) {
    const depthSample = i === INTRO_STARS.count - 1
      ? 1
      : (i + random()) / INTRO_STARS.count
    const depth = THREE.MathUtils.lerp(
      INTRO_STARS.startClearance,
      travelDistance - INTRO_STARS.endClearance,
      depthSample,
    )
    const distanceFromEnd = travelDistance - depth
    const isFinalPass = i >= INTRO_STARS.count - INTRO_STARS.finalPassCount
    const spreadDepth = isFinalPass
      ? Math.min(depth, distanceFromEnd)
      : Math.min(depth, INTRO_STARS.corridorDepth)
    const verticalSpread = spreadDepth * halfFovTangent * INTRO_STARS.viewportFill
    const horizontalSpread = verticalSpread * aspect
    position.copy(start)
      .addScaledVector(forward, depth)
      .addScaledVector(right, (random() * 2 - 1) * horizontalSpread)
      .addScaledVector(up, (random() * 2 - 1) * verticalSpread)

    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y
    positions[i * 3 + 2] = position.z

    const prominence = Math.pow(random(), 2.2)
    const brightness = 0.14 + 0.72 * prominence
    sizes[i] = (1.1 + 2.6 * prominence) * STAR_SIZE_SCALE * INTRO_STARS.sizeScale
    const [r, g, b] = starColor(-0.3 + random() * 1.9)
    colors[i * 3] = brightness * (1 + (r - 1) * INTRO_STARS.tint)
    colors[i * 3 + 1] = brightness * (1 + (g - 1) * INTRO_STARS.tint)
    colors[i * 3 + 2] = brightness * (1 + (b - 1) * INTRO_STARS.tint)
  }

  const { points, dispose } = createStarPoints(
    {
      position: new THREE.BufferAttribute(positions, 3),
      color: new THREE.BufferAttribute(colors, 3),
      size: new THREE.BufferAttribute(sizes, 1),
    },
    {
      uPixelRatio: { value: pixelRatio },
      uBrightness: { value: INTRO_STARS.brightness },
    },
    INTRO_VERTEX_SHADER,
    INTRO_FRAGMENT_SHADER,
  )

  function setIntroProgress(progress) {
    points.visible = progress < 1
  }

  return { points, setIntroProgress, dispose }
}

export function createStarShell(catalog, toAltAz, pixelRatio) {
  const count = catalog.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const introVisibilities = new Float32Array(count)
  const position = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const [raDeg, decDeg, magnitude, colorIndex] = catalog[i]
    const { alt, az } = toAltAz(raDeg, decDeg)
    altAzToScene(alt, az, STAR_RADIUS, position)
    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y
    positions[i * 3 + 2] = position.z
    const [r, g, b] = starColor(colorIndex)
    const brightness = THREE.MathUtils.clamp(1.12 - 0.13 * magnitude, 0.32, 1.05)
    colors[i * 3] = r * brightness
    colors[i * 3 + 1] = g * brightness
    colors[i * 3 + 2] = b * brightness

    sizes[i] = THREE.MathUtils.clamp(4.6 - 0.7 * magnitude, 1.0, 6.0) * STAR_SIZE_SCALE
    introVisibilities[i] = 1 - THREE.MathUtils.smoothstep(magnitude, 1.5, 4.5)
  }

  const { points, dispose } = createStarPoints(
    {
      position: new THREE.BufferAttribute(positions, 3),
      color: new THREE.BufferAttribute(colors, 3),
      size: new THREE.BufferAttribute(sizes, 1),
      introVisibility: new THREE.BufferAttribute(introVisibilities, 1),
    },
    {
      uPixelRatio: { value: pixelRatio },
      uIntroProgress: { value: 0 },
    },
    CATALOG_VERTEX_SHADER,
    CATALOG_FRAGMENT_SHADER,
  )
  points.renderOrder = -1

  function setIntroProgress(progress) {
    points.material.uniforms.uIntroProgress.value = THREE.MathUtils.clamp(progress, 0, 1)
  }

  return { points, setIntroProgress, dispose }
}

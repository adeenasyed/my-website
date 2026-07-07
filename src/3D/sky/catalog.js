import * as THREE from 'three'
import { equatorialToAltAz, altAzToScene } from './coordinates.js'

// Builds the background star shell: a single THREE.Points object surrounding the
// camera, with per-star size (from magnitude) and colour (from B-V index) driven
// by a small ShaderMaterial. Positions are baked for a fixed Toronto orientation.

export const STAR_RADIUS = 130000

// Anchor colours for the B-V (blue-white -> orange-red) ramp.
const BV_STOPS = [
  [-0.40, [0.61, 0.70, 1.00]],
  [0.00, [0.79, 0.85, 1.00]],
  [0.30, [1.00, 1.00, 1.00]],
  [0.60, [1.00, 0.96, 0.86]],
  [1.00, [1.00, 0.88, 0.68]],
  [1.50, [1.00, 0.78, 0.55]],
  [2.00, [1.00, 0.69, 0.49]],
]

// B-V colour index -> RGB (0..1), linearly interpolated between anchors.
export function bvToRGB(bv) {
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

// Apparent magnitude -> point size (px) and brightness (fainter stars dimmer).
const magToSize = (mag) => THREE.MathUtils.clamp(4.6 - 0.7 * mag, 1.0, 6.0)
const magToBrightness = (mag) => THREE.MathUtils.clamp(1.12 - 0.13 * mag, 0.32, 1.05)

const VERTEX_SHADER = `
  attribute float size;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.15, d);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export function buildStarShell(catalog, latDeg, lstHours, pixelRatio) {
  const count = catalog.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const v = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const [raDeg, decDeg, mag, bv] = catalog[i]
    const { alt, az } = equatorialToAltAz(raDeg, decDeg, latDeg, lstHours)
    altAzToScene(alt, az, STAR_RADIUS, v)
    positions[i * 3] = v.x
    positions[i * 3 + 1] = v.y
    positions[i * 3 + 2] = v.z

    const [r, g, b] = bvToRGB(bv)
    const k = magToBrightness(mag)
    colors[i * 3] = r * k
    colors[i * 3 + 1] = g * k
    colors[i * 3 + 2] = b * k

    sizes[i] = magToSize(mag)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: pixelRatio } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false // the shell surrounds the camera
  points.renderOrder = -1
  return points
}

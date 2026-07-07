import * as THREE from 'three'

// A faint volumetric point cloud that only exists to give the intro fly-in its
// parallax "warp" streak. The real sky is the distant shell; this is subtle dust
// scattered through the volume the camera flies through.

const DUST_COUNT = 3500
const DUST_OUTER = 135000
const DUST_INNER = 500

export function buildDust() {
  const positions = new Float32Array(DUST_COUNT * 3)
  const colors = new Float32Array(DUST_COUNT * 3)

  for (let i = 0; i < DUST_COUNT; i++) {
    let x, y, z, r
    do {
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      r = DUST_OUTER * Math.cbrt(Math.random())
      x = r * Math.sin(phi) * Math.cos(theta)
      y = r * Math.sin(phi) * Math.sin(theta)
      z = r * Math.cos(phi)
    } while (r < DUST_INNER)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    const b = 0.25 + Math.random() * 0.35
    colors[i * 3] = b
    colors[i * 3 + 1] = b
    colors[i * 3 + 2] = b
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

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return points
}

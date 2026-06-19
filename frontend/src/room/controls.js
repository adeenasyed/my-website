import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function setupControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 200, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false
  controls.minPolarAngle = 0.2
  controls.maxPolarAngle = Math.PI / 2.1
  controls.minAzimuthAngle = -Math.PI / 2
  controls.maxAzimuthAngle = 0
  controls.minDistance = 200
  controls.maxDistance = 1200
  controls.update()
  return controls
}

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DEFAULT_CAMERA_LOOK_AT } from './constants.js'

export function setupControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(...DEFAULT_CAMERA_LOOK_AT)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false
  controls.minPolarAngle = 0.2
  controls.minDistance = 200
  controls.maxDistance = 1200
  controls.update()
  return controls
}

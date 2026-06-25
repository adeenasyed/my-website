import * as THREE from 'three'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_LOOK_AT } from './constants.js'

const FINAL_CAMERA_POSITION = new THREE.Vector3(...DEFAULT_CAMERA_POSITION)
const LOOK_AT = new THREE.Vector3(...DEFAULT_CAMERA_LOOK_AT)
const DURATION = 3.5
const DISTANCE = 108000

const INTRO_START = (() => {
  const dir = FINAL_CAMERA_POSITION.clone().sub(LOOK_AT).normalize()
  return LOOK_AT.clone().add(dir.multiplyScalar(DISTANCE))
})()

function ease(t) {
  const a = 0.65
  const pa = (2 * a) / (3 + a * -1)
  if (t <= a) return (pa / (a * a * a)) * t * t * t
  const va = (3 * pa) / a
  const s = t - a
  const b = 1 - a
  return pa + va * s - (va / (2 * b)) * s * s
}

export function createIntro(camera, scene, controls, interactions) {
  camera.position.copy(INTRO_START)
  camera.lookAt(LOOK_AT)
  controls.enabled = false

  let started = false
  let elapsed = 0
  let finished = false

  function update(delta) {
    if (finished) return
    if (started) elapsed += delta
    const t = ease(Math.min(elapsed / DURATION, 1))
    camera.position.lerpVectors(INTRO_START, FINAL_CAMERA_POSITION, t)
    camera.lookAt(LOOK_AT)
    if (elapsed >= DURATION) {
      scene.fog = null
      controls.enabled = true
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0)
      interactions.setEnabled(true)
      finished = true
    }
  }

  return {
    update,
    start: () => { started = true },
    isFinished: () => finished,
  }
}

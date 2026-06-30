import * as THREE from 'three'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_LOOK_AT, INTRO_CAMERA_POSITION } from './constants.js'

const START_POSITION = new THREE.Vector3(...INTRO_CAMERA_POSITION)
const FINAL_POSITION = new THREE.Vector3(...DEFAULT_CAMERA_POSITION)
const DURATION = 3.5

function ease(t) {
  const a = 0.65
  const pa = (2 * a) / (3 + a * -1)
  if (t <= a) return (pa / (a * a * a)) * t * t * t
  const va = (3 * pa) / a
  const s = t - a
  const b = 1 - a
  return pa + va * s - (va / (2 * b)) * s * s
}

export function createIntro(camera, controls, interactions) {
  camera.position.copy(START_POSITION)
  camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)
  controls.enabled = false

  let started = false
  let elapsed = 0
  let finished = false

  function update(delta) {
    if (finished) return
    if (started) elapsed += delta
    const t = ease(Math.min(elapsed / DURATION, 1))
    camera.position.lerpVectors(START_POSITION, FINAL_POSITION, t)
    camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)
    if (elapsed >= DURATION) {
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

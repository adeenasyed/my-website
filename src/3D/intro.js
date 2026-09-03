import * as THREE from 'three'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_LOOK_AT, INTRO_CAMERA_POSITION } from './constants.js'

const START_POSITION = new THREE.Vector3(...INTRO_CAMERA_POSITION)
const FINAL_POSITION = new THREE.Vector3(...DEFAULT_CAMERA_POSITION)
const DURATION = 3.5
const FLIGHT_DIRECTION = FINAL_POSITION.clone().sub(START_POSITION).normalize()
const FLIGHT_RIGHT = FLIGHT_DIRECTION.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
const FLIGHT_UP = FLIGHT_RIGHT.clone().cross(FLIGHT_DIRECTION).normalize()
const RIGHT_ARC = 900
const UPPER_ARC = 350

function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function createIntro(camera, controls, interactions, onComplete) {
  camera.position.copy(START_POSITION)
  camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)
  controls.enabled = false

  let elapsed = 0
  let finished = false

  function update(delta) {
    if (finished) return null
    elapsed += delta
    const progress = Math.min(elapsed / DURATION, 1)
    const travelProgress = smootherstep(progress)
    const arc = Math.sin(Math.PI * travelProgress) ** 2
    camera.position.lerpVectors(START_POSITION, FINAL_POSITION, travelProgress)
      .addScaledVector(FLIGHT_RIGHT, RIGHT_ARC * arc)
      .addScaledVector(FLIGHT_UP, UPPER_ARC * arc)
    camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)
    if (elapsed >= DURATION) {
      controls.enabled = true
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0)
      interactions.setEnabled(true)
      finished = true
      onComplete()
    }
    return travelProgress
  }

  return { update }
}

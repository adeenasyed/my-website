import * as THREE from 'three'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_LOOK_AT } from '../constants.js'

export const ZOOM_DURATION = 0.5

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function createZoomController(camera, controls, renderer, onZoomChange, onEscape) {
  const originalPosition = new THREE.Vector3(...DEFAULT_CAMERA_POSITION)
  const originalLookAt = new THREE.Vector3(...DEFAULT_CAMERA_LOOK_AT)
  const originalUp = camera.up.clone()
  const currentLookAt = originalLookAt.clone()
  const currentUp = originalUp.clone()
  const rotationMatrix = new THREE.Matrix4()
  const fromQuaternion = new THREE.Quaternion()
  const toQuaternion = new THREE.Quaternion()

  const escapeRaycaster = new THREE.Raycaster()
  const escapePointerNdc = new THREE.Vector2()

  let animation = null
  let escapeTarget = null
  let scrollHandler = null
  let touchScrollY = null
  let activeZoom = null
  let framedAspect = camera.aspect

  function getZoomFrame({ target, offset, fitWidth }) {
    const lookAt = target.getWorldPosition(new THREE.Vector3())
    const fittedOffset = offset.clone()
    if (fitWidth) {
      const verticalFov = THREE.MathUtils.degToRad(camera.getEffectiveFOV())
      const fitDistance = fitWidth / (2 * Math.tan(verticalFov / 2) * camera.aspect)
      if (fitDistance > fittedOffset.length()) fittedOffset.setLength(fitDistance)
    }
    return { lookAt, position: lookAt.clone().add(fittedOffset) }
  }

  function startAnimation(toPosition, toLookAt, onComplete, toUp = originalUp) {
    animation = {
      elapsed: 0,
      fromPosition: camera.position.clone(),
      toPosition,
      fromLookAt: currentLookAt.clone(),
      toLookAt,
      fromUp: currentUp.clone(),
      toUp: toUp.clone(),
      onComplete,
    }
  }

  function add({ target, offset, onStart, onScroll, up, fitWidth }) {
    const zoom = { target, offset, fitWidth }
    const toUp = up
      ? up.clone().applyQuaternion(target.getWorldQuaternion(new THREE.Quaternion())).normalize()
      : originalUp
    return (onComplete) => {
      onStart?.()
      activeZoom = zoom
      framedAspect = camera.aspect
      const frame = getZoomFrame(zoom)
      controls.enabled = false
      onZoomChange(true)
      startAnimation(frame.position, frame.lookAt, () => {
        escapeTarget = target
        scrollHandler = onScroll
        onComplete?.()
      }, toUp)
    }
  }

  function update(delta) {
    if (activeZoom?.fitWidth && framedAspect !== camera.aspect) {
      const frame = getZoomFrame(activeZoom)
      if (animation) {
        animation.toPosition.copy(frame.position)
        animation.toLookAt.copy(frame.lookAt)
      } else {
        camera.position.copy(frame.position)
        currentLookAt.copy(frame.lookAt)
        rotationMatrix.lookAt(camera.position, currentLookAt, currentUp)
        camera.quaternion.setFromRotationMatrix(rotationMatrix)
      }
      framedAspect = camera.aspect
    }
    if (!animation) return

    animation.elapsed += delta
    const progress = Math.min(animation.elapsed / ZOOM_DURATION, 1)
    const easedProgress = easeInOut(progress)
    camera.position.lerpVectors(animation.fromPosition, animation.toPosition, easedProgress)
    currentLookAt.lerpVectors(animation.fromLookAt, animation.toLookAt, easedProgress)
    rotationMatrix.lookAt(camera.position, currentLookAt, animation.fromUp)
    fromQuaternion.setFromRotationMatrix(rotationMatrix)
    rotationMatrix.lookAt(camera.position, currentLookAt, animation.toUp)
    toQuaternion.setFromRotationMatrix(rotationMatrix)
    camera.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, easedProgress)
    if (animation.elapsed >= ZOOM_DURATION) {
      currentUp.copy(animation.toUp)
      animation.onComplete()
      animation = null
    }
  }

  function resetCamera() {
    if (!escapeTarget) return
    escapeTarget = null
    scrollHandler = null
    activeZoom = null
    startAnimation(originalPosition, originalLookAt, () => {
      controls.enabled = true
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0)
      onZoomChange(false)
    })
  }

  renderer.domElement.addEventListener('wheel', (e) => {
    if (scrollHandler) scrollHandler(e.deltaY)
  })

  renderer.domElement.addEventListener('touchstart', (e) => {
    if (scrollHandler && e.touches.length === 1) touchScrollY = e.touches[0].clientY
  })

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (!scrollHandler || e.touches.length !== 1 || touchScrollY === null) return
    const y = e.touches[0].clientY
    scrollHandler((touchScrollY - y) * 2)
    touchScrollY = y
  })

  renderer.domElement.addEventListener('touchend', () => {
    touchScrollY = null
  })

  renderer.domElement.addEventListener('click', (e) => {
    if (!escapeTarget) return
    escapePointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1
    escapePointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1
    escapeRaycaster.setFromCamera(escapePointerNdc, camera)
    if (!escapeRaycaster.intersectObject(escapeTarget, true).length) {
      onEscape()
    }
  })

  function onKeyDown(e) {
    if (e.key === 'Escape' && escapeTarget) {
      onEscape()
    }
  }
  window.addEventListener('keydown', onKeyDown)

  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
  }

  return { add, update, resetCamera, dispose }
}

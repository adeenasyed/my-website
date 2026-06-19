import * as THREE from 'three'

const ZOOM_DURATION = 0.5

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function createZoomController(camera, controls, renderer, interactions, onEscape) {
  const originalPosition = camera.position.clone()
  const originalLookAt = controls.target.clone()
  const currentLookAt = originalLookAt.clone()

  const escapeRaycaster = new THREE.Raycaster()
  const escapeMouse = new THREE.Vector2()

  let animation = null
  let escapeTarget = null
  let currentOnScroll = null

  function startAnimation(toPosition, toLook, onComplete) {
    animation = {
      elapsed: 0,
      fromPosition: camera.position.clone(),
      toPosition,
      fromLook: currentLookAt.clone(),
      toLook,
      onComplete,
    }
  }

  function add(target, offset, { onScroll } = {}) {
    const toLook = target.position.clone()
    const toPosition = toLook.clone().add(offset)
    return (onComplete) => {
      controls.enabled = false
      interactions.setEnabled(false)
      startAnimation(toPosition, toLook, () => {
        escapeTarget = target
        currentOnScroll = onScroll ?? null
        onComplete?.()
      })
    }
  }

  function update(delta) {
    if (!animation) return
    animation.elapsed += delta
    const t = easeInOut(Math.min(animation.elapsed / ZOOM_DURATION, 1))
    camera.position.lerpVectors(animation.fromPosition, animation.toPosition, t)
    currentLookAt.lerpVectors(animation.fromLook, animation.toLook, t)
    camera.lookAt(currentLookAt)
    if (animation.elapsed >= ZOOM_DURATION) {
      animation.onComplete()
      animation = null
    }
  }

  function resetCamera() {
    escapeTarget = null
    currentOnScroll = null
    startAnimation(originalPosition, originalLookAt, () => {
      controls.enabled = true
      controls._sphericalDelta?.set(0, 0, 0)
      interactions.setEnabled(true)
    })
  }

  renderer.domElement.addEventListener('wheel', (e) => {
    currentOnScroll?.(e.deltaY)
  })

  renderer.domElement.addEventListener('click', (e) => {
    if (!escapeTarget) return
    escapeMouse.x = (e.clientX / window.innerWidth) * 2 - 1
    escapeMouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    escapeRaycaster.setFromCamera(escapeMouse, camera)
    if (escapeRaycaster.intersectObject(escapeTarget).length === 0) onEscape?.()
  })

  function onKeyDown(e) {
    if (e.key === 'Escape' && escapeTarget) onEscape?.()
  }
  window.addEventListener('keydown', onKeyDown)

  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
  }

  return { add, update, resetCamera, dispose }
}

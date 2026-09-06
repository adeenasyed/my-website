import * as THREE from 'three'
import { setupControls } from './controls.js'
import { createRoom } from './room/index.js'
import { createInteractionManager } from './interactions.js'
import { createZoomController } from './room/zoom.js'
import { createIntro } from './intro.js'

export async function createExperience({
  scene,
  camera,
  renderer,
  sky,
  setProgress,
  onIntroComplete,
  onCelestialClick,
  onPointerDirection,
  onZoomChange,
  onEscape,
  ...objectCallbacks
}) {
  const controls = setupControls(camera, renderer)

  let maxProgress = 0
  function onRoomProgress(progress) {
    const next = progress * 0.9
    if (next <= maxProgress) return
    maxProgress = next
    setProgress(next)
  }

  const room = await createRoom({
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    onProgress: onRoomProgress,
    ...objectCallbacks,
  })
  scene.add(room.group)
  await renderer.compileAsync(scene, camera)
  setProgress(1)

  const interactions = createInteractionManager(camera, renderer)

  const zoomController = createZoomController(
    camera,
    controls,
    renderer,
    interactions,
    onZoomChange,
    onEscape,
  )

  for (const obj of Object.values(room.interactables)) {
    const zoom = obj.zoom
      ? zoomController.add(obj.zoom.target, obj.zoom.offset, obj.zoom)
      : null
    interactions.add(obj.meshes, obj.hoverColor, zoom ? () => zoom(obj.onClick) : obj.onClick)
  }

  const skyInteractions = (await sky.ready).map(({ meshes, data }) => interactions.add(
    meshes,
    undefined,
    (screenPoint, pointer) => {
      controls.enabled = false
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0)
      onCelestialClick(
        data,
        screenPoint,
        () => interactions.projectToScreen(meshes[0]),
        pointer,
      )
    },
    { anchor: meshes[0] },
  ))
  interactions.setEnabled(false, skyInteractions)

  interactions.addBlockers(scene)

  const intro = createIntro(camera, controls, interactions, onIntroComplete)

  const pointerDirection = new THREE.Vector3()
  let lastDirectionKey = ''

  function updatePointerDirection() {
    if (room.group.visible) {
      if (lastDirectionKey === '') return
      lastDirectionKey = ''
      onPointerDirection(null)
      return
    }
    const ndc = interactions.pointerNdc
    pointerDirection.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize()
    const readout = {
      hovered: interactions.isHoveringAnchor(),
      azDeg: Math.atan2(pointerDirection.x, -pointerDirection.z) * THREE.MathUtils.RAD2DEG,
      altDeg: Math.asin(THREE.MathUtils.clamp(pointerDirection.y, -1, 1)) * THREE.MathUtils.RAD2DEG,
    }
    const key = `${readout.hovered}|${Math.round(readout.azDeg)}|${Math.round(readout.altDeg)}`
    if (key === lastDirectionKey) return
    lastDirectionKey = key
    onPointerDirection(readout)
  }

  let lastTime = 0
  let lastRender = 0
  let animationFrameId = null
  let disposed = false

  function animate(time = 0) {
    if (disposed) return

    animationFrameId = requestAnimationFrame(animate)

    if (time - lastRender < 1000 / 75) return
    lastRender = time

    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time

    const introProgress = intro.update(delta)
    if (introProgress !== null) sky.setIntroProgress(introProgress)
    sky.update(delta)
    room.update(delta)
    zoomController.update(delta)
    if (controls.enabled) controls.update()
    interactions.update()
    updatePointerDirection()

    renderer.render(scene, camera)
  }

  function startIntro() {
    animate()
  }

  function setRoomVisible(visible) {
    room.setVisible(visible)
    interactions.setEnabled(!visible, skyInteractions)
  }

  function enableCameraControls() {
    controls.enabled = true
  }

  function dispose() {
    disposed = true
    cancelAnimationFrame(animationFrameId)
    room.dispose()
    zoomController.dispose()
  }

  return {
    setLEDColor: room.setLEDColor,
    setTVSource: room.setTVSource,
    setInteractionsEnabled: interactions.setEnabled,
    setNativeCursorHidden: interactions.setNativeCursorHidden,
    resetCamera: zoomController.resetCamera,
    startIntro,
    setRoomVisible,
    enableCameraControls,
    dispose,
  }
}

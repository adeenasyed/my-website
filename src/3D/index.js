import * as THREE from 'three'
import { setupControls } from './controls.js'
import { createRoom } from './room/index.js'
import { createInteractionManager } from './interactions.js'
import { createZoomController } from './room/zoom.js'
import { createIntro } from './intro.js'

export async function createWorld({
  scene,
  camera,
  renderer,
  sky,
  onProgress,
  onIntroComplete,
  onCelestialClick,
  onPointerDirectionChange,
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
    onProgress(next)
  }

  const room = await createRoom({
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    onProgress: onRoomProgress,
    ...objectCallbacks,
  })
  scene.add(room.group)
  await renderer.compileAsync(scene, camera)
  onProgress(1)

  const interactions = createInteractionManager(camera, renderer)

  const zoomController = createZoomController(
    camera,
    controls,
    renderer,
    onZoomChange,
    onEscape,
  )

  for (const obj of Object.values(room.interactables)) {
    const zoom = obj.zoom
      ? zoomController.add(obj.zoom)
      : null
    interactions.add(obj.meshes, obj.hoverColor, zoom ? () => zoom(obj.onClick) : obj.onClick)
  }

  const visitorBook = room.interactables.visitorBook
  const visitorBookControls = {
    ...visitorBook.controls,
    setDrawingEnabled(enabled) {
      interactions.setDrawingTarget(
        enabled ? visitorBook.drawingSurface : null,
        enabled ? visitorBook.controls : null,
      )
    },
    getPositions() {
      return {
        toolbar: interactions.projectToScreen(visitorBook.controlAnchors.toolbar),
        pageNavigation: interactions.projectToScreen(visitorBook.controlAnchors.pageNavigation),
      }
    },
    containsPoint(x, y) {
      return interactions.intersects(visitorBook.meshes, x, y)
    },
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
  room.setVisible(false)

  const pointerDirection = new THREE.Vector3()
  let activeView = 'landing'
  let introComplete = false
  let lastDirectionKey = ''

  const intro = createIntro(camera, controls, interactions, () => {
    introComplete = true
    controls.enabled = activeView !== 'landing'
    onIntroComplete()
  })

  function updatePointerDirection() {
    if (activeView !== 'sky') {
      if (lastDirectionKey === '') return
      lastDirectionKey = ''
      onPointerDirectionChange(null)
      return
    }
    const ndc = interactions.pointerNdc
    pointerDirection.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize()
    const readout = {
      hovered: interactions.isHovering(),
      azDeg: Math.atan2(pointerDirection.x, -pointerDirection.z) * THREE.MathUtils.RAD2DEG,
      altDeg: Math.asin(THREE.MathUtils.clamp(pointerDirection.y, -1, 1)) * THREE.MathUtils.RAD2DEG,
    }
    const key = `${readout.hovered}|${Math.round(readout.azDeg)}|${Math.round(readout.altDeg)}`
    if (key === lastDirectionKey) return
    lastDirectionKey = key
    onPointerDirectionChange(readout)
  }

  let introStarted = false

  function update(delta) {
    const introProgress = introStarted ? intro.update(delta) : null
    if (introProgress !== null) sky.setIntroProgress(introProgress)
    room.update(delta)
    zoomController.update(delta)
    if (controls.enabled) controls.update()
    interactions.update()
    updatePointerDirection()
  }

  function startIntro() {
    introStarted = true
  }

  function setView(view) {
    activeView = view
    controls.enabled = view !== 'landing' && introComplete
    room.setVisible(view === 'room')
    interactions.setEnabled(view === 'sky', skyInteractions)
  }

  function enableCameraControls() {
    controls.enabled = true
  }

  function dispose() {
    room.dispose()
    zoomController.dispose()
  }

  return {
    setLEDColor: room.setLEDColor,
    setTVSource: room.setTVSource,
    visitorBookControls,
    setInteractionsEnabled: interactions.setEnabled,
    setNativeCursorHidden: interactions.setNativeCursorHidden,
    resetCamera: zoomController.resetCamera,
    update,
    startIntro,
    setView,
    enableCameraControls,
    dispose,
  }
}

import { setupControls } from './controls.js'
import { buildStructure } from './structure.js'
import { loadObjects } from './objects/index.js'
import { createInteractionManager } from './interactions.js'
import { createZoomController } from './zoom.js'
import { createIntro } from './intro.js'
import { loadingManager } from './objects/helpers.js'

export async function buildRoom({
  scene,
  camera,
  renderer,
  celestial,
  setProgress,
  onIntroComplete,
  onCelestialClick,
  onZoomChange,
  onEscape,
  ...objectCallbacks
}) {
  let maxProgress = 0
  loadingManager.onProgress = (_, loaded, total) => {
    const next = (loaded / total) * 0.9
    if (next <= maxProgress) return
    maxProgress = next
    setProgress(next)
  }

  const controls = setupControls(camera, renderer)

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  const structure = buildStructure(maxAnisotropy)
  const { objects, animated, interactables } = await loadObjects(maxAnisotropy)
  structure.add(...objects)

  for (const [key, cb] of Object.entries(objectCallbacks)) {
    if (interactables[key]) interactables[key].onClick = cb
  }

  scene.add(structure)

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
  for (const obj of Object.values(interactables)) {
    const zoom = obj.zoom
      ? zoomController.add(obj.zoom.target, obj.zoom.offset, obj.zoom)
      : null
    interactions.add(obj.meshes, obj.hoverColor, zoom ? () => zoom(obj.onClick) : obj.onClick)
  }

  for (const { meshes, data } of await celestial.ready) {
    interactions.add(meshes, undefined, () => onCelestialClick(data))
  }

  interactions.addBlockers(scene)

  const intro = createIntro(camera, controls, interactions, onIntroComplete)

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

    intro.update(delta)
    celestial.update(delta)
    for (const a of animated) a.update(delta)
    zoomController.update(delta)
    if (controls.enabled) controls.update()
    interactions.update()

    renderer.render(scene, camera)
  }

  function startIntro() {
    animate()
    intro.start()
  }

function setVisible(visible) {
  structure.visible = visible
}

  function dispose() {
    disposed = true
    cancelAnimationFrame(animationFrameId)
    interactables.tv.dispose()
    zoomController.dispose()
  }

  return {
    setLEDColor: structure.setLEDColor,
    setTVMode: interactables.tv.setMode,
    setInteractionsEnabled: interactions.setEnabled,
    resetCamera: zoomController.resetCamera,
    startIntro,
    setVisible,
    dispose,
  }
}

import { setupControls } from './controls.js'
import { buildStructure } from './structure.js'
import { loadObjects } from './objects/index.js'
import { createInteractionManager } from './interactions.js'
import { createZoomController } from './zoom.js'
import { createIntro } from './intro.js'

export async function buildRoom({ scene, camera, renderer, stars, onEscape, ...objectCallbacks }) {
  const controls = setupControls(camera, renderer)

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  const structure = buildStructure(maxAnisotropy)
  const { objects, animated, interactables } = await loadObjects(maxAnisotropy)

  for (const [key, cb] of Object.entries(objectCallbacks)) {
    if (interactables[key]) interactables[key].onClick = cb
  }

  scene.add(structure, ...objects)

  const interactions = createInteractionManager(camera, renderer)
  const zoomController = createZoomController(camera, controls, renderer, interactions, onEscape)
  for (const obj of Object.values(interactables)) {
    const zoom = obj.zoom
      ? zoomController.add(obj.zoom.target, obj.zoom.offset, obj.zoom)
      : null
    interactions.add(obj.meshes, obj.hoverColor, zoom ? () => zoom(obj.onClick) : obj.onClick)
  }
  interactions.addBlockers(scene)

  const intro = createIntro(camera, scene, controls, interactions)

  let lastTime = 0
  let animationFrameId = null
  let disposed = false

  function animate(time = 0) {
    if (disposed) return

    animationFrameId = requestAnimationFrame(animate)
    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time

    intro.update(delta)
    if (intro.isFinished()) stars.rotation.y += delta * (Math.PI * 2 / 3600)
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
    dispose,
  }
}

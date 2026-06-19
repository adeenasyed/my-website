import { createScene } from './scene.js'
import { setupControls } from './controls.js'
import { loadRoomObjects } from './objects/index.js'
import { createInteractionManager } from './interactions.js'
import { createZoomController } from './zoom.js'
import { buildStructure } from './structure.js'

export async function buildRoom({ onRemoteClick, onTVClick, onLaptopClick, onLightSignClick, onInfoClick, onEscape }) {
  const { scene, camera, renderer, disposeScene } = createScene()
  document.body.appendChild(renderer.domElement)

  const controls = setupControls(camera, renderer)

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()

  const { lighting, meshes: structMeshes } = buildStructure(maxAnisotropy)
  const {
    objects,
    tv,
    tvScreen,
    laptop,
    laptopScreen,
    remote,
    lightSign,
    infoButton,
    bear,
    noodles,
  } = await loadRoomObjects(maxAnisotropy)

  scene.add(...structMeshes, ...objects)

  const interactions = createInteractionManager(camera, renderer)
  interactions.add(tv.meshes, tv.hoverColor, () => onTVClick())
  interactions.add(laptop.meshes, laptop.hoverColor, () => onLaptopClick())
  interactions.add(remote.meshes, remote.hoverColor, () => onRemoteClick())
  interactions.add(lightSign.meshes, lightSign.hoverColor, () => onLightSignClick())
  interactions.add(infoButton.meshes, infoButton.hoverColor, () => onInfoClick())

  const zoom = createZoomController(camera, controls, renderer, interactions, onEscape)
  const zoomOnTV = zoom.add(tvScreen.mesh, tvScreen.zoomOffset)
  const zoomOnLaptop = zoom.add(laptopScreen, laptopScreen.zoomOffset, { onScroll: laptop.scroll })

  let lastTime = 0
  let animationFrameId = null
  let disposed = false

  function animate(time = 0) {
    if (disposed) return
    animationFrameId = requestAnimationFrame(animate)
    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time

    bear.update(delta)
    noodles.update(delta)
    zoom.update(delta)
    if (controls.enabled) controls.update()
    interactions.update()
    renderer.render(scene, camera)
  }

  animate()

  function dispose() {
    disposed = true
    cancelAnimationFrame(animationFrameId)
    zoom.dispose()
    disposeScene()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return {
    zoomOnTV,
    zoomOnLaptop,
    resetCamera: zoom.resetCamera,
    setLEDColor: lighting.setColor,
    setTVMode: (mode) => tvScreen.setMode(mode),
    setInteractionsEnabled: (val) => interactions.setEnabled(val),
    dispose,
  }
}

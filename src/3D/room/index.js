import { buildStructure } from './structure.js'
import { loadObjects } from './objects/index.js'

export async function createRoom({
  maxAnisotropy,
  onProgress,
  ...objectCallbacks
}) {
  const group = buildStructure(maxAnisotropy)
  const { objects, animated, interactables } = await loadObjects(maxAnisotropy, onProgress)
  group.add(...objects)

  for (const [key, callback] of Object.entries(objectCallbacks)) {
    if (interactables[key]) interactables[key].onClick = callback
  }

  function update(delta) {
    for (const object of animated) object.update(delta)
  }

  function setVisible(visible) {
    group.visible = visible
  }

  function dispose() {
    interactables.tv.dispose()
  }

  return {
    group,
    interactables,
    update,
    setVisible,
    setLEDColor: group.setLEDColor,
    setTVSource: interactables.tv.setSource,
    dispose,
  }
}

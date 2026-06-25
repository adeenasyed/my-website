import { loadObject } from '../helpers.js'

export function loadAJ4(shelfBox) {
  return loadObject('/objects/aj4.glb', {
    size: 95,
    position: (box) => ({
      x: shelfBox.max.x - (box.min.x + box.max.x) / 2 - 39,
      y: shelfBox.min.y - box.min.y + 102,
      z: shelfBox.max.z - (box.min.z + box.max.z) / 2 - 112,
    }),
  })
}

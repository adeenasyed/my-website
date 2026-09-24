import { loadObject } from '../helpers.js'

export function loadAJ4(shelfBox) {
  return loadObject('/objects/aj4.glb', {
    size: 95,
    rotation: { y: Math.PI / 4 },
    position: (box) => ({
      x: (shelfBox.min.x + shelfBox.max.x - box.min.x - box.max.x) / 2 + 15,
      y: shelfBox.min.y - box.min.y + 35,
      z: (shelfBox.min.z + shelfBox.max.z - box.min.z - box.max.z) / 2 - 15,
    }),
  })
}

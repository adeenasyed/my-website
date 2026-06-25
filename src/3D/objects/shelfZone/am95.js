import { loadObject } from '../helpers.js'

export function loadAM95(shelfBox) {
  return loadObject('/objects/am95.glb', {
    size: 95,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: shelfBox.min.x - (box.min.x + box.max.x) / 2 + 80,
      y: shelfBox.max.y - box.min.y - 206,
      z: shelfBox.min.z - (box.min.z + box.max.z) / 2 + 40,
    }),
  })
}

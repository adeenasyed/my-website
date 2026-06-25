import { loadObject } from '../helpers.js'

export function loadBasketballNet(shelfBox) {
  return loadObject('/objects/basketball-net.glb', {
    size: 75,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: shelfBox.min.x - (box.min.x + box.max.x) / 2 + 13.7,
      y: shelfBox.max.y - box.min.y - 140,
      z: shelfBox.min.z - box.min.z + 6,
    }),
  })
}

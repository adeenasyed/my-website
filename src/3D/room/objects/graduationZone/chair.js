import { loadObject } from '../helpers.js'

export function loadChair(degreeCenterX) {
  return loadObject('/objects/chair.glb', {
    size: 150,
    position: (box) => ({
      x: degreeCenterX - (box.min.x + box.max.x) / 2,
      y: -box.min.y,
      z: 475,
    }),
  })
}

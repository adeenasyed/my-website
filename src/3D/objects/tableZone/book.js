import { loadObject } from '../helpers.js'

export function loadBook(tableMaxY) {
  return loadObject('/objects/book.glb', {
    size: 53,
    rotation: { y: Math.PI / 2.75 },
    position: (box) => ({
      x: -54,
      y: tableMaxY - box.min.y,
      z: 40,
    }),
  })
}

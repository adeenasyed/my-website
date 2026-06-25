import { loadObject } from '../helpers.js'
import { ROOM_WIDTH } from '../../constants.js'

export function loadTable() {
  return loadObject('/objects/table.glb', {
    size: 170,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x + 225,
      y: -box.min.y + 12,
      z: ROOM_WIDTH / 2 - box.max.z - 190,
    }),
  })
}

import { loadObject } from '../helpers.js'
import { ROOM_WIDTH } from '../../constants.js'

export function loadCouch() {
  return loadObject('/objects/couch.glb', {
    size: 410,
    rotation: { y: Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x,
      y: -box.min.y,
      z: ROOM_WIDTH / 2 - box.max.z,
    }),
  })
}

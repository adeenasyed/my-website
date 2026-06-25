import { loadObject } from './helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../constants.js'

export function loadCatLightSign() {
  return loadObject('/objects/cat-light-sign.glb', {
    size: 130,
    position: (box) => ({
      x: -278,
      y: ROOM_HEIGHT - box.min.y - 170,
      z: -ROOM_WIDTH / 2 - box.min.z,
    }),
  })
}

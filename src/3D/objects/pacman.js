import { loadObject } from './helpers.js'
import { ROOM_WIDTH, BASEBOARD_THICKNESS, BASEBOARD_CAP_OVERHANG } from '../constants.js'

export function loadPacman() {
  return loadObject('/objects/pacman.glb', {
    size: 320,
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x,
      y: -box.min.y,
      z: -ROOM_WIDTH / 2 + BASEBOARD_THICKNESS + BASEBOARD_CAP_OVERHANG - box.min.z,
    }),
  })
}

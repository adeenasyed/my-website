import { loadObject } from '../helpers.js'
import {
  ROOM_WIDTH,
  BASEBOARD_THICKNESS,
  BASEBOARD_CAP_OVERHANG,
} from '../../constants.js'

const WALL_CLEARANCE = BASEBOARD_THICKNESS + BASEBOARD_CAP_OVERHANG

export function loadShelf() {
  return loadObject('/objects/shelf.glb', {
    size: 515,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - WALL_CLEARANCE - box.max.x,
      y: -box.min.y,
      z: -ROOM_WIDTH / 2 + WALL_CLEARANCE - box.min.z,
    }),
  })
}

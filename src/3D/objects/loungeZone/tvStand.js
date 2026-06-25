import { loadObject } from '../helpers.js'
import { ROOM_WIDTH, BASEBOARD_THICKNESS, BASEBOARD_CAP_OVERHANG } from '../../constants.js'

export function loadTVStand(couchCenterZ) {
  return loadObject('/objects/tv-stand.glb', {
    size: 330,
    position: (box) => ({
      x: ROOM_WIDTH / 2 - BASEBOARD_THICKNESS - BASEBOARD_CAP_OVERHANG - box.max.x,
      y: -box.min.y,
      z: couchCenterZ - (box.min.z + box.max.z) / 2,
    }),
    editMesh: (mesh) => {
      mesh.material.roughness = 1
    },
  })
}

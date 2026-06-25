import { loadObject } from './helpers.js'
import { ROOM_WIDTH } from '../constants.js'

export function loadRug(maxAnisotropy) {
  return loadObject('/objects/rug.glb', {
    size: 580,
    rotation: { y: Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x + 3,
      y: -box.min.y,
      z: ROOM_WIDTH / 2 - box.max.z - 3,
    }),
    editMesh: (mesh) => {
      if (mesh.material.map) mesh.material.map.anisotropy = maxAnisotropy
    },
  })
}

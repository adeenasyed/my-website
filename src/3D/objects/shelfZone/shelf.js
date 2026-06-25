import { loadObject } from '../helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../../constants.js'

export function loadShelf() {
  return loadObject('/objects/shelf.glb', {
    size: 410,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - box.max.x,
      y: ROOM_HEIGHT / 2 - (box.min.y + box.max.y) / 2,
      z: -ROOM_WIDTH / 2 - box.min.z,
    }),
    editMesh: (mesh) => {
      mesh.material.roughness = 1
    },
  })
}

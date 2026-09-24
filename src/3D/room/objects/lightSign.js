import { loadObject, getMeshes } from './helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../constants.js'

export async function loadLightSign() {
  const object = await loadObject('/objects/light-sign.glb', {
    boundsFilter: (mesh) => mesh.material.opacity > 0,
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x + 29,
      y: ROOM_HEIGHT - box.max.y - 29,
      z: 0,
    }),
  })
  object.meshes = getMeshes(object)
  object.hoverColor = '#5CEFFF'
  return object
}

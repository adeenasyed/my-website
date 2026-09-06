import { loadObject, getMeshes } from '../helpers.js'
import { ROOM_HEIGHT } from '../../constants.js'

export async function loadLightSign(centerX) {
  const object = await loadObject('/objects/light-sign.glb', {
    position: (box) => ({
      x: centerX - (box.min.x + box.max.x) / 2,
      y: ROOM_HEIGHT - 100,
      z: 0,
    }),
  })
  object.meshes = getMeshes(object)
  object.hoverColor = '#5CEFFF'
  return object
}

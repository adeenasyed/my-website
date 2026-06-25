import { loadObject } from '../helpers.js'
import { WHITE } from '@/theme.js'

export function loadCookies(tvStandBox) {
  return loadObject('/objects/cookies.glb', {
    size: 45,
    rotation: { y: Math.PI },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 - 105,
    }),
    editMesh: (mesh) => {
      mesh.material.emissive.set(WHITE)
      mesh.material.emissiveIntensity = 0.25
    },
  })
}

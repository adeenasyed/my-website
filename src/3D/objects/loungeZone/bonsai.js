import { loadObject } from '../helpers.js'

export function loadBonsai(tvStandBox) {
  return loadObject('/objects/bonsai.glb', {
    size: 84,
    rotation: { y: Math.PI },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y - 5,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 + 112.5,
    }),
    editMesh: (mesh) => {
      if (mesh.material.name === 'v176BonsaiPot01') mesh.material.roughness = 1
    },
  })
}

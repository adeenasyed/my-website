import { loadObject } from '../helpers.js'

export function loadGameConsole(tvStandBox) {
  return loadObject('/objects/console.glb', {
    size: 85,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 - (box.min.z + box.max.z) / 2,
    }),
    editMesh: (mesh) => {
      mesh.material.emissive.copy(mesh.material.color)
      mesh.material.emissiveIntensity = 0.7
    },
  })
}

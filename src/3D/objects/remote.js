import { loadObject, getMeshes } from './helpers.js'

export async function loadRemote() {
  const remote = await loadObject('/objects/remote.glb', {
    size: 55,
    rotation: { y: Math.PI / 90 },
    position: () => ({ x: -60, y: 70, z: 200 }),
  })
  remote.meshes = getMeshes(remote)
  return remote
}

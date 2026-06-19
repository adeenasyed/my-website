import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


export const loadFBX = (url) => new Promise((res, rej) => new FBXLoader().load(url, res, undefined, rej))

export const loadGLTF = (url) =>
  new Promise((res, rej) => new GLTFLoader().load(url, (gltf) => res(gltf.scene), undefined, rej))

export async function loadObject(file, { size, rotation, position, editMesh }) {
  const object = await loadGLTF(file)

  const originalBox = new THREE.Box3().setFromObject(object)
  const originalSize = originalBox.getSize(new THREE.Vector3())
  const scale = size / Math.max(originalSize.x, originalSize.y, originalSize.z)
  object.scale.setScalar(scale)

  if (rotation?.x != null) object.rotation.x = rotation.x
  if (rotation?.y != null) object.rotation.y = rotation.y
  if (rotation?.z != null) object.rotation.z = rotation.z

  if (position) {
    const box = new THREE.Box3().setFromObject(object)
    const { x, y, z } = position(box)
    object.position.set(x, y, z)
  }

  if (editMesh) {
    object.traverse((child) => {
      if (child.isMesh) editMesh(child)
    })
  }

  return object
}

export function getMeshes(object, extras = []) {
  const meshes = [...extras]
  object.traverse((child) => {
    if (child.isMesh) meshes.push(child)
  })
  return meshes
}

import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function loadImage(src) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  return new Promise((resolve) => {
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function loadFBX(url) {
  return new Promise((resolve, reject) => new FBXLoader().load(url, resolve, undefined, reject))
}

export function loadGLTF(url) {
  return new Promise((resolve, reject) => new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject))
}

export async function loadObject(file, { size, rotation, position, editMesh }) {
  const object = await loadGLTF(file)

  const originalBox = new THREE.Box3().setFromObject(object)
  const originalSize = originalBox.getSize(new THREE.Vector3())
  const scale = size / Math.max(originalSize.x, originalSize.y, originalSize.z)
  object.scale.setScalar(scale)

  if (rotation) Object.assign(object.rotation, rotation)

  const box = new THREE.Box3().setFromObject(object)
  const { x, y, z } = position(box)
  object.position.set(x, y, z)

  if (editMesh) object.traverse((child) => { if (child.isMesh) editMesh(child) })

  return object
}

export function getMeshes(object, extras = []) {
  const meshes = [...extras]
  object.traverse((child) => {
    if (child.isMesh) meshes.push(child)
  })
  return meshes
}

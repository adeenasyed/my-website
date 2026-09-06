import * as THREE from 'three'
import { loadFBX } from '../helpers.js'

export async function loadBear(degreeCenterX) {
  const object = await loadFBX('/objects/bear.fbx')

  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = 185 / Math.max(size.x, size.y, size.z)
  object.scale.setScalar(scale)
  object.position.set(degreeCenterX, 56, -260)

  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        map: child.material.map,
        color: child.material.color,
        side: THREE.DoubleSide,
      })
    }
  })

  const mixer = new THREE.AnimationMixer(object)
  mixer.clipAction(object.animations[0]).play()
  object.update = (delta) => mixer.update(delta)

  return object
}

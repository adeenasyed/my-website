import * as THREE from 'three'
import { loadObject, getMeshes } from '../helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT, CAMERA_FOV } from '../../constants.js'

export async function loadDegree() {
  const texture = new THREE.TextureLoader().load('/degree.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.rotation = -Math.PI / 2
  texture.center.set(0.5, 0.5)

  const object = await loadObject('/objects/frame.glb', {
    size: 140,
    rotation: { z: Math.PI / 2 },
    position: () => ({
      x: -68,
      y: ROOM_HEIGHT - 260,
      z: -ROOM_WIDTH / 2,
    }),
    editMesh: (mesh) => {
      if (mesh.material.name === 'lambert1') {
        mesh.material.metalness = 0.8
      } else {
        mesh.material.map = texture
        mesh.material.roughness = 1
        mesh.material.needsUpdate = true
      }
    },
  })

  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const zoomTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x, size.y),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  )
  zoomTarget.position.set(center.x, center.y, box.max.z + 0.5)
  zoomTarget.updateMatrixWorld()

  const verticalFOV = (CAMERA_FOV * Math.PI) / 180
  const distance = Math.max(
    size.y / 2 / Math.tan(verticalFOV / 2),
    size.x / 2 / (Math.tan(verticalFOV / 2) * (window.innerWidth / window.innerHeight)),
  ) * 1.3
  const zoomOffset = new THREE.Vector3(0, 0, distance)

  object.meshes = getMeshes(object)
  object.hoverColor = '#4A4A4A'
  object.zoom = { target: zoomTarget, offset: zoomOffset }

  return object
}

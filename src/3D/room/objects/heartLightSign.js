import * as THREE from 'three'
import { loadObject } from './helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../constants.js'
import { RED } from '@/theme.js'

export function loadHeartLightSign() {
  return loadObject('/objects/heart-light-sign.glb', {
    size: 50,
    rotation: { x: Math.PI / 2, z: Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - box.max.x,
      y: ROOM_HEIGHT - box.max.y - 29,
      z: 265 - box.min.z,
    }),
    editMesh: (mesh) => {
      mesh.material = new THREE.MeshStandardMaterial({
        color: RED,
        emissive: RED,
        emissiveIntensity: 2,
      })
    },
  })
}

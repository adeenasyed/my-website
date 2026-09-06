import * as THREE from 'three'
import { loadDegree } from './degree.js'
import { loadChair } from './chair.js'
import { loadBear } from './bear.js'
import { loadLightSign } from './lightSign.js'

export async function loadGraduationZone(maxAnisotropy) {
  const degree = await loadDegree(maxAnisotropy)
  const box = new THREE.Box3().setFromObject(degree)
  const centerX = (box.min.x + box.max.x) / 2

  const [chair, bear, lightSign] = await Promise.all([
    loadChair(centerX),
    loadBear(centerX),
    loadLightSign(centerX),
  ])

  return {
    objects: [degree, chair, bear, lightSign],
    animated: [bear],
    interactables: { degree, lightSign },
  }
}

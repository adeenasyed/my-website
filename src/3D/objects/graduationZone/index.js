import * as THREE from 'three'
import { loadDegree } from './degree.js'
import { loadChair } from './chair.js'
import { loadBear } from './bear.js'

export async function loadGraduationZone() {
  const degree = await loadDegree()
  const box = new THREE.Box3().setFromObject(degree)
  const centerX = (box.min.x + box.max.x) / 2

  const [chair, bear] = await Promise.all([
    loadChair(centerX),
    loadBear(centerX),
  ])

  return {
    objects: [degree, chair, bear],
    animated: [bear],
    interactables: { degree },
  }
}

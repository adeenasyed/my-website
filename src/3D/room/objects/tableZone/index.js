import * as THREE from 'three'
import { loadTable } from './table.js'
import { loadLaptop } from './laptop.js'
import { loadNoodles } from './noodles.js'

export async function loadTableZone(maxAnisotropy) {
  const table = await loadTable()
  const box = new THREE.Box3().setFromObject(table)

  const [laptop, noodles] = await Promise.all([
    loadLaptop(box, maxAnisotropy),
    loadNoodles(box),
  ])

  return {
    objects: [table, laptop, noodles],
    animated: [noodles],
    interactables: { laptop },
  }
}

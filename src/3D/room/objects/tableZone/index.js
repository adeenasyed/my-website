import * as THREE from 'three'
import { loadTable } from './table.js'
import { loadBook } from './book.js'

export async function loadTableZone(maxAnisotropy) {
  const table = await loadTable()
  const box = new THREE.Box3().setFromObject(table)
  const maxY = box.max.y

  const book = await loadBook(maxY, maxAnisotropy)

  return {
    objects: [table, book],
    animated: [book],
    interactables: { book },
  }
}

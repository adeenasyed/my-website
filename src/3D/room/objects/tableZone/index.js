import * as THREE from 'three'
import { loadTable } from './table.js'
import { loadBook } from './book.js'
import { loadNoodles } from './noodles.js'

export async function loadTableZone() {
  const table = await loadTable()
  const box = new THREE.Box3().setFromObject(table)
  const maxY = box.max.y

  const [book, noodles] = await Promise.all([
    loadBook(maxY),
    loadNoodles(maxY),
  ])

  return {
    objects: [table, book, noodles],
    animated: [noodles],
  }
}

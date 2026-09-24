import * as THREE from 'three'
import { loadShelf } from './shelf.js'
import { loadAJ4 } from './aj4.js'
import { loadButtons } from './buttons.js'

export async function loadShelfZone(maxAnisotropy) {
  const shelf = await loadShelf()
  const box = new THREE.Box3().setFromObject(shelf)

  const [aj4, buttons] = await Promise.all([
    loadAJ4(box),
    loadButtons(box, maxAnisotropy),
  ])

  return {
    objects: [shelf, aj4, buttons],
    interactables: {
      githubButton: buttons.github,
      infoButton: buttons.info
    },
  }
}

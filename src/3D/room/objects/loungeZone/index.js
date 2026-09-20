import * as THREE from 'three'
import { loadCouch } from './couch.js'
import { loadTVStand } from './tvStand.js'
import { loadTV } from './tv.js'
import { loadGameConsole } from './gameConsole.js'
import { loadNoodles } from './noodles.js'

export async function loadLoungeZone(maxAnisotropy) {
  const couch = await loadCouch()
  const couchBox = new THREE.Box3().setFromObject(couch)
  const couchCenterZ = (couchBox.min.z + couchBox.max.z) / 2

  const [tvStand, tv] = await Promise.all([
    loadTVStand(couchCenterZ),
    loadTV(couchCenterZ, maxAnisotropy),
  ])

  const tvStandBox = new THREE.Box3().setFromObject(tvStand)

  const [gameConsole, noodles] = await Promise.all([
    loadGameConsole(tvStandBox),
    loadNoodles(tvStandBox),
  ])

  return {
    objects: [couch, tv, tvStand, gameConsole, noodles],
    animated: [noodles],
    interactables: { tv },
  }
}

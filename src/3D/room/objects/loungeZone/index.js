import * as THREE from 'three'
import { loadCouch } from './couch.js'
import { loadTVStand } from './tvStand.js'
import { loadTV } from './tv.js'
import { loadGameConsole } from './gameConsole.js'
import { loadBonsai } from './bonsai.js'
import { loadCookies } from './cookies.js'

export async function loadLoungeZone(maxAnisotropy) {
  const couch = await loadCouch()
  const couchBox = new THREE.Box3().setFromObject(couch)
  const couchCenterZ = (couchBox.min.z + couchBox.max.z) / 2

  const [tvStand, tv] = await Promise.all([
    loadTVStand(couchCenterZ),
    loadTV(couchCenterZ, maxAnisotropy),
  ])

  const tvStandBox = new THREE.Box3().setFromObject(tvStand)

  const [gameConsole, bonsai, cookies] = await Promise.all([
    loadGameConsole(tvStandBox),
    loadBonsai(tvStandBox),
    loadCookies(tvStandBox),
  ])

  return {
    objects: [couch, tv, tvStand, gameConsole, cookies, bonsai],
    interactables: { tv },
  }
}

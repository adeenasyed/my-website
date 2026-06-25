import { loadPacman } from './pacman.js'
import { loadRug } from './rug.js'
import { loadLaptop } from './laptop.js'
import { loadRemote } from './remote.js'
import { loadLightSign } from './lightSign.js'
import { loadCatLightSign } from './catLightSign.js'
import { loadHeartLightSign } from './heartLightSign.js'
import { loadGraduationZone } from './graduationZone/index.js'
import { loadShelfZone } from './shelfZone/index.js'
import { loadLoungeZone } from './loungeZone/index.js'
import { loadTableZone } from './tableZone/index.js'

export async function loadObjects(maxAnisotropy) {
  await document.fonts.ready

  const [
    pacman,
    rug,
    laptop,
    remote,
    lightSign,
    catLightSign,
    heartLightSign,
    graduationZone,
    shelfZone,
    loungeZone,
    tableZone,
  ] = await Promise.all([
    loadPacman(),
    loadRug(maxAnisotropy),
    loadLaptop(),
    loadRemote(),
    loadLightSign(),
    loadCatLightSign(),
    loadHeartLightSign(),
    loadGraduationZone(),
    loadShelfZone(maxAnisotropy),
    loadLoungeZone(maxAnisotropy),
    loadTableZone(),
  ])

  return {
    objects: [
      pacman,
      rug,
      laptop,
      remote,
      lightSign,
      catLightSign,
      heartLightSign,
      ...graduationZone.objects,
      ...shelfZone.objects,
      ...loungeZone.objects,
      ...tableZone.objects,
    ],
    animated: [
      ...graduationZone.animated,
      ...tableZone.animated,
    ],
    interactables: {
      laptop,
      remote,
      lightSign,
      ...graduationZone.interactables,
      ...shelfZone.interactables,
      ...loungeZone.interactables,
    },
  }
}

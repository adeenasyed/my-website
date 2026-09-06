import { loadPacman } from './pacman.js'
import { loadRug } from './rug.js'
import { loadLaptop } from './laptop.js'
import { loadRemote } from './remote.js'
import { loadCatLightSign } from './catLightSign.js'
import { loadHeartLightSign } from './heartLightSign.js'
import { loadGraduationZone } from './graduationZone/index.js'
import { loadShelfZone } from './shelfZone/index.js'
import { loadLoungeZone } from './loungeZone/index.js'
import { loadTableZone } from './tableZone/index.js'
import { loadingManager } from './helpers.js'
import { FONT_FAMILY } from '@/theme.js'

export async function loadObjects(maxAnisotropy, onProgress) {
  loadingManager.onProgress = (_, loaded, total) => onProgress(loaded / total)

  await Promise.all([
    document.fonts.load(`1em ${FONT_FAMILY}`),
    document.fonts.load(`italic 1em ${FONT_FAMILY}`),
    document.fonts.load('1em "Inconsolata"', 'i'),
  ])

  const [
    pacman,
    rug,
    laptop,
    remote,
    catLightSign,
    heartLightSign,
    graduationZone,
    shelfZone,
    loungeZone,
    tableZone,
  ] = await Promise.all([
    loadPacman(),
    loadRug(maxAnisotropy),
    loadLaptop(maxAnisotropy),
    loadRemote(),
    loadCatLightSign(),
    loadHeartLightSign(),
    loadGraduationZone(maxAnisotropy),
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
      ...graduationZone.interactables,
      ...shelfZone.interactables,
      ...loungeZone.interactables,
    },
  }
}

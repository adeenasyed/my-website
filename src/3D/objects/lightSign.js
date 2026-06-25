import * as THREE from 'three'
import { loadGLTF, getMeshes } from './helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../constants.js'
import { BLACK, CYAN } from '@/theme.js'

const PATH = '/objects/character-light-signs'

const LINE1 = ['H', 'M', 'U']
const LINE2 = ['@', 'A', 'D', 'E', 'E', 'N', 'A']
const LINE3 = ['S', 'Y', 'E', 'D']
const SCALE = 24
const GAP = 8
const LINE_GAP = 15
const START_X = -188

const EMISSIVE_COLOR = '#00DDFF'

export async function loadLightSign() {
  const [objAt, objA, objD, objE, objH, objM, objN, objS, objU, objY] = await Promise.all([
    loadGLTF(`${PATH}/at.glb`),
    loadGLTF(`${PATH}/A.glb`),
    loadGLTF(`${PATH}/D.glb`),
    loadGLTF(`${PATH}/E.glb`),
    loadGLTF(`${PATH}/H.glb`),
    loadGLTF(`${PATH}/M.glb`),
    loadGLTF(`${PATH}/N.glb`),
    loadGLTF(`${PATH}/S.glb`),
    loadGLTF(`${PATH}/U.glb`),
    loadGLTF(`${PATH}/Y.glb`),
  ])

  const originals = {
    '@': objAt,
    A: objA,
    D: objD,
    E: objE,
    H: objH,
    M: objM,
    N: objN,
    S: objS,
    U: objU,
    Y: objY,
  }

  const group = new THREE.Group()

  function buildLine(letters, baselineY, rightEdge = null) {
    const built = letters.map((letter) => {
      const obj = originals[letter].clone()
      const box = new THREE.Box3().setFromObject(obj)
      const size = box.getSize(new THREE.Vector3())
      const scale = SCALE / Math.max(size.x, size.y, size.z)
      obj.scale.setScalar(scale)
      return { obj, box, scale, width: size.x * scale }
    })

    const totalWidth = built.reduce((sum, l) => sum + l.width, 0) + GAP * (letters.length - 1)
    let cursor = rightEdge !== null ? rightEdge - totalWidth : START_X
    const minX = cursor

    let secondLetterX = null
    for (const [i, { obj, box, scale, width }] of built.entries()) {
      obj.position.set(
        cursor - box.min.x * scale,
        baselineY - box.min.y * scale,
        -ROOM_WIDTH / 2 - box.min.z * scale,
      )
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: BLACK,
            emissive: EMISSIVE_COLOR,
          })
        }
      })
      group.add(obj)

      const light = new THREE.PointLight(CYAN, 800, 80)
      light.position.set(
        cursor - box.min.x * scale + ((box.min.x + box.max.x) / 2) * scale,
        baselineY - box.min.y * scale + ((box.min.y + box.max.y) / 2) * scale,
        -ROOM_WIDTH / 2 + 10,
      )
      group.add(light)

      cursor += width + GAP
      if (i === 0) secondLetterX = cursor - GAP
    }

    return {
      lineHeight: SCALE,
      minX,
      maxX: minX + totalWidth,
      baselineY,
      secondLetterX,
    }
  }

  const line1 = buildLine(LINE1, ROOM_HEIGHT - 75)
  const line2 = buildLine(LINE2, ROOM_HEIGHT - 75 - line1.lineHeight - LINE_GAP)
  const line3 = buildLine(LINE3, line2.baselineY - line2.lineHeight - LINE_GAP, line2.maxX)

  const underlineMaterial = new THREE.MeshStandardMaterial({
    color: BLACK,
    emissive: EMISSIVE_COLOR,
  })
  const underlineZ = -ROOM_WIDTH / 2 + 2

  for (const line of [line2, line3]) {
    const underlineMinX = line === line2 ? line2.secondLetterX + GAP * 0.75 : line.minX
    const underline = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, line.maxX - underlineMinX, 8),
      underlineMaterial,
    )
    underline.rotation.z = Math.PI / 2
    underline.position.set((underlineMinX + line.maxX) / 2, line.baselineY - 8, underlineZ)
    group.add(underline)
  }

  const signBox = new THREE.Box3().setFromObject(group)
  const signSize = signBox.getSize(new THREE.Vector3())
  const hitArea = new THREE.Mesh(
    new THREE.BoxGeometry(signSize.x, signSize.y, Math.max(signSize.z, 10)),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  )
  hitArea.position.copy(signBox.getCenter(new THREE.Vector3()))
  hitArea.updateMatrixWorld()

  group.meshes = getMeshes(group, [hitArea])
  group.hoverColor = '#88FFFF'

  return group
}

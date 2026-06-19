import * as THREE from 'three'
import { loadObject, getMeshes } from './helpers.js'
import { loadTV } from './tv.js'
import { loadLaptop } from './laptop.js'
import { loadLightSign } from './lightSign.js'
import { loadBear } from './bear.js'
import { loadNoodles } from './noodles.js'
import { ROOM_WIDTH, ROOM_HEIGHT, BASEBOARD_THICKNESS, BASEBOARD_CAP_OVERHANG } from '../constants.js'
import { WHITE, RED } from '../../theme.js'

function loadPacman() {
  return loadObject('/objects/pacman.glb', {
    size: 320,
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x,
      y: -box.min.y,
      z: -ROOM_WIDTH / 2 + BASEBOARD_THICKNESS + BASEBOARD_CAP_OVERHANG - box.min.z,
    }),
    editMesh: (mesh) => {
      if (mesh.material.name === 'scheibe') mesh.material = new THREE.MeshStandardMaterial({ color: 0x000000 })
    },
  })
}

function loadFrame() {
  return loadObject('/objects/frame.glb', {
    size: 140,
    rotation: { z: Math.PI / 2 },
    position: () => ({
      x: -68,
      y: ROOM_HEIGHT - 250,
      z: -ROOM_WIDTH / 2,
    }),
    editMesh: (mesh) => {
      if (mesh.material.name === 'lambert1') mesh.material.metalness = 0.8
      else mesh.material.roughness = 1
    },
  }).then((object) => {
    const light = new THREE.PointLight(0xffeecc, 0)
    light.position.set(-68, ROOM_HEIGHT - 250, -ROOM_WIDTH / 2)
    return { object, light }
  })
}

function loadChair(frameCenterX) {
  return loadObject('/objects/chair.glb', {
    size: 150,
    position: (box) => ({
      x: frameCenterX - (box.min.x + box.max.x) / 2,
      y: -box.min.y,
      z: 475,
    }),
  })
}

function loadShelf() {
  return loadObject('/objects/shelf.glb', {
    size: 410,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - box.max.x,
      y: ROOM_HEIGHT / 2 - (box.min.y + box.max.y) / 2,
      z: -ROOM_WIDTH / 2 - box.min.z,
    }),
    editMesh: (mesh) => {
      mesh.material.roughness = 1
    },
  })
}

function loadBasketballNet(shelfBox) {
  return loadObject('/objects/basketball-net.glb', {
    size: 75,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: shelfBox.min.x - (box.min.x + box.max.x) / 2 + 13.7,
      y: (shelfBox.min.y + shelfBox.max.y) / 2 - box.min.y + 64,
      z: shelfBox.min.z - box.min.z + 6,
    }),
  })
}

function loadInfoButton(shelfBox) {
  return loadObject('/objects/info-button.glb', {
    size: 45,
    position: (box) => ({
      x: shelfBox.max.x - (box.min.x + box.max.x) / 2 - 50,
      y: shelfBox.max.y - box.min.y - 207,
      z: shelfBox.max.z - (box.min.z + box.max.z) / 2 - 33,
    }),
  }).then((object) => {
    object.meshes = getMeshes(object)
    return object
  })
}

function loadRug(maxAnisotropy) {
  return loadObject('/objects/rug.glb', {
    size: 580,
    rotation: { y: Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x + 3,
      y: -box.min.y,
      z: ROOM_WIDTH / 2 - box.max.z - 3,
    }),
    editMesh: (mesh) => {
      if (mesh.material.map) mesh.material.map.anisotropy = maxAnisotropy
    },
  })
}

function loadCouch() {
  return loadObject('/objects/couch.glb', {
    size: 410,
    rotation: { y: Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x,
      y: -box.min.y,
      z: ROOM_WIDTH / 2 - box.max.z,
    }),
  })
}

function loadRemote() {
  return loadObject('/objects/remote.glb', {
    size: 55,
    rotation: { y: Math.PI / 90 },
    position: () => ({ x: -60, y: 70, z: 200 }),
  }).then((remote) => {
    remote.meshes = getMeshes(remote)
    return remote
  })
}

function loadTable() {
  return loadObject('/objects/table.glb', {
    size: 170,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: -ROOM_WIDTH / 2 - box.min.x + 225,
      y: -box.min.y + 12,
      z: ROOM_WIDTH / 2 - box.max.z - 190,
    }),
  })
}

function loadBook(tableMaxY) {
  return loadObject('/objects/book.glb', {
    size: 53,
    rotation: { y: Math.PI / 2.75 },
    position: (box) => ({
      x: -54,
      y: tableMaxY - box.min.y,
      z: 40,
    }),
  })
}

function loadTVStand(couchCenterZ) {
  return loadObject('/objects/tv-stand.glb', {
    size: 330,
    position: (box) => ({
      x: ROOM_WIDTH / 2 - BASEBOARD_THICKNESS - BASEBOARD_CAP_OVERHANG - box.max.x,
      y: -box.min.y,
      z: couchCenterZ - (box.min.z + box.max.z) / 2,
    }),
    editMesh: (mesh) => {
      mesh.material.roughness = 1
    },
  })
}

function loadSwitch(tvStandBox) {
  return loadObject('/objects/switch.glb', {
    size: 85,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 - (box.min.z + box.max.z) / 2,
    }),
  })
}

function loadBonsai(tvStandBox) {
  return loadObject('/objects/bonsai.glb', {
    size: 84,
    rotation: { y: Math.PI },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y - 5,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 + 112.5,
    }),
    editMesh: (mesh) => {
      if (mesh.material.name === 'v176BonsaiPot01') mesh.material.roughness = 1
    },
  })
}

function loadCookies(tvStandBox) {
  return loadObject('/objects/cookies.glb', {
    size: 45,
    rotation: { y: Math.PI },
    position: (box) => ({
      x: (tvStandBox.min.x + tvStandBox.max.x) / 2 - (box.min.x + box.max.x) / 2,
      y: tvStandBox.max.y - box.min.y,
      z: (tvStandBox.min.z + tvStandBox.max.z) / 2 - 105,
    }),
    editMesh: (mesh) => {
      mesh.material.emissive.set(WHITE)
      mesh.material.emissiveIntensity = 0.25
    },
  })
}


function loadCatLightSign() {
  return loadObject('/objects/cat-light-sign.glb', {
    size: 130,
    position: (box) => ({
      x: -278,
      y: ROOM_HEIGHT - box.min.y - 170,
      z: -ROOM_WIDTH / 2 - box.min.z,
    }),
  })
}

function loadHeartLightSign() {
  return loadObject('/objects/heart-light-sign.glb', {
    size: 50,
    rotation: { x: Math.PI / 2, z: Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - box.max.x,
      y: ROOM_HEIGHT - box.max.y - 29,
      z: 265 - box.min.z,
    }),
    editMesh: (mesh) => {
      mesh.material = new THREE.MeshStandardMaterial({
        color: RED,
        emissive: RED,
        emissiveIntensity: 2,
      })
    },
  })
}

export async function loadRoomObjects(maxAnisotropy) {
  await document.fonts.ready

  const [
    pacman,
    shelf,
    rug,
    couch,
    remote,
    table,
    lightSign,
    catLightSign,
    heartLightSign,
    { object: frame, light: frameLight },
    { object: laptop, screen: laptopScreen },
  ] = await Promise.all([
    loadPacman(),
    loadShelf(),
    loadRug(maxAnisotropy),
    loadCouch(),
    loadRemote(),
    loadTable(),
    loadLightSign(),
    loadCatLightSign(),
    loadHeartLightSign(),
    loadFrame(),
    loadLaptop(),
  ])

  const frameBox = new THREE.Box3().setFromObject(frame)
  const frameCenterX = (frameBox.min.x + frameBox.max.x) / 2

  const shelfBox = new THREE.Box3().setFromObject(shelf)

  const tableBox = new THREE.Box3().setFromObject(table)
  const tableMaxY = tableBox.max.y

  const couchBox = new THREE.Box3().setFromObject(couch)
  const couchCenterZ = (couchBox.min.z + couchBox.max.z) / 2

  const [
    chair,
    bear,
    basketballNet,
    infoButton,
    book,
    noodles,
    tvStand,
    { object: tv, screen: tvScreen, light: tvLight },
  ] = await Promise.all([
    loadChair(frameCenterX),
    loadBear(frameCenterX),
    loadBasketballNet(shelfBox),
    loadInfoButton(shelfBox),
    loadBook(tableMaxY),
    loadNoodles(tableMaxY),
    loadTVStand(couchCenterZ),
    loadTV(couchCenterZ, maxAnisotropy),
  ])

  const tvStandBox = new THREE.Box3().setFromObject(tvStand)

  const [
    nintendoSwitch,
    bonsai,
    cookies,
  ] = await Promise.all([
    loadSwitch(tvStandBox),
    loadBonsai(tvStandBox),
    loadCookies(tvStandBox),
  ])

  return {
    objects: [
      pacman,
      shelf,
      rug,
      couch,
      remote,
      table,
      lightSign,
      lightSign.hitArea,
      catLightSign,
      heartLightSign,
      frame,
      frameLight,
      laptop,
      laptopScreen,
      chair,
      bear,
      basketballNet,
      infoButton,
      book,
      noodles,
      tvStand,
      tv,
      tvScreen.mesh,
      tvLight,
      nintendoSwitch,
      bonsai,
      cookies,
    ],
    tv,
    tvScreen,
    laptop,
    laptopScreen,
    remote,
    lightSign,
    infoButton,
    bear,
    noodles,
  }
}

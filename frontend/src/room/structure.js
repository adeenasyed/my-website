import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  EDGE_THICKNESS,
  BASEBOARD_HEIGHT,
  BASEBOARD_THICKNESS,
  BASEBOARD_CAP_HEIGHT,
  BASEBOARD_CAP_OVERHANG,
} from './constants.js'
import { WHITE, PURPLE } from '../theme.js'

export function buildStructure(maxAnisotropy) {
  const lighting = buildLighting()
  return {
    lighting,
    meshes: [buildFloor(maxAnisotropy), ...buildWalls(), ...buildBaseboards(), lighting],
  }
}

const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 })

function buildFloor(maxAnisotropy) {
  const loader = new THREE.TextureLoader()

  const applySettings = (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)
    texture.anisotropy = maxAnisotropy
    return texture
  }

  const floorTexture = applySettings(loader.load('/floor_diffuse.png'))
  const normalTexture = applySettings(loader.load('/floor_normal.png'))

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(2, 2),
  })

  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, EDGE_THICKNESS, ROOM_WIDTH), [
    edgeMaterial,
    edgeMaterial,
    floorMaterial,
    edgeMaterial,
    edgeMaterial,
    edgeMaterial,
  ])
  floor.position.set(0, -EDGE_THICKNESS / 2, 0)
  floor.receiveShadow = true
  floor.castShadow = true

  return floor
}

function buildWalls() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2b1e })

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH + EDGE_THICKNESS, ROOM_HEIGHT + EDGE_THICKNESS, EDGE_THICKNESS),
    [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, wallMaterial, edgeMaterial]
  )
  leftWall.position.set(EDGE_THICKNESS / 2, ROOM_HEIGHT / 2 - EDGE_THICKNESS / 2, -ROOM_WIDTH / 2 - EDGE_THICKNESS / 2)
  leftWall.receiveShadow = true

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(EDGE_THICKNESS, ROOM_HEIGHT + EDGE_THICKNESS, ROOM_WIDTH), [
    edgeMaterial,
    wallMaterial,
    edgeMaterial,
    edgeMaterial,
    edgeMaterial,
    edgeMaterial,
  ])
  rightWall.position.set(ROOM_WIDTH / 2 + EDGE_THICKNESS / 2, ROOM_HEIGHT / 2 - EDGE_THICKNESS / 2, 0)
  rightWall.receiveShadow = true

  return [leftWall, rightWall]
}

function buildBaseboard(length, x, y, z, rotationY) {
  const baseboardMaterial = new THREE.MeshStandardMaterial({ color: WHITE })

  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.BoxGeometry(length, BASEBOARD_HEIGHT, BASEBOARD_THICKNESS), baseboardMaterial)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(length, BASEBOARD_CAP_HEIGHT, BASEBOARD_THICKNESS + BASEBOARD_CAP_OVERHANG),
    baseboardMaterial
  )
  cap.position.set(0, BASEBOARD_HEIGHT / 2 + BASEBOARD_CAP_HEIGHT / 2, BASEBOARD_CAP_OVERHANG / 2)
  cap.castShadow = true
  cap.receiveShadow = true
  group.add(cap)

  const bevel = new THREE.Mesh(new THREE.BoxGeometry(length, 2, 1), baseboardMaterial)
  bevel.position.set(0, 2, BASEBOARD_THICKNESS / 2 + 0.1)
  group.add(bevel)

  group.position.set(x, y + BASEBOARD_HEIGHT / 2, z)
  group.rotation.y = rotationY

  return group
}

function buildBaseboards() {
  return [
    buildBaseboard(ROOM_WIDTH, 0, 0, -ROOM_WIDTH / 2 + BASEBOARD_THICKNESS / 2, 0),
    buildBaseboard(ROOM_WIDTH, ROOM_WIDTH / 2 - BASEBOARD_THICKNESS / 2, 0, 0, -Math.PI / 2),
  ]
}

function buildLighting() {
  RectAreaLightUniformsLib.init()

  const hemi1 = new THREE.HemisphereLight(0xffeecc, 0x1c2b1e, 5)
  const hemi2 = new THREE.HemisphereLight(PURPLE, PURPLE, 1)
  const material = new THREE.MeshBasicMaterial({ color: PURPLE })
  const stripThickness = 4
  const y = ROOM_HEIGHT - stripThickness / 2

  const leftStrip = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, stripThickness, stripThickness), material)
  leftStrip.position.set(EDGE_THICKNESS / 2 - 4, y, -ROOM_WIDTH / 2 + stripThickness / 2)

  const rightStrip = new THREE.Mesh(new THREE.BoxGeometry(stripThickness, stripThickness, ROOM_WIDTH), material)
  rightStrip.position.set(ROOM_WIDTH / 2 - stripThickness / 2, y, 0)

  const leftLight = new THREE.RectAreaLight(PURPLE, 100, ROOM_WIDTH, stripThickness)
  leftLight.position.set(EDGE_THICKNESS / 2 - 4, y, -ROOM_WIDTH / 2 + stripThickness / 2)
  leftLight.lookAt(EDGE_THICKNESS / 2 - 4, 0, -ROOM_WIDTH / 2 + stripThickness / 2)

  const rightLight = new THREE.RectAreaLight(PURPLE, 100, stripThickness, ROOM_WIDTH)
  rightLight.position.set(ROOM_WIDTH / 2 - stripThickness / 2, y, 0)
  rightLight.lookAt(ROOM_WIDTH / 2 - stripThickness / 2, 0, 0)

  function setColor(color) {
    const c = new THREE.Color(color)
    hemi2.color.set(c)
    hemi2.groundColor.set(c)
    leftStrip.material.color.set(c)
    rightStrip.material.color.set(c)
    leftLight.color.set(c)
    rightLight.color.set(c)
  }

  const group = new THREE.Group()
  group.add(hemi1, hemi2, leftStrip, rightStrip, leftLight, rightLight)
  group.setColor = setColor

  return group
}

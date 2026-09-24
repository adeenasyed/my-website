import * as THREE from 'three'
import { getMeshes } from '../helpers.js'
import { WHITE } from '@/theme.js'
import { GITHUB_PROJECT } from '@/data/links.js'

const TEXTURE_SIZE = 512
const BUTTON_RADIUS = 18
const BUTTON_DEPTH = 4
const BUTTON_SPACING = 25
const INFO_BUTTON_COLOR = '#3D90D4'

export function loadButtons(shelfBox, maxAnisotropy) {
  const githubButton = buildButton(WHITE, githubButtonMaterial(maxAnisotropy))
  const infoButton = buildButton(INFO_BUTTON_COLOR, infoButtonMaterial(maxAnisotropy))

  githubButton.onClick = () => window.open(GITHUB_PROJECT, '_blank', 'noopener,noreferrer')

  githubButton.position.x = -BUTTON_SPACING
  infoButton.position.x = BUTTON_SPACING

  const buttons = new THREE.Group()
  buttons.position.set(
    (shelfBox.min.x + shelfBox.max.x) / 2 + 5,
    shelfBox.max.y + BUTTON_RADIUS - 85,
    (shelfBox.min.z + shelfBox.max.z) / 2 - 5,
  )
  buttons.rotation.y = -Math.PI / 4
  buttons.add(githubButton, infoButton)
  buttons.github = githubButton
  buttons.info = infoButton

  return buttons
}

function buildButton(color, material) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(BUTTON_RADIUS, BUTTON_RADIUS, BUTTON_DEPTH, 64),
    new THREE.MeshStandardMaterial({ color }),
  )
  body.rotation.x = Math.PI / 2

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(BUTTON_RADIUS, 64),
    material,
  )
  face.position.z = BUTTON_DEPTH / 2 + 0.75
  face.renderOrder = 1

  const group = new THREE.Group()
  group.add(body, face)
  group.meshes = getMeshes(group)

  return group
}

function createMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
}

function githubButtonMaterial(maxAnisotropy) {
  const texture = new THREE.TextureLoader().load('/images/github-logo.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return createMaterial(texture)
}

function infoButtonMaterial(maxAnisotropy) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEXTURE_SIZE
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  const context = canvas.getContext('2d')
  context.fillStyle = WHITE
  context.font = `${TEXTURE_SIZE * 0.9}px "Inconsolata"`

  const charBounds = context.measureText('i')
  const x = TEXTURE_SIZE / 2 - (charBounds.actualBoundingBoxRight - charBounds.actualBoundingBoxLeft) / 2
  const y = TEXTURE_SIZE / 2 + (charBounds.actualBoundingBoxAscent - charBounds.actualBoundingBoxDescent) / 2
  context.fillText('i', x, y)
  return createMaterial(texture)
}

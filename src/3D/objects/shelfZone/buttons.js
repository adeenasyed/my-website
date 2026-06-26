import * as THREE from 'three'
import { loadObject, getMeshes } from '../helpers.js'
import { BLACK, WHITE } from '@/theme.js'
import { GITHUB_PROJECT } from '@/data/links.js'

export async function loadButtons(shelfBox, maxAnisotropy) {
  const githubButton = await loadGithubButton(shelfBox)
  const infoButton = buildInfoButton(githubButton, maxAnisotropy)
  return { githubButton, infoButton }
}

function getButtonDimensions(size) {
  const dims = [
    { axis: new THREE.Vector3(1, 0, 0), value: size.x },
    { axis: new THREE.Vector3(0, 1, 0), value: size.y },
    { axis: new THREE.Vector3(0, 0, 1), value: size.z },
  ].sort((a, b) => a.value - b.value)
  return {
    radius: Math.max(dims[1].value, dims[2].value) / 2,
    depth: dims[0].value,
    normal: dims[0].axis,
  }
}

async function loadGithubButton(shelfBox) {
  const object = await loadObject('/objects/github-button.glb', {
    size: 36,
    position: (box) => ({
      x: shelfBox.min.x - (box.min.x + box.max.x) / 2 + 90,
      y: shelfBox.max.y - box.min.y - 98,
      z: shelfBox.min.z - (box.min.z + box.max.z) / 2 + 50,
    }),
  })

  const box = new THREE.Box3().setFromObject(object)
  const dims = getButtonDimensions(box.getSize(new THREE.Vector3()))
  const radius = dims.radius * 0.95
  const depth = dims.depth * 0.9
  const normal = dims.normal

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, 64),
    new THREE.MeshStandardMaterial({
      color: BLACK,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )
  disc.position.copy(box.getCenter(new THREE.Vector3()))
  disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
  object.attach(disc)

  object.traverse((child) => {
    if (child.isMesh && child !== disc) child.renderOrder = 1
  })

  object.meshes = getMeshes(object)
  object.onClick = () => window.open(GITHUB_PROJECT, '_blank', 'noopener,noreferrer')

  return object
}

const SPACE_BETWEEN = 45

function buildInfoButton(githubButton, maxAnisotropy) {
  const box = new THREE.Box3().setFromObject(githubButton)
  const { radius, depth, normal } = getButtonDimensions(box.getSize(new THREE.Vector3()))

  const group = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, 64),
    new THREE.MeshStandardMaterial({
      color: '#71CC71',
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )
  body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
  group.add(body)

  const textureSize = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = textureSize
  const context = canvas.getContext('2d')
  context.fillStyle = WHITE
  context.font = `${textureSize * 0.9}px "Inconsolata"`

  const char = 'i'
  const charBounds = context.measureText(char)
  const x = textureSize / 2 - (charBounds.actualBoundingBoxRight - charBounds.actualBoundingBoxLeft) / 2
  const y = textureSize / 2 + (charBounds.actualBoundingBoxAscent - charBounds.actualBoundingBoxDescent) / 2
  context.fillText(char, x, y)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
  })

  const charSize = radius * 1.8
  for (const dir of [normal, normal.clone().negate()]) {
    const i = new THREE.Mesh(new THREE.PlaneGeometry(charSize, charSize), material)
    i.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
    i.position.copy(dir).multiplyScalar(depth / 2 + 0.1)
    group.add(i)
  }

  const githubButtonCenter = box.getCenter(new THREE.Vector3())
  group.position.set(
    githubButtonCenter.x + SPACE_BETWEEN,
    box.min.y + radius,
    githubButtonCenter.z,
  )

  group.meshes = getMeshes(group)

  return group
}

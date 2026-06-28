import * as THREE from 'three'
import { ROOM_WIDTH, ROOM_HEIGHT, CAMERA_FOV } from '../../constants.js'

const FRAME_WIDTH = 140
const FRAME_HEIGHT = 108
const BORDER = 10
const DEPTH = 8
const INNER_DEPTH = 3
const INNER_WIDTH = FRAME_WIDTH - BORDER * 2
const INNER_HEIGHT = FRAME_HEIGHT - BORDER * 2

function createFrameSide(length) {
  const HALF_LENGTH = length/2
  const HALF_BORDER = BORDER/2
  const positions = new Float32Array([
    -HALF_LENGTH, -HALF_BORDER, 0,
     HALF_LENGTH, -HALF_BORDER, 0,
     HALF_LENGTH,  HALF_BORDER, 0,
    -HALF_LENGTH,  HALF_BORDER, 0,
    -HALF_LENGTH, -HALF_BORDER, INNER_DEPTH,
     HALF_LENGTH, -HALF_BORDER, INNER_DEPTH,
     HALF_LENGTH,  HALF_BORDER, DEPTH,
    -HALF_LENGTH,  HALF_BORDER, DEPTH,
  ])

  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ])
  const indices = [
    0, 3, 2,  0, 2, 1,
    4, 5, 6,  4, 6, 7,
    0, 1, 5,  0, 5, 4,
    3, 7, 6,  3, 6, 2,
  ]

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createFrameTexture() {
  let seed = 42
  const rand = () => {
    seed = Math.imul(seed ^ seed >>> 15, seed | 1) ^ (seed + Math.imul(seed ^ seed >>> 7, seed | 61))
    return ((seed ^ seed >>> 14) >>> 0) / 0x100000000
  }

  const WIDTH = 512
  const HEIGHT = 128
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')

  context.fillStyle = '#684420'
  context.fillRect(0, 0, WIDTH, HEIGHT)

  for (let i = 0; i < 22; i++) {
    const y = rand() * HEIGHT
    context.beginPath()
    context.moveTo(0, y)
    for (let x = 0; x <= WIDTH; x += 8) {
      context.lineTo(x, y + Math.sin(x * 0.012 + i * 4.1) * 8 + Math.sin(x * 0.035 + i) * 3)
    }
    context.strokeStyle = `rgba(160, 115, 65, ${0.03 + rand() * 0.05})`
    context.lineWidth = 3 + rand() * 7
    context.stroke()
  }

  for (let i = 0; i < 90; i++) {
    const y = (i / 90) * HEIGHT * 1.3 - HEIGHT * 0.15 + (rand() - 0.5) * 4
    context.beginPath()
    context.moveTo(0, y)
    for (let x = 0; x <= WIDTH; x += 4) {
      context.lineTo(x, y + Math.sin(x * 0.018 + i * 2.3) * 3.5 + Math.sin(x * 0.055 + i * 0.9) * 1.5)
    }
    const prominent = rand() > 0.55
    context.strokeStyle = prominent
      ? `rgba(140, 100, 55, ${0.05 + rand() * 0.07})`
      : `rgba(108, 78, 40, ${0.02 + rand() * 0.04})`
    context.lineWidth = prominent ? 0.5 + rand() * 1.2 : 0.3
    context.stroke()
  }

  for (let i = 0; i < 5; i++) {
    const centerX = rand() * WIDTH
    const centerY = rand() * HEIGHT
    const scaleX = 50 + rand() * 100
    const scaleY = 6 + rand() * 12
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 1)
    gradient.addColorStop(0, '#7A58304D')
    gradient.addColorStop(1, '#7A583000')
    context.fillStyle = gradient
    context.save()
    context.translate(centerX, centerY)
    context.scale(scaleX, scaleY)
    context.beginPath()
    context.arc(0, 0, 1, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  return texture
}

export async function loadDegree(maxAnisotropy) {
  const degree = await new Promise((resolve) => new THREE.TextureLoader().load('/degree.png', resolve))
  degree.colorSpace = THREE.SRGBColorSpace
  degree.anisotropy = maxAnisotropy

  const frameMaterial = new THREE.MeshStandardMaterial({ map: createFrameTexture() })

  const zOffset = -DEPTH / 2

  const top = new THREE.Mesh(createFrameSide(FRAME_WIDTH), frameMaterial)
  top.position.set(0, (FRAME_HEIGHT - BORDER) / 2, zOffset)

  const bottom = new THREE.Mesh(createFrameSide(FRAME_WIDTH), frameMaterial)
  bottom.rotation.z = Math.PI
  bottom.position.set(0, -(FRAME_HEIGHT - BORDER) / 2, zOffset)

  const left = new THREE.Mesh(createFrameSide(FRAME_HEIGHT), frameMaterial)
  left.rotation.z = Math.PI / 2
  left.position.set(-(FRAME_WIDTH - BORDER) / 2, 0, zOffset)

  const right = new THREE.Mesh(createFrameSide(FRAME_HEIGHT), frameMaterial)
  right.rotation.z = -Math.PI / 2
  right.position.set((FRAME_WIDTH - BORDER) / 2, 0, zOffset)

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(INNER_WIDTH, INNER_HEIGHT),
    new THREE.MeshStandardMaterial({ map: degree, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
  )
  panel.position.z = zOffset + 1

  const group = new THREE.Group()
  group.add(top, bottom, left, right, panel)
  group.position.set(-68, ROOM_HEIGHT - 260, -ROOM_WIDTH / 2 + DEPTH / 2)

  const zoomTarget = new THREE.Mesh(
    new THREE.PlaneGeometry(FRAME_WIDTH, FRAME_HEIGHT),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
  )
  zoomTarget.position.set(group.position.x, group.position.y, -ROOM_WIDTH / 2 + DEPTH + 0.5)
  zoomTarget.updateMatrixWorld()

  const verticalFOV = (CAMERA_FOV * Math.PI) / 180
  const distance = Math.max(
    FRAME_HEIGHT / 2 / Math.tan(verticalFOV / 2),
    FRAME_WIDTH / 2 / (Math.tan(verticalFOV / 2) * (window.innerWidth / window.innerHeight)),
  ) * 1.3
  const zoomOffset = new THREE.Vector3(0, 0, distance)

  group.meshes = [top, bottom, left, right, panel]
  group.hoverColor = '#4A4A4A'
  group.zoom = { target: zoomTarget, offset: zoomOffset }

  return group
}

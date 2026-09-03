import * as THREE from 'three'
import { FONT_FAMILY } from '@/theme.js'
import { altAzToScene } from './coordinates.js'
import { STAR_RADIUS } from './stars.js'

const LINE_RADIUS = STAR_RADIUS * 0.985
const LABEL_RADIUS = STAR_RADIUS * 0.98
const LABEL_RISE = 3
const MAX_ARC_STEP = THREE.MathUtils.degToRad(4)
const MAX_LABEL_ALT = THREE.MathUtils.degToRad(89)
const LABEL_FONT = `600 44px ${FONT_FAMILY}`

function getStar([raDeg, decDeg], toAltAz, rise = 0) {
  const { alt, az } = toAltAz(raDeg, decDeg)
  const directionAlt = rise ? Math.min(alt + THREE.MathUtils.degToRad(rise), MAX_LABEL_ALT) : alt
  return { alt, direction: altAzToScene(directionAlt, az, 1, new THREE.Vector3()).normalize() }
}

function addArc(positions, start, end) {
  const steps = Math.max(1, Math.ceil(start.angleTo(end) / MAX_ARC_STEP))
  let previous = start.clone().multiplyScalar(LINE_RADIUS)

  for (let i = 1; i <= steps; i++) {
    const current = start.clone().lerp(end, i / steps).normalize().multiplyScalar(LINE_RADIUS)
    positions.push(previous.x, previous.y, previous.z, current.x, current.y, current.z)
    previous = current
  }
}

function createLabel(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 904
  canvas.height = 113
  const context = canvas.getContext('2d')

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = LABEL_FONT
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.letterSpacing = '5.25px'
    context.fillStyle = '#bdeeff'
    context.shadowColor = '#050309'
    context.shadowBlur = 5
    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2)
  }

  draw()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: false,
  })
  const sprite = new THREE.Sprite(material)
  const redraw = () => {
    draw()
    texture.needsUpdate = true
  }
  sprite.scale.set(27550, 3444, 1)
  return { sprite, redraw }
}

export function createConstellations(patterns, toAltAz) {
  const group = new THREE.Group()
  const positions = []
  const labels = []

  for (const pattern of patterns) {
    const stars = pattern.points.map((point) => getStar(point, toAltAz))
    if (stars.some((star) => star.alt <= 0)) continue

    for (const [from, to] of pattern.segments) {
      addArc(positions, stars[from].direction, stars[to].direction)
    }

    const label = createLabel(pattern.name)
    const direction = getStar(pattern.labelPosition, toAltAz, LABEL_RISE).direction
    label.sprite.position.copy(direction.multiplyScalar(LABEL_RADIUS))
    labels.push(label)
    group.add(label.sprite)
  }

  let disposed = false
  document.fonts.load(LABEL_FONT).then(() => {
    if (disposed) return
    for (const label of labels) label.redraw()
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: '#78D9FF',
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.renderOrder = 0
  group.add(lines)
  group.visible = false

  function setVisible(visible) { 
    group.visible = visible
  }

  function dispose() {
    disposed = true
    geometry.dispose()
    material.dispose()
    for (const label of labels) {
      label.sprite.material.map.dispose()
      label.sprite.material.dispose()
    }
  }

  return { group, setVisible, dispose }
}

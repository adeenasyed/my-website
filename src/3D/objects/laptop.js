import * as THREE from 'three'
import { loadObject, getMeshes } from './helpers.js'
import { FONT_FAMILY, BLACK, WHITE, GRAY, CYAN } from '@/theme.js'
import { EXPERIENCE } from '@/data/experience.js'

export async function loadLaptop(maxAnisotropy) {
  const object = await loadObject('/objects/laptop.glb', {
    size: 85,
    rotation: { y: -Math.PI / 45 },
    position: (box) => ({
      x: -222,
      y: 72 - box.min.y,
      z: 10,
    }),
    editMesh: (mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of materials) {
        for (const val of Object.values(mat)) {
          if (val?.isTexture) val.anisotropy = maxAnisotropy
        }
      }
    },
  })

  const worldBox = new THREE.Box3().setFromObject(object)
  const { screen, scroll } = buildScreen(worldBox, maxAnisotropy)

  const laptop = new THREE.Group()
  laptop.add(object, screen)
  laptop.meshes = getMeshes(object, [screen])
  laptop.hoverColor = '#666666'
  laptop.zoom = {
    target: screen,
    offset: new THREE.Vector3(Math.sin(-Math.PI / 45) * 75, 0, Math.cos(-Math.PI / 45) * 75),
    onScroll: scroll,
  }

  return laptop
}

const CANVAS_WIDTH = 2048
const DRAW_WIDTH = 1024
const DRAW_HEIGHT = 580
const SCALE = CANVAS_WIDTH / DRAW_WIDTH
const PADDING = 48
const TIMELINE_X = 20
const DOT_RADIUS = 3
const START_Y = 95
const COMPANY_Y_OFFSET = 28
const DESCRIPTION_Y_OFFSET = 65
const BULLET_X = 64
const ROW = 125
const CONTENT_HEIGHT = START_Y + EXPERIENCE.length * ROW
const MAX_SCROLL = Math.max(0, CONTENT_HEIGHT - DRAW_HEIGHT)
const FULL_HEIGHT = Math.max(CONTENT_HEIGHT, DRAW_HEIGHT)
const VISIBLE_FRACTION = DRAW_HEIGHT / FULL_HEIGHT

const HEADER_FONT = `bold 30px ${FONT_FAMILY}`
const ROLE_FONT = `bold 20px ${FONT_FAMILY}`
const DATE_FONT = `15px ${FONT_FAMILY}`
const COMPANY_FONT = `italic 16px ${FONT_FAMILY}`
const DESCRIPTION_FONT = `14px ${FONT_FAMILY}`

function scrollBarGeometry(width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  const w = width / 2
  const h = height / 2
  const shape = new THREE.Shape()
  shape.moveTo(-w + r, -h)
  shape.lineTo(w - r, -h)
  shape.quadraticCurveTo(w, -h, w, -h + r)
  shape.lineTo(w, h - r)
  shape.quadraticCurveTo(w, h, w - r, h)
  shape.lineTo(-w + r, h)
  shape.quadraticCurveTo(-w, h, -w, h - r)
  shape.lineTo(-w, -h + r)
  shape.quadraticCurveTo(-w, -h, -w + r, -h)
  return new THREE.ShapeGeometry(shape)
}

function buildScreen(worldBox, maxAnisotropy) {
  const worldSize = worldBox.getSize(new THREE.Vector3())

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = FULL_HEIGHT * SCALE
  const context = canvas.getContext('2d')

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  texture.repeat.set(1, VISIBLE_FRACTION)
  const material = new THREE.MeshBasicMaterial({ map: texture })
  material.toneMapped = false

  const screenWidth = worldSize.x * 0.93
  const screenHeight = screenWidth * (DRAW_HEIGHT / DRAW_WIDTH)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), material)
  screen.rotation.y = -Math.PI / 45
  screen.position.set(
    (worldBox.min.x + worldBox.max.x) / 2 + 2,
    worldBox.min.y + worldSize.y * 0.525,
    worldBox.max.z - worldSize.z * 0.93,
  )

  function drawResume() {
    context.fillStyle = BLACK
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.scale(SCALE, SCALE)

    context.fillStyle = CYAN
    context.font = HEADER_FONT
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillText('EXPERIENCE', TIMELINE_X, 28)

    const railEnd = START_Y + (EXPERIENCE.length - 1) * ROW + 10
    context.strokeStyle = `${CYAN}33`
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(TIMELINE_X, START_Y + 10)
    context.lineTo(TIMELINE_X, railEnd)
    context.stroke()

    for (const [i, e] of EXPERIENCE.entries()) {
      const y = START_Y + i * ROW

      context.shadowBlur = 10
      context.shadowColor = CYAN
      context.fillStyle = CYAN
      context.beginPath()
      context.arc(TIMELINE_X, y + 10, DOT_RADIUS, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0

      context.fillStyle = WHITE
      context.font = DATE_FONT
      context.textAlign = 'left'
      context.fillText(`${e.dates} · ${e.location}`, PADDING, y + 2)

      context.font = ROLE_FONT
      context.textAlign = 'right'
      context.fillText(e.role, DRAW_WIDTH - PADDING, y)

      context.font = COMPANY_FONT
      context.textAlign = 'right'
      context.fillText(e.company, DRAW_WIDTH - PADDING, y + COMPANY_Y_OFFSET)

      if (e.description) {
        context.fillStyle = GRAY
        context.font = DESCRIPTION_FONT
        context.textAlign = 'left'
        context.fillText(`• ${e.description}`, BULLET_X, y + DESCRIPTION_Y_OFFSET)
      }
    }

    context.restore()
  }

  drawResume()
  texture.needsUpdate = true

  let scrollY = 0
  let thumb = null
  let thumbTravel = 0

  if (MAX_SCROLL > 0) {
    const trackWidth = screenWidth * (5 / DRAW_WIDTH)
    const trackHeight = screenHeight * ((DRAW_HEIGHT - 16) / DRAW_HEIGHT)
    const trackRadius = screenWidth * (3 / DRAW_WIDTH)
    const trackX = screenWidth / 2 - trackWidth * 1.5
    const thumbHeight = Math.max(trackHeight * 0.06, trackHeight * (DRAW_HEIGHT / CONTENT_HEIGHT))
    thumbTravel = trackHeight - thumbHeight

    const track = new THREE.Mesh(
      scrollBarGeometry(trackWidth, trackHeight, trackRadius),
      new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.13, toneMapped: false }),
    )
    track.position.set(trackX, 0, 0.3)

    thumb = new THREE.Mesh(
      scrollBarGeometry(trackWidth, thumbHeight, trackRadius),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.53, toneMapped: false }),
    )
    thumb.position.set(trackX, 0, 0.4)

    screen.add(track, thumb)
  }

  function setScroll() {
    texture.offset.y = 1 - VISIBLE_FRACTION - scrollY / FULL_HEIGHT
    if (thumb) thumb.position.y = thumbTravel / 2 - (scrollY / MAX_SCROLL) * thumbTravel
  }

  setScroll()

  const scroll = (delta) => {
    const next = Math.max(0, Math.min(MAX_SCROLL, scrollY + delta * 0.5))
    if (next === scrollY) return
    scrollY = next
    setScroll()
  }

  return { screen, scroll }
}
import * as THREE from 'three'
import { loadObject, getMeshes } from './helpers.js'
import { FONT_FAMILY, BLACK, WHITE, GRAY, CYAN } from '../../theme.js'

export async function loadLaptop() {
  const object = await loadObject('/objects/laptop.glb', {
    size: 85,
    rotation: { y: -Math.PI / 45 },
    position: (box) => ({
      x: -222,
      y: 72 - box.min.y,
      z: 10,
    }),
  })

  const worldBox = new THREE.Box3().setFromObject(object)
  const worldSize = worldBox.getSize(new THREE.Vector3())

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  drawResume(context)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  })
  material.toneMapped = false

  const screenWidth = worldSize.x * 0.93
  const screenHeight = screenWidth * (CANVAS_HEIGHT / CANVAS_WIDTH)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), material)

  screen.rotation.y = -Math.PI / 45

  screen.position.set(
    (worldBox.min.x + worldBox.max.x) / 2 + 2,
    worldBox.min.y + worldSize.y * 0.525,
    worldBox.max.z - worldSize.z * 0.93
  )

  object.meshes = getMeshes(object, [screen])
  object.hoverColor = 0x666666

  let scrollY = 0
  object.scroll = (delta) => {
    scrollY = Math.max(0, Math.min(MAX_SCROLL, scrollY + delta * 0.5))
    drawResume(context, scrollY)
    texture.needsUpdate = true
  }

  screen.zoomOffset = new THREE.Vector3(Math.sin(-Math.PI / 45) * 75, 0, Math.cos(-Math.PI / 45) * 75)

  return { object, screen }
}

const EXPERIENCE = [
  {
    role: 'Software Engineer Intern',
    dates: 'Sep. 2025 – Dec. 2025',
    company: 'Essos (Stealth Startup)',
    location: 'New York, NY',
    description: "Developed a facial analysis app from scratch using Apple's 3D face mapping technology.",
  },
  {
    role: 'Software Engineer Intern',
    dates: 'Jan. 2025 – Aug. 2025',
    company: 'Vivid Seats',
    location: 'Toronto, ON',
    description: 'Backend. Unlocked new markets and modernized user segmentation.',
  },
  {
    role: 'Software Engineer Intern',
    dates: 'May 2024 – Aug. 2024',
    company: 'Vivid Seats',
    location: 'Toronto, ON',
    description: 'Frontend. Boosted conversion rates and search impressions.',
  },
  {
    role: 'Freelance Software Engineer',
    dates: 'Sep. 2023 – Aug. 2024',
    company: 'KbSpas + Realty Point',
    location: 'Toronto, ON',
    description: 'Created booking platforms for small businesses according to their specific needs.',
  },
  {
    role: 'Quality Assurance Intern',
    dates: 'Sep. 2023 – Dec. 2023',
    company: 'NRT Technology',
    location: 'Toronto, ON',
    description: 'Tested and improved VisuaLimits, a computer vision system for casino table games.',
  },
]

const CANVAS_WIDTH = 2048
const CANVAS_HEIGHT = 1160
const DRAW_WIDTH = 1024
const DRAW_HEIGHT = 580
const SCALE = CANVAS_WIDTH / DRAW_WIDTH
const PADDING = 48
const TIMELINE_X = 20
const DOT_RADIUS = 3
const START_Y = 95
const COMPANY_Y_OFFSET = 28
const DESCRIPTION_Y_OFFSET = 60
const BULLET_X = 64
const ROW = 125
const CONTENT_HEIGHT = START_Y + EXPERIENCE.length * ROW
const MAX_SCROLL = Math.max(0, CONTENT_HEIGHT - DRAW_HEIGHT)

const HEADER_FONT = `bold 30px ${FONT_FAMILY}`
const ROLE_FONT = `bold 20px ${FONT_FAMILY}`
const DATE_FONT = `15px ${FONT_FAMILY}`
const COMPANY_FONT = `italic 16px ${FONT_FAMILY}`
const DESCRIPTION_FONT = `14px ${FONT_FAMILY}`

function drawResume(context, scrollY = 0) {
  context.fillStyle = BLACK
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  context.save()
  context.scale(SCALE, SCALE)

  if (MAX_SCROLL > 0) {
    const trackX = DRAW_WIDTH - 10
    const trackH = DRAW_HEIGHT - 16
    const thumbH = Math.max(30, (DRAW_HEIGHT / CONTENT_HEIGHT) * trackH)
    const thumbY = 8 + (scrollY / MAX_SCROLL) * (trackH - thumbH)

    context.fillStyle = `${WHITE}22`
    context.beginPath()
    context.roundRect(trackX - 3, 8, 5, trackH, 3)
    context.fill()

    context.fillStyle = `${CYAN}88`
    context.beginPath()
    context.roundRect(trackX - 3, thumbY, 5, thumbH, 3)
    context.fill()
  }

  context.translate(0, -scrollY)

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

  EXPERIENCE.forEach((_, i) => {
    const dotY = START_Y + i * ROW + 10
    context.shadowBlur = 10
    context.shadowColor = CYAN
    context.fillStyle = CYAN
    context.beginPath()
    context.arc(TIMELINE_X, dotY, DOT_RADIUS, 0, Math.PI * 2)
    context.fill()
  })
  context.shadowBlur = 0

  EXPERIENCE.forEach((e, i) => {
    const y = START_Y + i * ROW

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
      context.fillText('• ' + e.description, BULLET_X, y + DESCRIPTION_Y_OFFSET)
    }
  })

  context.restore()
}

import * as THREE from 'three'
import { altAzToScene } from './coordinates.js'
import { STAR_RADIUS, COLOR_SATURATION } from './stars.js'

const MARKER_RADIUS = STAR_RADIUS * 0.99
const PICK_RADIUS = 3400
const TEXTURE_SIZE = 256
const CENTER = TEXTURE_SIZE / 2
const TAU = Math.PI * 2

const MARKER_STYLES = {
  sun: { color: '#ffdf8f', size: 9800, blending: THREE.NormalBlending },
  star: { color: '#fff4e8', size: 5600 },
  planet: { color: '#ffffff', size: 5300, blending: THREE.NormalBlending },
  moon: { color: '#e9e6df', size: 8700, blending: THREE.NormalBlending },
  galaxy: { color: '#cbbcff', size: 10800 },
  nebula: { color: '#ff9ecb', size: 10100 },
  remnant: { color: '#ffb27d', size: 9500 },
  cluster: { color: '#c3e2ff', size: 9900 },
}

const MARKER_ANIMATIONS = {
  star: { opacityAmp: 0.3, scaleAmp: 0.126, speed: [1.2, 3.4] },
  cluster: { opacityAmp: 0, scaleAmp: 0.08, speed: [0.8, 1.35] },
}

const DEEP_SKY_BAND = { minAngle: 0.023, maxAngle: 3.17, minSize: 8300, maxSize: 12000 }

const FILL_TRIM = {
  'Andromeda Galaxy': 0.95,
  'Whirlpool Galaxy': 0.98,
  'Bode’s Galaxy': 0.88,
  'Triangulum Galaxy': 0.78,
  'Ring Nebula': 0.94,
  'Dumbbell Nebula': 1.04,
}

const OBJECT_TINT = {
  Pleiades: '#b9d8ff',
  'Beehive Cluster': '#fff0cf',
  'Double Cluster': '#d4e7ff',
  Hyades: '#ffe1b8',
  'Bode’s Galaxy': '#f6e7d4',
  'Triangulum Galaxy': '#c4d6ff',
}

const OBJECT_TEXTURES = {
  Mars: 'mars',
  Jupiter: 'jupiter',
  Saturn: 'saturn',
  'Andromeda Galaxy': 'galaxy-edge',
  'Bode’s Galaxy': 'galaxy-bode',
  'Triangulum Galaxy': 'galaxy-triangulum',
  'Ring Nebula': 'ring',
  'Dumbbell Nebula': 'dumbbell',
  Pleiades: 'cluster-pleiades',
  'Double Cluster': 'cluster-double',
  Hyades: 'cluster-hyades',
}

function seededRandom(seed) {
  let value = seed
  return () => {
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function makeCanvas(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEXTURE_SIZE
  const context = canvas.getContext('2d')
  context.lineCap = 'round'
  draw(context)
  return canvas
}

function makeTexture(draw, { crisp = false } = {}) {
  const texture = new THREE.CanvasTexture(makeCanvas(draw))
  texture.colorSpace = THREE.SRGBColorSpace
  if (crisp) {
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
  }
  return texture
}

function glow(context, x, y, radius, alpha, falloff = 2.4) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    gradient.addColorStop(t, `rgba(255,255,255,${alpha * Math.pow(1 - t, falloff)})`)
  }
  context.fillStyle = gradient
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function mote(context, x, y, radius, alpha) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    const t = THREE.MathUtils.clamp((1 - u) / 0.7, 0, 1)
    gradient.addColorStop(u, `rgba(255,255,255,${alpha * t * t * (3 - 2 * t)})`)
  }
  context.fillStyle = gradient
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function cloud(context, x, y, rx, ry, rotation, alpha, falloff = 2.2) {
  context.save()
  context.translate(x, y)
  context.rotate(rotation)
  context.scale(1, ry / rx)
  glow(context, 0, 0, rx, alpha, falloff)
  context.restore()
}

function disc(context, x, y, radius, {
  centerOpacity = 1,
  edgeOpacity = 0.5,
  lightOffset = 0.32,
  middleOpacity = 0.9,
} = {}) {
  const gradient = context.createRadialGradient(
    x - radius * lightOffset, y - radius * lightOffset, radius * 0.04,
    x, y, radius,
  )
  gradient.addColorStop(0, `rgba(255,255,255,${centerOpacity})`)
  gradient.addColorStop(0.72, `rgba(255,255,255,${centerOpacity * middleOpacity})`)
  gradient.addColorStop(1, `rgba(255,255,255,${edgeOpacity})`)
  context.beginPath()
  context.arc(x, y, radius, 0, TAU)
  context.fillStyle = gradient
  context.fill()
}

function soften(context, radius, draw) {
  context.save()
  context.filter = `blur(${radius}px)`
  draw()
  context.restore()
}

function mottle(context, x, y, radius, { seed, count = 26, min = 0.14, max = 0.34, alpha = 0.05, dark = true }) {
  const random = seededRandom(seed)
  context.save()
  context.filter = 'blur(6px)'
  for (let i = 0; i < count; i++) {
    const angle = random() * TAU
    const distance = Math.sqrt(random()) * radius * 0.92
    const size = radius * (min + random() * (max - min))
    const strength = alpha * (0.4 + random() * 0.6)
    context.fillStyle = dark ? `rgba(0,0,0,${strength})` : `rgba(255,255,255,${strength})`
    context.beginPath()
    context.ellipse(
      x + Math.cos(angle) * distance, y + Math.sin(angle) * distance,
      size, size * (0.6 + random() * 0.6), random() * TAU, 0, TAU,
    )
    context.fill()
  }
  context.restore()
}

function spike(context, length, width, alpha, rotation) {
  context.save()
  context.translate(CENTER, CENTER)
  context.rotate(rotation)
  context.filter = 'blur(1.4px)'
  const taper = context.createLinearGradient(0, 0, length, 0)
  taper.addColorStop(0, `rgba(255,255,255,${alpha})`)
  taper.addColorStop(0.14, `rgba(255,255,255,${alpha * 0.8})`)
  taper.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.28})`)
  taper.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = taper
  context.beginPath()
  context.moveTo(0, -width)
  context.quadraticCurveTo(length * 0.3, -width * 0.28, length, 0)
  context.quadraticCurveTo(length * 0.3, width * 0.28, 0, width)
  context.closePath()
  context.fill()
  context.restore()
}

function embeddedStar(context, x, y, brightness) {
  glow(context, x, y, 13, brightness * 0.34)
  disc(context, x, y, 2.6, {
    centerOpacity: brightness,
    edgeOpacity: brightness * 0.7,
    lightOffset: 0,
  })
}

function starTexture() {
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 126, 0.22, 3.0)
    for (const [length, rotation] of [[116, 0], [102, Math.PI / 2], [110, Math.PI], [96, Math.PI * 1.5]]) {
      spike(context, length, 4, 0.78, rotation)
    }
    for (let i = 0; i < 4; i++) spike(context, 30, 2.2, 0.22, (i / 4) * TAU + Math.PI / 4)
    glow(context, CENTER, CENTER, 52, 0.4, 2.8)
    glow(context, CENTER, CENTER, 24, 0.95, 2.0)
    glow(context, CENTER, CENTER, 10, 1, 1.6)
    disc(context, CENTER, CENTER, 6.5, { centerOpacity: 1, edgeOpacity: 0.95, lightOffset: 0 })
  })
}

function sunTexture() {
  const random = seededRandom(9)
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 128, 0.28, 1.6)
    soften(context, 12, () => {
      for (let i = 0; i < 9; i++) {
        const angle = random() * TAU
        const reach = 58 + random() * 46
        cloud(
          context, CENTER + Math.cos(angle) * reach * 0.5, CENTER + Math.sin(angle) * reach * 0.5,
          reach * 0.62, reach * 0.34, angle, 0.085, 1.8,
        )
      }
    })
    glow(context, CENTER, CENTER, 88, 0.24, 2.0)
    glow(context, CENTER, CENTER, 70, 0.4, 2.2)
    disc(context, CENTER, CENTER, 57, {
      centerOpacity: 1,
      edgeOpacity: 0.8,
      lightOffset: 0.05,
      middleOpacity: 0.97,
    })
    context.save()
    context.beginPath()
    context.arc(CENTER, CENTER, 57, 0, TAU)
    context.clip()
    mottle(context, CENTER, CENTER, 57, { seed: 4, count: 22, alpha: 0.05, dark: false, min: 0.08, max: 0.2 })
    mottle(context, CENTER, CENTER, 57, { seed: 8, count: 16, alpha: 0.04, min: 0.08, max: 0.2 })
    context.restore()
  })
}

const MARIA = [
  [-26, -33, 27, 23, -0.25, 1.00],
  [-44, 2, 20, 38, 0.18, 0.78],
  [16, -26, 17, 15, 0.10, 0.92],
  [24, -2, 18, 17, -0.20, 1.00],
  [40, 20, 12, 15, 0.00, 0.85],
  [20, 24, 11, 10, 0.00, 0.72],
  [48, -40, 9, 7, -0.30, 0.95],
  [-20, 28, 16, 11, 0.30, 0.62],
  [-38, 32, 10, 9, 0.00, 0.58],
]

function moonTexture({ illuminated = 0.82, waxing = true } = {}) {
  const radius = 66
  const body = makeCanvas((context) => {
    disc(context, CENTER, CENTER, radius, {
      centerOpacity: 1,
      edgeOpacity: 0.88,
      lightOffset: -0.05 * (waxing ? 1 : -1),
      middleOpacity: 0.98,
    })

    context.save()
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.clip()

    soften(context, 9, () => {
      context.strokeStyle = 'rgba(255,255,255,0.070)'
      context.lineWidth = 5
      for (let i = 0; i < 9; i++) {
        const angle = -Math.PI / 2 + (i - 4) * 0.38
        context.beginPath()
        context.moveTo(CENTER - 8, CENTER + 40)
        context.lineTo(CENTER - 8 + Math.cos(angle) * 98, CENTER + 40 + Math.sin(angle) * 98)
        context.stroke()
      }
    })

    mottle(context, CENTER, CENTER, radius, { seed: 5, count: 30, alpha: 0.04, dark: false })
    mottle(context, CENTER, CENTER, radius, { seed: 12, count: 34, alpha: 0.055 })

    soften(context, 5.5, () => {
      for (const [dx, dy, rx, ry, rotation, weight] of MARIA) {
        context.fillStyle = `rgba(16,15,20,${0.1 * weight})`
        for (let pass = 0; pass < 2; pass++) {
          const shrink = 1 - pass * 0.22
          context.beginPath()
          context.ellipse(CENTER + dx, CENTER + dy, rx * shrink, ry * shrink, rotation, 0, TAU)
          context.fill()
        }
      }
    })

    soften(context, 2.5, () => {
      context.fillStyle = 'rgba(255,255,255,0.28)'
      for (const [dx, dy, r] of [[-8, 40, 4], [-17, -14, 3.2], [34, 45, 2.4], [52, 6, 2]]) {
        context.beginPath()
        context.arc(CENTER + dx, CENTER + dy, r, 0, TAU)
        context.fill()
      }
    })
    context.restore()

    const phase = 2 * THREE.MathUtils.clamp(illuminated, 0, 1) - 1
    const direction = waxing ? 1 : -1
    context.globalCompositeOperation = 'destination-in'
    context.beginPath()
    context.arc(CENTER, CENTER, radius, -Math.PI / 2, Math.PI / 2, !waxing)
    context.ellipse(
      CENTER,
      CENTER,
      Math.abs(phase) * radius,
      radius,
      0,
      Math.PI / 2,
      -Math.PI / 2,
      waxing !== (phase >= 0),
    )
    context.closePath()
    context.fillStyle = '#fff'
    context.fill()

    const band = radius * (0.05 + 0.24 * (1 - Math.abs(phase)))
    const apex = CENTER - direction * phase * radius
    context.globalCompositeOperation = 'destination-out'
    const fade = context.createLinearGradient(apex - direction * band * 0.5, 0, apex + direction * band, 0)
    fade.addColorStop(0, 'rgba(0,0,0,0.8)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = fade
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.fill()
  })

  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 124, 0.14 * THREE.MathUtils.clamp(illuminated, 0, 1), 2.6)
    context.drawImage(body, 0, 0)
  })
}

function planetTexture() {
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.15, 2.8)
    glow(context, CENTER, CENTER, 48, 0.26, 2.4)
    disc(context, CENTER, CENTER, 40, { centerOpacity: 1, edgeOpacity: 0.55, lightOffset: 0.3 })
  })
}

function marsTexture() {
  const radius = 40
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.15, 2.8)
    glow(context, CENTER, CENTER, 48, 0.24, 2.4)
    disc(context, CENTER, CENTER, radius, { centerOpacity: 1, edgeOpacity: 0.55, lightOffset: 0.3 })
    context.save()
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.clip()
    soften(context, 5, () => {
      context.fillStyle = 'rgba(30,10,6,0.34)'
      context.beginPath()
      context.ellipse(CENTER + 9, CENTER - 4, 15, 9, -0.5, 0, TAU)
      context.fill()
      context.fillStyle = 'rgba(30,10,6,0.2)'
      context.beginPath()
      context.ellipse(CENTER - 12, CENTER + 10, 17, 7, 0.25, 0, TAU)
      context.fill()
    })
    soften(context, 2.5, () => {
      context.fillStyle = 'rgba(255,255,255,0.5)'
      context.beginPath()
      context.ellipse(CENTER - 5, CENTER - radius + 5, 11, 5, 0, 0, TAU)
      context.fill()
    })
    context.restore()
  })
}

function jupiterTexture() {
  const radius = 50
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.15, 2.8)
    glow(context, CENTER, CENTER, 60, 0.16, 2.4)
    disc(context, CENTER, CENTER, radius, {
      centerOpacity: 1,
      edgeOpacity: 0.6,
      lightOffset: 0.22,
      middleOpacity: 0.95,
    })
    context.save()
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.clip()
    soften(context, 3.5, () => {
      const belts = [
        [-40, 8, 0.26], [-27, 5, 0.14], [-14, 10, 0.32],
        [2, 6, 0.18], [11, 12, 0.34], [28, 6, 0.17], [37, 9, 0.24],
      ]
      for (const [offset, height, alpha] of belts) {
        const band = context.createLinearGradient(0, CENTER + offset, 0, CENTER + offset + height)
        band.addColorStop(0, 'rgba(24,16,10,0)')
        band.addColorStop(0.5, `rgba(24,16,10,${alpha})`)
        band.addColorStop(1, 'rgba(24,16,10,0)')
        context.fillStyle = band
        context.fillRect(CENTER - radius, CENTER + offset, radius * 2, height)
      }
    })
    soften(context, 3, () => {
      context.fillStyle = 'rgba(48,12,6,0.3)'
      context.beginPath()
      context.ellipse(CENTER + 15, CENTER + 16, 11, 6, 0, 0, TAU)
      context.fill()
    })
    soften(context, 7, () => {
      context.fillStyle = 'rgba(20,14,12,0.24)'
      for (const dy of [-radius, radius]) {
        context.beginPath()
        context.ellipse(CENTER, CENTER + dy, radius, 11, 0, 0, TAU)
        context.fill()
      }
    })
    context.restore()
  })
}

function saturnTexture() {
  const radius = 36
  const tilt = -0.3
  const RINGS = [[52, 15, 0.09, 4], [64, 18.5, 0.46, 7], [77, 22.3, 0.24, 5]]

  function ringArc(context, from, to) {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    context.filter = 'blur(1.1px)'
    for (const [rx, ry, alpha, width] of RINGS) {
      context.strokeStyle = `rgba(255,255,255,${alpha})`
      context.lineWidth = width
      context.beginPath()
      context.ellipse(0, 0, rx, ry, 0, from, to)
      context.stroke()
    }
    context.restore()
  }

  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.13, 2.8)
    ringArc(context, Math.PI, TAU)
    disc(context, CENTER, CENTER, radius, {
      centerOpacity: 1,
      edgeOpacity: 0.58,
      lightOffset: 0.26,
      middleOpacity: 0.95,
    })
    context.save()
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.clip()
    soften(context, 4, () => {
      context.fillStyle = 'rgba(26,18,10,0.22)'
      context.fillRect(CENTER - radius, CENTER - 5, radius * 2, 7)
      context.fillStyle = 'rgba(26,18,10,0.16)'
      context.fillRect(CENTER - radius, CENTER + 9, radius * 2, 6)
    })
    soften(context, 2, () => {
      context.save()
      context.translate(CENTER, CENTER)
      context.rotate(tilt)
      context.fillStyle = 'rgba(0,0,0,0.3)'
      context.fillRect(-radius - 4, 1.5, radius * 2 + 8, 3.5)
      context.restore()
    })
    context.restore()
    ringArc(context, 0, Math.PI)
    soften(context, 5, () => {
      context.save()
      context.translate(CENTER, CENTER)
      context.rotate(tilt)
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = 'rgba(0,0,0,0.55)'
      context.beginPath()
      context.ellipse(18, 13, 22, 9, 0.3, 0, TAU)
      context.fill()
      context.restore()
    })
  })
}

function spiralArm(context, turns, inner, outer, offset) {
  context.beginPath()
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const angle = offset + t * turns
    const reach = inner + t * (outer - inner)
    const x = Math.cos(angle) * reach
    const y = Math.sin(angle) * reach
    if (i) context.lineTo(x, y)
    else context.moveTo(x, y)
  }
}

function spiralArms(context, {
  arms = 2, turns = 2.5, inner = 16, outer = 104, seed = 31,
  haze = 0.16, hazeWidth = 30, ridge = 0.15, ridgeWidth = 8,
  knots = 24, knotAlpha = 0.14, knotSize = 3.5, dust = 0.24, spur = null,
} = {}) {
  const random = seededRandom(seed)
  const spacing = TAU / arms
  soften(context, 10, () => {
    context.strokeStyle = `rgba(255,255,255,${haze})`
    context.lineWidth = hazeWidth
    for (let arm = 0; arm < arms; arm++) {
      spiralArm(context, turns, inner, outer, arm * spacing)
      context.stroke()
    }
  })
  soften(context, 3, () => {
    context.strokeStyle = `rgba(255,255,255,${ridge})`
    context.lineWidth = ridgeWidth
    for (let arm = 0; arm < arms; arm++) {
      spiralArm(context, turns, inner + 2, outer - 4, arm * spacing + 0.06)
      context.stroke()
    }
    if (spur) {
      const [spurTurns, spurInner, spurOuter, spurOffset, spurAlpha] = spur
      spiralArm(context, spurTurns, spurInner, spurOuter, spurOffset)
      context.strokeStyle = `rgba(255,255,255,${spurAlpha})`
      context.lineWidth = 6
      context.stroke()
    }
  })
  soften(context, 2, () => {
    for (let i = 0; i < knots; i++) {
      const t = 0.22 + random() * 0.78
      const angle = (i % arms) * spacing + t * turns + (random() - 0.5) * 0.16
      const reach = (inner + t * (outer - inner)) * (1 + (random() - 0.5) * 0.1)
      context.fillStyle = `rgba(255,255,255,${knotAlpha * (0.4 + random() * 0.9)})`
      context.beginPath()
      context.arc(Math.cos(angle) * reach, Math.sin(angle) * reach, 2 + random() * knotSize, 0, TAU)
      context.fill()
    }
  })
  if (dust) {
    soften(context, 4, () => {
      context.globalCompositeOperation = 'destination-out'
      context.strokeStyle = `rgba(0,0,0,${dust})`
      context.lineWidth = 6
      for (let arm = 0; arm < arms; arm++) {
        spiralArm(context, turns * 0.96, inner - 1, outer - 12, arm * spacing - 0.17)
        context.stroke()
      }
    })
  }
}

function galaxyTexture() {
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.42)
    context.scale(1, 0.56)
    glow(context, 0, 0, 118, 0.32, 2.2)
    spiralArms(context, { spur: [1.4, 32, 76, 2.4, 0.08] })
    context.restore()
    glow(context, CENTER, CENTER, 36, 0.42, 2.2)
    glow(context, CENTER, CENTER, 13, 0.72, 2.0)
  })
}

function bodeTexture() {
  const tilt = -0.95
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    context.scale(1, 0.5)
    glow(context, 0, 0, 120, 0.26, 2.2)
    spiralArms(context, {
      turns: 3.7, inner: 30, outer: 112, seed: 81,
      haze: 0.125, hazeWidth: 21, ridge: 0.105, ridgeWidth: 5.5,
      knots: 14, knotAlpha: 0.085, knotSize: 2.2, dust: 0.26,
    })
    context.restore()
    cloud(context, CENTER, CENTER, 58, 33, tilt, 0.24, 2.5)
    cloud(context, CENTER, CENTER, 32, 21, tilt, 0.44, 2.2)
    glow(context, CENTER, CENTER, 12, 0.9, 1.9)
  })
}

function triangulumTexture() {
  const random = seededRandom(33)
  const turns = 2.35
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(0.35)
    context.scale(1, 0.78)
    glow(context, 0, 0, 124, 0.22, 2.0)
    glow(context, 0, 0, 76, 0.17, 2.2)
    spiralArms(context, {
      arms: 3, turns, inner: 18, outer: 104, seed: 33,
      haze: 0.12, hazeWidth: 42, ridge: 0.09, ridgeWidth: 11,
      knots: 22, knotAlpha: 0.085, knotSize: 2.4, dust: 0.05,
    })
    soften(context, 3, () => {
      context.lineWidth = 5.5
      for (const [branchTurns, inner, outer, offset, alpha] of [
        [0.9, 42, 94, 1.05, 0.075],
        [0.75, 50, 98, 3.3, 0.065],
        [0.6, 36, 72, 5.25, 0.055],
      ]) {
        context.strokeStyle = `rgba(255,255,255,${alpha})`
        spiralArm(context, branchTurns, inner, outer, offset)
        context.stroke()
      }
    })
    soften(context, 2, () => {
      for (let i = 0; i < 4; i++) {
        const t = 0.45 + random() * 0.45
        const angle = i * (TAU / 3) + t * turns + (random() - 0.5) * 0.3
        const reach = 18 + t * 86
        const x = Math.cos(angle) * reach
        const y = Math.sin(angle) * reach
        glow(context, x, y, 12 + random() * 5, 0.11 + random() * 0.07, 2.2)
        glow(context, x, y, 4 + random() * 1.8, 0.22 + random() * 0.1, 1.9)
      }
    })
    context.restore()
    cloud(context, CENTER, CENTER, 36, 29, 0.35, 0.22, 2.4)
    cloud(context, CENTER, CENTER, 17, 14, 0.35, 0.3, 2.2)
  })
}

function galaxyEdgeTexture() {
  const tilt = -0.38
  return makeTexture((context) => {
    cloud(context, CENTER, CENTER, 120, 27, tilt, 0.5, 2.0)
    cloud(context, CENTER, CENTER, 74, 30, tilt, 0.26, 2.2)
    cloud(context, CENTER, CENTER, 40, 26, tilt, 0.36, 2.2)
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    context.globalCompositeOperation = 'destination-out'
    const lane = context.createLinearGradient(-114, 0, 114, 0)
    lane.addColorStop(0, 'rgba(0,0,0,0)')
    lane.addColorStop(0.5, 'rgba(0,0,0,0.5)')
    lane.addColorStop(1, 'rgba(0,0,0,0)')
    soften(context, 3.5, () => {
      context.fillStyle = lane
      context.fillRect(-114, 5, 228, 4.5)
      context.fillRect(-70, -9, 140, 3)
    })
    context.restore()
    glow(context, CENTER, CENTER, 24, 0.78, 2.0)
  })
}

function nebulaTexture() {
  const random = seededRandom(61)
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.5)
    cloud(context, -4, -6, 68, 44, -0.3, 0.33)
    cloud(context, 28, 15, 50, 31, 0.55, 0.27)
    cloud(context, -34, 20, 44, 27, 0.95, 0.21)
    cloud(context, -2, -2, 36, 29, 0, 0.42)
    glow(context, -2, -2, 18, 0.53, 2.0)
    soften(context, 6, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = 'rgba(0,0,0,0.5)'
      context.beginPath()
      context.ellipse(19, -19, 27, 12, 0.65, 0, TAU)
      context.fill()
    })
    context.restore()
    for (const [dx, dy, brightness] of [[-3, -2, 1], [4, -5, 0.7], [2, 5, 0.6], [-9, 3, 0.5]]) {
      embeddedStar(context, CENTER + dx, CENTER + dy, brightness)
    }
    for (let i = 0; i < 7; i++) {
      const angle = random() * TAU
      const distance = 26 + random() * 46
      embeddedStar(
        context,
        CENTER + Math.cos(angle) * distance,
        CENTER + Math.sin(angle) * distance * 0.8,
        0.18 + random() * 0.16,
      )
    }
  })
}

function dumbbellTexture() {
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(0.42)
    cloud(context, 0, 0, 74, 54, 0, 0.165)
    cloud(context, -27, 0, 36, 34, 0, 0.295)
    cloud(context, 27, 0, 36, 34, 0, 0.295)
    soften(context, 7, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = 'rgba(0,0,0,0.34)'
      for (const dy of [-1, 1]) {
        context.beginPath()
        context.ellipse(0, dy * 40, 16, 22, 0, 0, TAU)
        context.fill()
      }
    })
    context.restore()
    embeddedStar(context, CENTER, CENTER, 0.4)
  })
}

function ringTexture() {
  const random = seededRandom(88)
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.094, 2.6)
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.25)
    context.scale(1, 0.8)
    const shell = context.createRadialGradient(0, 0, 12, 0, 0, 96)
    shell.addColorStop(0, 'rgba(255,255,255,0.059)')
    shell.addColorStop(0.32, 'rgba(255,255,255,0.106)')
    shell.addColorStop(0.52, 'rgba(255,255,255,0.248)')
    shell.addColorStop(0.66, 'rgba(255,255,255,0.283)')
    shell.addColorStop(0.82, 'rgba(255,255,255,0.118)')
    shell.addColorStop(1, 'rgba(255,255,255,0)')
    soften(context, 7, () => {
      context.fillStyle = shell
      context.fillRect(-98, -98, 196, 196)
    })
    soften(context, 9, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = 'rgba(0,0,0,0.28)'
      for (const dx of [-1, 1]) {
        context.beginPath()
        context.ellipse(dx * 62, 0, 22, 34, 0, 0, TAU)
        context.fill()
      }
    })
    soften(context, 5, () => {
      for (let i = 0; i < 10; i++) {
        const angle = random() * TAU
        const reach = 52 + random() * 16
        context.fillStyle = `rgba(255,255,255,${0.047 + random() * 0.059})`
        context.beginPath()
        context.arc(Math.cos(angle) * reach, Math.sin(angle) * reach, 8 + random() * 7, 0, TAU)
        context.fill()
      }
    })
    context.restore()
    embeddedStar(context, CENTER, CENTER, 0.34)
  })
}

function crabRadius(angle) {
  const c = Math.abs(Math.cos(angle)) / 96
  const s = Math.abs(Math.sin(angle)) / 50
  return THREE.MathUtils.lerp(1 / Math.hypot(c, s), 1 / (c + s), 0.55)
}

function crabPoint(angle, scale) {
  const radius = crabRadius(angle) * scale
  return [Math.cos(angle) * radius, Math.sin(angle) * radius]
}

function remnantTexture() {
  const random = seededRandom(23)
  return makeTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.34)

    soften(context, 10, () => {
      context.fillStyle = 'rgba(255,255,255,0.12)'
      context.beginPath()
      for (let i = 0; i < 20; i++) {
        const [x, y] = crabPoint((i / 20) * TAU, 0.88 + random() * 0.22)
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.fill()
    })

    cloud(context, 6, -3, 56, 36, -0.15, 0.085, 1.9)

    mottle(context, 0, 0, 80, { seed: 31, count: 20, min: 0.16, max: 0.4, alpha: 0.065 })
    mottle(context, 0, 0, 66, { seed: 47, count: 14, min: 0.14, max: 0.34, alpha: 0.05, dark: false })

    soften(context, 7, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = 'rgba(0,0,0,0.3)'
      for (const [x, y, rx, ry, rotation] of [
        [-46, -10, 26, 15, 0.35],
        [26, 15, 29, 16, -0.2],
        [10, -27, 20, 11, 0.7],
        [-18, 25, 18, 10, -0.5],
      ]) {
        context.beginPath()
        context.ellipse(x, y, rx, ry, rotation, 0, TAU)
        context.fill()
      }
    })

    soften(context, 3.5, () => {
      for (let i = 0; i < 12; i++) {
        const from = random() * TAU
        const to = from + Math.PI * (0.5 + random())
        const [x0, y0] = crabPoint(from, 0.6 + random() * 0.32)
        const [x1, y1] = crabPoint(to, 0.6 + random() * 0.32)
        context.beginPath()
        context.moveTo(x0, y0)
        context.quadraticCurveTo(
          (x0 + x1) * 0.5 + (random() - 0.5) * 44,
          (y0 + y1) * 0.5 + (random() - 0.5) * 30,
          x1, y1,
        )
        context.strokeStyle = `rgba(255,255,255,${0.1 + random() * 0.12})`
        context.lineWidth = 1.6 + random() * 1.4
        context.stroke()
      }
    })
    context.restore()
    embeddedStar(context, CENTER + 5, CENTER - 3, 0.3)
  })
}

const CLUSTERS = {
  open: { seed: 19, count: 22, reach: 92, concentration: 0.5, centers: [[0, 0]] },
  pleiades: { seed: 34, count: 17, reach: 82, concentration: 0.55, centers: [[0, 0]] },
  double: { seed: 77, count: 36, reach: 44, concentration: 0.85, centers: [[-36, 3], [34, -3]] },
}

function clusterTexture(kind) {
  const config = CLUSTERS[kind]
  const random = seededRandom(config.seed)
  const stars = []
  for (let i = 0; i < config.count; i++) {
    const center = config.centers[i % config.centers.length]
    const angle = random() * TAU
    const spread = Math.pow(random(), config.concentration)
    stars.push({
      x: CENTER + center[0] + Math.cos(angle) * spread * config.reach,
      y: CENTER + center[1] + Math.sin(angle) * spread * config.reach * 0.86,
      brightness: 0.28 + 0.72 * Math.pow(random(), 2.1),
    })
  }

  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.052, 2.8)

    if (kind === 'pleiades') {
      const brightest = [...stars].sort((a, b) => b.brightness - a.brightness).slice(0, 5)
      soften(context, 8, () => {
        for (const star of brightest) {
          cloud(context, star.x, star.y, 30, 12, -0.7, 0.105)
        }
      })
    }

    for (const star of stars) {
      const rank = (star.brightness - 0.28) / 0.72
      mote(context, star.x, star.y, 2.05 + rank * 4.6, 0.47 + rank * 0.46)
    }
  }, { crisp: true })
}

const HYADES_MEMBERS = [
  [140, 120, 3.4, 1], [53, 69, 3.53, 1], [112, 180, 3.65, 1], [74, 130, 3.77, 1],
  [137, 119, 3.84, 1], [74, 108, 4.3, 1], [137, 139, 4.48, 1], [186, 104, 4.65, 0],
  [178, 53, 4.67, 1], [162, 151, 4.69, 0], [138, 103, 4.78, 1], [81, 124, 4.8, 1],
  [126, 114, 4.96, 1], [214, 163, 5.02, 0], [181, 55, 5.08, 1], [129, 183, 5.26, 1],
  [203, 141, 5.4, 0], [152, 111, 5.47, 1], [154, 204, 5.58, 0], [151, 115, 5.58, 1],
  [96, 139, 5.64, 1], [161, 190, 5.72, 0], [171, 58, 5.78, 1], [168, 140, 5.9, 0],
  [43, 94, 5.97, 0],
]

function hyadesTexture() {
  return makeTexture((context) => {
    glow(context, CENTER, CENTER, 120, 0.026, 2.8)
    for (const [x, y, magnitude, onArm] of HYADES_MEMBERS) {
      const flux = Math.min(1, Math.pow(10, -0.4 * (magnitude - 3.4)))
      const rank = Math.sqrt(flux) * (onArm ? 1 : 0.5)
      mote(context, x, y, 1.9 + rank * 5, 0.34 + rank * 0.62)
    }
  }, { crisp: true })
}

function textureKey(data) {
  if (OBJECT_TEXTURES[data.name]) return OBJECT_TEXTURES[data.name]
  if (data.type === 'cluster') return 'cluster-open'
  return data.type
}

function createTextures(items, { moon } = {}) {
  const factories = {
    star: starTexture,
    sun: sunTexture,
    moon: () => moonTexture(moon),
    planet: planetTexture,
    mars: marsTexture,
    jupiter: jupiterTexture,
    saturn: saturnTexture,
    galaxy: galaxyTexture,
    'galaxy-edge': galaxyEdgeTexture,
    'galaxy-bode': bodeTexture,
    'galaxy-triangulum': triangulumTexture,
    nebula: nebulaTexture,
    dumbbell: dumbbellTexture,
    ring: ringTexture,
    remnant: remnantTexture,
    'cluster-open': () => clusterTexture('open'),
    'cluster-pleiades': () => clusterTexture('pleiades'),
    'cluster-double': () => clusterTexture('double'),
    'cluster-hyades': hyadesTexture,
  }

  const textures = {}
  for (const { data } of items) {
    const key = textureKey(data)
    if (!textures[key]) textures[key] = factories[key]()
  }
  return textures
}

function magnitudeScale(data) {
  if (data.magnitude == null) return 1
  if (data.type === 'star') return THREE.MathUtils.clamp(1.08 - data.magnitude * 0.055, 0.84, 1.2)
  if (data.type === 'planet') return THREE.MathUtils.clamp(1.04 - data.magnitude * 0.035, 0.82, 1.2)
  return 1
}

function markerSize(data, style) {
  if (data.sizeDeg == null) return style.size * magnitudeScale(data)
  const { minAngle, maxAngle, minSize, maxSize } = DEEP_SKY_BAND
  const t = Math.log(data.sizeDeg / minAngle) / Math.log(maxAngle / minAngle)
  const size = THREE.MathUtils.lerp(minSize, maxSize, THREE.MathUtils.clamp(t, 0, 1))
  return size * (FILL_TRIM[data.name] ?? 1)
}

export function createMarkers(items, options = {}) {
  const group = new THREE.Group()
  const interactables = []
  const animations = []
  const markerMaterials = []
  const position = new THREE.Vector3()
  const colorHsl = {}
  const pickGeometry = new THREE.SphereGeometry(PICK_RADIUS, 8, 6)
  const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  const textures = createTextures(items, options)

  for (const { alt, az, color, data } of items) {
    const style = MARKER_STYLES[data.type]
    altAzToScene(alt, az, MARKER_RADIUS, position)

    const tint = new THREE.Color(color ?? OBJECT_TINT[data.name] ?? style.color)
    tint.getHSL(colorHsl)
    tint.setHSL(colorHsl.h, Math.min(1, colorHsl.s * COLOR_SATURATION), colorHsl.l)

    const material = new THREE.SpriteMaterial({
      map: textures[textureKey(data)],
      color: tint,
      transparent: true,
      depthWrite: false,
      blending: style.blending ?? THREE.AdditiveBlending,
      fog: false,
    })
    const marker = new THREE.Sprite(material)
    markerMaterials.push(material)
    marker.position.copy(position)
    const size = markerSize(data, style)
    marker.scale.set(size, size, 1)
    marker.renderOrder = 1

    const pickSphere = new THREE.Mesh(pickGeometry, pickMaterial)
    pickSphere.position.copy(position)

    group.add(marker, pickSphere)
    interactables.push({ meshes: [pickSphere], data })
    const pulse = MARKER_ANIMATIONS[data.type]
    if (pulse) {
      const [slowest, fastest] = pulse.speed
      animations.push({
        material,
        marker,
        baseSize: size,
        pulse,
        speed: slowest + Math.random() * (fastest - slowest),
        phase: Math.random() * TAU,
      })
    }
  }

  let elapsed = 0
  function update(delta) {
    elapsed += delta
    for (const animation of animations) {
      const amount = Math.sin(elapsed * animation.speed + animation.phase)
      animation.material.opacity = 1 - animation.pulse.opacityAmp * (0.5 - 0.5 * amount)
      const scale = animation.baseSize * (1 + animation.pulse.scaleAmp * amount)
      animation.marker.scale.set(scale, scale, 1)
    }
  }

  function dispose() {
    pickGeometry.dispose()
    pickMaterial.dispose()
    for (const texture of Object.values(textures)) texture.dispose()
    for (const material of markerMaterials) material.dispose()
  }

  return { group, interactables, update, dispose }
}

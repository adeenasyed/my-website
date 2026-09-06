import * as THREE from 'three'
import { altAzToScene } from './helpers.js'
import {
  STAR_SHELL_RADIUS,
  COLOR_SATURATION,
  starBrightness,
  starColor,
} from './stars.js'

const TEXTURE_SIZE = 256
const CENTER = TEXTURE_SIZE / 2
const TAU = Math.PI * 2
const MARKER_RADIUS = STAR_SHELL_RADIUS * 0.99
const MIN_PICK_RADIUS = 3000

const TYPE_STYLES = {
  planet: { texture: planetTexture },
  star: { texture: starTexture },
}

const MARKER_STYLES = {
  Sun: { texture: sunTexture, color: '#FFDF8F', size: 9800 },
  Moon: { texture: ({ phase }) => moonTexture(phase), color: '#D9D6CF', size: 9200 },
  Mercury: { color: '#B9B0A4', size: 5050 },
  Venus: { color: '#F5E6B8', size: 7600 },
  Mars: { texture: marsTexture, color: '#E2795B', size: 5950 },
  Jupiter: { texture: jupiterTexture, color: '#E8D3A8', size: 6350 },
  Saturn: { texture: saturnTexture, color: '#E6D59A', size: 6300 },
  Uranus: { color: '#A8E1E8', size: 3900 },
  Neptune: { color: '#6F8DFF', size: 3800 },
  Hyades: { texture: () => clusterTexture(CLUSTERS.hyades), color: '#FFE1B8', size: 12250 },
  Pleiades: { texture: () => clusterTexture(CLUSTERS.pleiades), color: '#C4DEFF', size: 11550 },
  'Beehive Cluster': { texture: () => clusterTexture(CLUSTERS.beehive), color: '#FFF0CF', size: 10600 },
  'Double Cluster': { texture: () => clusterTexture(CLUSTERS.double), color: '#D4E7FF', size: 10750 },
  'Dumbbell Nebula': { texture: dumbbellTexture, color: '#FF9ECB', size: 11100 },
  'Orion Nebula': { texture: orionTexture, color: '#FF9ECB', size: 11600 },
  'Ring Nebula': { texture: ringTexture, color: '#FF9ECB', size: 5650 },
  'Crab Nebula': { texture: crabTexture, color: '#FFB27D', size: 6900 },
  'Andromeda Galaxy': { texture: andromedaTexture, color: '#CBBCFF', size: 12350 },
  'Bode’s Galaxy': { texture: bodesTexture, color: '#F6E7D4', size: 7850 },
  'Triangulum Galaxy': { texture: triangulumTexture, color: '#C4D6FF', size: 7650 },
  'Whirlpool Galaxy': { texture: whirlpoolTexture, color: '#CBBCFF', size: 8100 },
}

const MARKER_ANIMATIONS = {
  star: { opacityAmp: 0.3, scaleAmp: 0.15, speed: [1.0, 2.0] },
  cluster: { opacityAmp: 0, scaleAmp: 0.08, speed: [0.8, 1.35] },
}

function seededRandom(seed) {
  let value = seed
  return () => {
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function createCanvas(draw) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEXTURE_SIZE
  const context = canvas.getContext('2d')
  context.lineCap = 'round'
  draw(context)
  return canvas
}

function createTexture(draw, crisp = false) {
  const texture = new THREE.CanvasTexture(createCanvas(draw))
  texture.colorSpace = THREE.SRGBColorSpace
  if (crisp) {
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
  }
  return texture
}

function particle(context, x, y, radius, alpha) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    const t = THREE.MathUtils.clamp((1 - u) / 0.7, 0, 1)
    gradient.addColorStop(u, `rgba(255,255,255,${alpha * t * t * (3 - 2 * t)})`)
  }
  context.fillStyle = gradient
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function glow(context, x, y, radius, alpha, falloff) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    gradient.addColorStop(t, `rgba(255,255,255,${alpha * Math.pow(1 - t, falloff)})`)
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

function disc(context, x, y, radius, { centerOpacity = 1, edgeOpacity, lightOffset }) {
  const gradient = context.createRadialGradient(
    x - radius * lightOffset, y - radius * lightOffset, radius * 0.04,
    x, y, radius,
  )
  gradient.addColorStop(0, `rgba(255,255,255,${centerOpacity})`)
  gradient.addColorStop(0.72, `rgba(255,255,255,${centerOpacity * 0.9})`)
  gradient.addColorStop(1, `rgba(255,255,255,${edgeOpacity})`)
  context.beginPath()
  context.arc(x, y, radius, 0, TAU)
  context.fillStyle = gradient
  context.fill()
}

function soften(context, radius, draw, color = '#FFFFFF') {
  context.save()
  if ('filter' in context) context.filter = `blur(${radius}px)`
  else {
    context.shadowBlur = radius * 2
    context.shadowColor = color
  }
  draw()
  context.restore()
}

function mottle(context, x, y, radius, alpha, { seed, count, min, max, dark }) {
  const random = seededRandom(seed)
  soften(context, 6, () => {
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
  }, dark ? '#000000' : '#FFFFFF')
}

function clip(context, x, y, radius, draw) {
  context.save()
  context.beginPath()
  context.arc(x, y, radius, 0, TAU)
  context.clip()
  draw()
  context.restore()
}

function sunTexture() {
  const random = seededRandom(9)
  return createTexture((context) => {
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
      edgeOpacity: 0.8,
      lightOffset: 0.05,
    })
    clip(context, CENTER, CENTER, 57, () => {
      mottle(context, CENTER, CENTER, 57, 0.05, { seed: 4, count: 22, min: 0.08, max: 0.2, dark: false })
      mottle(context, CENTER, CENTER, 57, 0.04, { seed: 8, count: 16, min: 0.08, max: 0.2, dark: true })
    })
  })
}

function moonTexture({ illuminated, waxing }) {
  const radius = 66
  const illumination = THREE.MathUtils.clamp(illuminated, 0, 1)
  const direction = waxing ? 1 : -1
  const body = createCanvas((context) => {
    disc(context, CENTER, CENTER, radius, {
      edgeOpacity: 0.88,
      lightOffset: -0.05 * direction,
    })

    clip(context, CENTER, CENTER, radius, () => {
      soften(context, 9, () => {
        context.strokeStyle = '#FFFFFF12'
        context.lineWidth = 5
        for (let i = 0; i < 9; i++) {
          const angle = -Math.PI / 2 + (i - 4) * 0.38
          context.beginPath()
          context.moveTo(CENTER - 8, CENTER + 40)
          context.lineTo(CENTER - 8 + Math.cos(angle) * 98, CENTER + 40 + Math.sin(angle) * 98)
          context.stroke()
        }
      })

      mottle(context, CENTER, CENTER, radius, 0.04, { seed: 5, count: 30, min: 0.14, max: 0.34, dark: false })
      mottle(context, CENTER, CENTER, radius, 0.055, { seed: 12, count: 34, min: 0.14, max: 0.34, dark: true })

      soften(context, 5.5, () => {
        for (const [dx, dy, rx, ry, rotation, weight] of [
          [-26, -33, 27, 23, -0.25, 1.00],
          [-44, 2, 20, 38, 0.18, 0.78],
          [16, -26, 17, 15, 0.10, 0.92],
          [24, -2, 18, 17, -0.20, 1.00],
          [40, 20, 12, 15, 0.00, 0.85],
          [20, 24, 11, 10, 0.00, 0.72],
          [48, -40, 9, 7, -0.30, 0.95],
          [-20, 28, 16, 11, 0.30, 0.62],
          [-38, 32, 10, 9, 0.00, 0.58],
        ]) {
          context.fillStyle = `rgba(16,15,20,${0.1 * weight})`
          for (let pass = 0; pass < 2; pass++) {
            const shrink = 1 - pass * 0.22
            context.beginPath()
            context.ellipse(CENTER + dx, CENTER + dy, rx * shrink, ry * shrink, rotation, 0, TAU)
            context.fill()
          }
        }
      }, '#100F14')

      soften(context, 2.5, () => {
        context.fillStyle = '#FFFFFF47'
        for (const [dx, dy, r] of [[-8, 40, 4], [-17, -14, 3.2], [34, 45, 2.4], [52, 6, 2]]) {
          context.beginPath()
          context.arc(CENTER + dx, CENTER + dy, r, 0, TAU)
          context.fill()
        }
      })
    })

    const phase = 2 * illumination - 1
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
    context.fillStyle = '#FFFFFF'
    context.fill()

    const band = radius * (0.05 + 0.24 * (1 - Math.abs(phase)))
    const apex = CENTER - direction * phase * radius
    context.globalCompositeOperation = 'destination-out'
    const fade = context.createLinearGradient(apex - direction * band * 0.5, 0, apex + direction * band, 0)
    fade.addColorStop(0, '#000000CC')
    fade.addColorStop(1, '#00000000')
    context.fillStyle = fade
    context.beginPath()
    context.arc(CENTER, CENTER, radius, 0, TAU)
    context.fill()
  })

  return createTexture((context) => {
    glow(context, CENTER, CENTER, 124, 0.14 * illumination, 2.6)
    context.drawImage(body, 0, 0)
  })
}

function planetTexture() {
  return createTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.15, 2.8)
    glow(context, CENTER, CENTER, 48, 0.26, 2.4)
    disc(context, CENTER, CENTER, 40, { edgeOpacity: 0.55, lightOffset: 0.3 })
  })
}

function marsTexture() {
  const radius = 40
  return createTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.15, 2.8)
    glow(context, CENTER, CENTER, 48, 0.24, 2.4)
    disc(context, CENTER, CENTER, radius, { edgeOpacity: 0.55, lightOffset: 0.3 })
    clip(context, CENTER, CENTER, radius, () => {
      soften(context, 5, () => {
        context.fillStyle = '#1E0A0657'
        context.beginPath()
        context.ellipse(CENTER + 9, CENTER - 4, 15, 9, -0.5, 0, TAU)
        context.fill()
        context.fillStyle = '#1E0A0633'
        context.beginPath()
        context.ellipse(CENTER - 12, CENTER + 10, 17, 7, 0.25, 0, TAU)
        context.fill()
      }, '#1E0A06')
      soften(context, 2.5, () => {
        context.fillStyle = '#FFFFFF80'
        context.beginPath()
        context.ellipse(CENTER - 5, CENTER - radius + 5, 11, 5, 0, 0, TAU)
        context.fill()
      })
    })
  })
}

function jupiterTexture() {
  const radius = 50
  return createTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.15, 2.8)
    glow(context, CENTER, CENTER, 60, 0.16, 2.4)
    disc(context, CENTER, CENTER, radius, {
      edgeOpacity: 0.6,
      lightOffset: 0.22,
    })
    clip(context, CENTER, CENTER, radius, () => {
      soften(context, 3.5, () => {
        for (const [offset, height, alpha] of [
          [-40, 8, 0.26], [-27, 5, 0.14], [-14, 10, 0.32],
          [2, 6, 0.18], [11, 12, 0.34], [28, 6, 0.17], [37, 9, 0.24],
        ]) {
          const band = context.createLinearGradient(0, CENTER + offset, 0, CENTER + offset + height)
          band.addColorStop(0, '#18100A00')
          band.addColorStop(0.5, `rgba(24,16,10,${alpha})`)
          band.addColorStop(1, '#18100A00')
          context.fillStyle = band
          context.fillRect(CENTER - radius, CENTER + offset, radius * 2, height)
        }
      }, '#18100A')
      soften(context, 3, () => {
        context.fillStyle = '#300C064D'
        context.beginPath()
        context.ellipse(CENTER + 15, CENTER + 16, 11, 6, 0, 0, TAU)
        context.fill()
      }, '#300C06')
      soften(context, 7, () => {
        context.fillStyle = '#140E0C3D'
        for (const dy of [-radius, radius]) {
          context.beginPath()
          context.ellipse(CENTER, CENTER + dy, radius, 11, 0, 0, TAU)
          context.fill()
        }
      }, '#140E0C')
    })
  })
}

function saturnTexture() {
  const radius = 36
  const tilt = -0.3

  function ringArc(context, from, to) {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    soften(context, 1.1, () => {
      for (const [rx, ry, alpha, width] of [[52, 15, 0.09, 4], [64, 18.5, 0.46, 7], [77, 22.3, 0.24, 5]]) {
        context.strokeStyle = `rgba(255,255,255,${alpha})`
        context.lineWidth = width
        context.beginPath()
        context.ellipse(0, 0, rx, ry, 0, from, to)
        context.stroke()
      }
    })
    context.restore()
  }

  return createTexture((context) => {
    glow(context, CENTER, CENTER, 114, 0.13, 2.8)
    ringArc(context, Math.PI, TAU)
    disc(context, CENTER, CENTER, radius, {
      edgeOpacity: 0.58,
      lightOffset: 0.26,
    })
    clip(context, CENTER, CENTER, radius, () => {
      soften(context, 4, () => {
        context.fillStyle = '#1A120A38'
        context.fillRect(CENTER - radius, CENTER - 5, radius * 2, 7)
        context.fillStyle = '#1A120A29'
        context.fillRect(CENTER - radius, CENTER + 9, radius * 2, 6)
      }, '#1A120A')
      soften(context, 2, () => {
        context.save()
        context.translate(CENTER, CENTER)
        context.rotate(tilt)
        context.fillStyle = '#0000004D'
        context.fillRect(-radius - 4, 1.5, radius * 2 + 8, 3.5)
        context.restore()
      }, '#000000')
    })
    ringArc(context, 0, Math.PI)
    soften(context, 5, () => {
      context.save()
      context.translate(CENTER, CENTER)
      context.rotate(tilt)
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = '#0000008C'
      context.beginPath()
      context.ellipse(18, 13, 22, 9, 0.3, 0, TAU)
      context.fill()
      context.restore()
    })
  })
}

function starTexture() {
  function ray(context, length, width, rotation, alpha) {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(rotation)
    soften(context, 1.4, () => {
      const taper = context.createLinearGradient(0, 0, length, 0)
      taper.addColorStop(0, `rgba(255,255,255,${alpha})`)
      taper.addColorStop(0.14, `rgba(255,255,255,${alpha * 0.8})`)
      taper.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.28})`)
      taper.addColorStop(1, '#FFFFFF00')
      context.fillStyle = taper
      context.beginPath()
      context.moveTo(0, -width)
      context.quadraticCurveTo(length * 0.3, -width * 0.28, length, 0)
      context.quadraticCurveTo(length * 0.3, width * 0.28, 0, width)
      context.closePath()
      context.fill()
    })
    context.restore()
  }

  return createTexture((context) => {
    glow(context, CENTER, CENTER, 126, 0.22, 3.0)
    for (const [length, rotation] of [[116, 0], [102, Math.PI / 2], [110, Math.PI], [96, Math.PI * 1.5]]) {
      ray(context, length, 4, rotation, 0.78)
    }
    for (let i = 0; i < 4; i++) ray(context, 30, 2.2, (i / 4) * TAU + Math.PI / 4, 0.22)
    glow(context, CENTER, CENTER, 52, 0.4, 2.8)
    glow(context, CENTER, CENTER, 24, 0.95, 2.0)
    glow(context, CENTER, CENTER, 10, 1, 1.6)
    disc(context, CENTER, CENTER, 6.5, { edgeOpacity: 0.95, lightOffset: 0 })
  })
}

const CLUSTERS = {
  beehive: { seed: 19, count: 22, reach: 92, concentration: 0.5, centers: [[0, 0]] },
  pleiades: { seed: 34, count: 17, reach: 82, concentration: 0.55, centers: [[0, 0]], haze: true },
  double: { seed: 77, count: 36, reach: 44, concentration: 0.85, centers: [[-36, 3], [34, -3]] },
  hyades: { seed: 41, count: 25, reach: 92, concentration: 0.6, centers: [[0, 0]] },
}

function clusterTexture({ seed, count, reach, concentration, centers, haze = false }) {
  const random = seededRandom(seed)
  const stars = []
  for (let i = 0; i < count; i++) {
    const center = centers[i % centers.length]
    const angle = random() * TAU
    const spread = Math.pow(random(), concentration)
    stars.push({
      x: CENTER + center[0] + Math.cos(angle) * spread * reach,
      y: CENTER + center[1] + Math.sin(angle) * spread * reach * 0.86,
      brightness: 0.28 + 0.72 * Math.pow(random(), 2.1),
    })
  }

  return createTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.052, 2.8)

    if (haze) {
      const brightest = [...stars].sort((a, b) => b.brightness - a.brightness).slice(0, 5)
      soften(context, 8, () => {
        for (const star of brightest) {
          cloud(context, star.x, star.y, 30, 12, -0.7, 0.105)
        }
      })
    }

    for (const star of stars) {
      const rank = (star.brightness - 0.28) / 0.72
      particle(context, star.x, star.y, 2.05 + rank * 4.6, 0.47 + rank * 0.46)
    }
  }, true)
}

function embeddedStar(context, x, y, brightness) {
  glow(context, x, y, 13, brightness * 0.34, 2.4)
  disc(context, x, y, 2.6, {
    centerOpacity: brightness,
    edgeOpacity: brightness * 0.7,
    lightOffset: 0,
  })
}

function dumbbellTexture() {
  return createTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(0.42)
    cloud(context, 0, 0, 74, 54, 0, 0.165)
    cloud(context, -27, 0, 36, 34, 0, 0.295)
    cloud(context, 27, 0, 36, 34, 0, 0.295)
    soften(context, 7, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = '#00000057'
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

function orionTexture() {
  const random = seededRandom(61)
  return createTexture((context) => {
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
      context.fillStyle = '#00000080'
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

function ringTexture() {
  const random = seededRandom(88)
  return createTexture((context) => {
    glow(context, CENTER, CENTER, 116, 0.094, 2.6)
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.25)
    context.scale(1, 0.8)
    const shell = context.createRadialGradient(0, 0, 12, 0, 0, 96)
    shell.addColorStop(0, '#FFFFFF0F')
    shell.addColorStop(0.32, '#FFFFFF1B')
    shell.addColorStop(0.52, '#FFFFFF3F')
    shell.addColorStop(0.66, '#FFFFFF48')
    shell.addColorStop(0.82, '#FFFFFF1E')
    shell.addColorStop(1, '#FFFFFF00')
    soften(context, 7, () => {
      context.fillStyle = shell
      context.fillRect(-98, -98, 196, 196)
    })
    soften(context, 9, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = '#00000047'
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

function crabTexture() {
  const random = seededRandom(23)

  function point(angle, scale) {
    const c = Math.abs(Math.cos(angle)) / 96
    const s = Math.abs(Math.sin(angle)) / 50
    const radius = THREE.MathUtils.lerp(1 / Math.hypot(c, s), 1 / (c + s), 0.55) * scale
    return [Math.cos(angle) * radius, Math.sin(angle) * radius]
  }

  return createTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.34)

    soften(context, 10, () => {
      context.fillStyle = '#FFFFFF1F'
      context.beginPath()
      for (let i = 0; i < 20; i++) {
        const [x, y] = point((i / 20) * TAU, 0.88 + random() * 0.22)
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.fill()
    })

    cloud(context, 6, -3, 56, 36, -0.15, 0.085, 1.9)

    mottle(context, 0, 0, 80, 0.065, { seed: 31, count: 20, min: 0.16, max: 0.4, dark: true })
    mottle(context, 0, 0, 66, 0.05, { seed: 47, count: 14, min: 0.14, max: 0.34, dark: false })

    soften(context, 7, () => {
      context.globalCompositeOperation = 'destination-out'
      context.fillStyle = '#0000004D'
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
        const [x0, y0] = point(from, 0.6 + random() * 0.32)
        const [x1, y1] = point(to, 0.6 + random() * 0.32)
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
  }, true)
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
  arms, turns, inner, outer, seed,
  haze, hazeWidth, ridge, ridgeWidth,
  knots, knotAlpha, knotSize, dust, spur = null,
}) {
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

function andromedaTexture() {
  const tilt = -0.38
  return createTexture((context) => {
    cloud(context, CENTER, CENTER, 120, 27, tilt, 0.5, 2.0)
    cloud(context, CENTER, CENTER, 74, 30, tilt, 0.26)
    cloud(context, CENTER, CENTER, 40, 26, tilt, 0.36)
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    context.globalCompositeOperation = 'destination-out'
    const lane = context.createLinearGradient(-114, 0, 114, 0)
    lane.addColorStop(0, '#00000000')
    lane.addColorStop(0.5, '#00000080')
    lane.addColorStop(1, '#00000000')
    soften(context, 3.5, () => {
      context.fillStyle = lane
      context.fillRect(-114, 5, 228, 4.5)
      context.fillRect(-70, -9, 140, 3)
    })
    context.restore()
    glow(context, CENTER, CENTER, 24, 0.78, 2.0)
  }, true)
}

function bodesTexture() {
  const tilt = -0.95
  return createTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(tilt)
    context.scale(1, 0.5)
    glow(context, 0, 0, 120, 0.26, 2.2)
    spiralArms(context, {
      arms: 2, turns: 3.7, inner: 30, outer: 112, seed: 81,
      haze: 0.125, hazeWidth: 21, ridge: 0.105, ridgeWidth: 5.5,
      knots: 14, knotAlpha: 0.085, knotSize: 2.2, dust: 0.26,
    })
    context.restore()
    cloud(context, CENTER, CENTER, 58, 33, tilt, 0.24, 2.5)
    cloud(context, CENTER, CENTER, 32, 21, tilt, 0.44)
    glow(context, CENTER, CENTER, 12, 0.9, 1.9)
  }, true)
}

function triangulumTexture() {
  const random = seededRandom(33)
  const turns = 2.35
  return createTexture((context) => {
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
    cloud(context, CENTER, CENTER, 17, 14, 0.35, 0.3)
  }, true)
}

function whirlpoolTexture() {
  return createTexture((context) => {
    context.save()
    context.translate(CENTER, CENTER)
    context.rotate(-0.42)
    context.scale(1, 0.56)
    glow(context, 0, 0, 118, 0.32, 2.2)
    spiralArms(context, {
      arms: 2, turns: 2.5, inner: 16, outer: 104, seed: 31,
      haze: 0.16, hazeWidth: 30, ridge: 0.15, ridgeWidth: 8,
      knots: 24, knotAlpha: 0.14, knotSize: 3.5, dust: 0.24,
      spur: [1.4, 32, 76, 2.4, 0.08],
    })
    context.restore()
    glow(context, CENTER, CENTER, 36, 0.42, 2.2)
    glow(context, CENTER, CENTER, 13, 0.72, 2.0)
  }, true)
}

function resolveStyle(data) {
  const style = { ...TYPE_STYLES[data.type], ...MARKER_STYLES[data.name] }

  if (data.type === 'star') {
    const dimness = THREE.MathUtils.smoothstep(data.magnitude, -2, 8)
    style.size = 6000 * THREE.MathUtils.lerp(1.15, 0.85, dimness)
  }

  if (style.color) {
    const hsl = {}
    style.color = new THREE.Color(style.color)
    style.color.getHSL(hsl)
    style.color.setHSL(hsl.h, Math.min(1, hsl.s * COLOR_SATURATION), hsl.l)
  } else {
    const brightness = starBrightness(data.magnitude)
    const [r, g, b] = starColor(data.colorIndex)
    style.color = new THREE.Color().setRGB(r * brightness, g * brightness, b * brightness)
  }

  const isBody = ['sun', 'moon', 'planet'].includes(data.type)
  const blending = isBody ? THREE.NormalBlending : THREE.AdditiveBlending

  return { ...style, blending }
}

export function createMarkers(items) {
  const group = new THREE.Group()
  const interactables = []
  const animations = []
  const markerMaterials = []
  const position = new THREE.Vector3()
  const pickGeometry = new THREE.SphereGeometry(1, 8, 6)
  const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  const textures = new Map()
  const random = seededRandom(42)

  for (const { alt, az, data } of items) {
    const style = resolveStyle(data)

    altAzToScene(alt, az, MARKER_RADIUS, position)

    const pickSphere = new THREE.Mesh(pickGeometry, pickMaterial)
    pickSphere.position.copy(position)
    pickSphere.scale.setScalar(Math.max(MIN_PICK_RADIUS, style.size * 0.42))

    let texture = textures.get(style.texture)
    if (!texture) {
      texture = style.texture(data)
      textures.set(style.texture, texture)
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: style.color,
      transparent: true,
      depthWrite: false,
      blending: style.blending,
      fog: false,
    })
    const marker = new THREE.Sprite(material)
    markerMaterials.push(material)
    marker.position.copy(position)
    marker.scale.set(style.size, style.size, 1)
    marker.renderOrder = 1

    group.add(marker, pickSphere)
    interactables.push({ meshes: [pickSphere], data })
    const animation = MARKER_ANIMATIONS[data.type]
    if (animation) {
      const [slowest, fastest] = animation.speed
      animations.push({
        marker,
        baseSize: style.size,
        opacityAmp: animation.opacityAmp,
        scaleAmp: animation.scaleAmp,
        speed: slowest + random() * (fastest - slowest),
        phase: random() * TAU,
      })
    }
  }

  let elapsed = 0
  function update(delta) {
    elapsed += delta
    for (const animation of animations) {
      const amount = Math.sin(elapsed * animation.speed + animation.phase)
      animation.marker.material.opacity = 1 - animation.opacityAmp * (0.5 - 0.5 * amount)
      const scale = animation.baseSize * (1 + animation.scaleAmp * amount)
      animation.marker.scale.set(scale, scale, 1)
    }
  }

  function dispose() {
    pickGeometry.dispose()
    pickMaterial.dispose()
    for (const texture of textures.values()) texture.dispose()
    for (const material of markerMaterials) material.dispose()
  }

  return { group, interactables, update, dispose }
}

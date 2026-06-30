import * as THREE from 'three'
import { INTRO_CAMERA_POSITION, DEFAULT_CAMERA_LOOK_AT, CAMERA_FOV } from './constants.js'
import { WHITE } from '@/theme.js'

const BG_COLOR = new THREE.Color('#050309')

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = BG_COLOR
  scene.fog = new THREE.Fog(BG_COLOR, 500, 90000)

  const stars = createStars()
  scene.add(stars)

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 1, 140000)
  camera.position.set(...INTRO_CAMERA_POSITION)
  camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5

  document.body.appendChild(renderer.domElement)
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

  const canvas = renderer.domElement
  function onResize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  onResize()

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(canvas)

  function dispose() {
    resizeObserver.disconnect()
    renderer.domElement.remove()
    renderer.dispose()
  }

  let animationId
  let loopCancelled = false

  function landingLoop() {
    if (loopCancelled) return
    animationId = requestAnimationFrame(landingLoop)
    renderer.render(scene, camera)
  }
  landingLoop()

  function cancelLandingLoop() {
    loopCancelled = true
    cancelAnimationFrame(animationId)
  }

  return { scene, camera, renderer, stars, cancelLandingLoop, dispose }
}

function createStars() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 16
  const context = canvas.getContext('2d')
  context.beginPath()
  context.arc(8, 8, 6, 0, Math.PI * 2)
  context.fillStyle = WHITE
  context.fill()
  const sprite = new THREE.CanvasTexture(canvas)

  const materialOptions = {
    sizeAttenuation: false,
    map: sprite,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.1,
    depthWrite: false,
    fog: false,
  }

  const BG_TOTAL = 20000
  const BG_OUTER = 135000
  const BG_INNER = 500
  const bgSmall = buildStarClusters(Math.floor(BG_TOTAL * 0.85), 2, BG_OUTER, BG_INNER, materialOptions)
  const bgLarge = buildStarClusters(Math.floor(BG_TOTAL * 0.15), 4, BG_OUTER, BG_INNER, materialOptions)

  const group = new THREE.Group()
  group.add(bgSmall, bgLarge)

  return group
}

function buildStarClusters(count, size, outerR, innerR, materialOptions) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let x, y, z, r
    do {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      r = outerR * Math.cbrt(Math.random())
      x = r * Math.sin(phi) * Math.cos(theta)
      y = r * Math.sin(phi) * Math.sin(theta)
      z = r * Math.cos(phi)
    } while (r < innerR)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    const b = 0.4 + Math.random() * 0.6
    colors[i * 3] = b
    colors[i * 3 + 1] = b
    colors[i * 3 + 2] = b
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size, ...materialOptions }))
}

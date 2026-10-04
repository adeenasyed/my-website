import * as THREE from 'three'
import {
  INTRO_CAMERA_POSITION,
  DEFAULT_CAMERA_LOOK_AT,
  CAMERA_FOV,
} from './constants.js'
import {
  TORONTO_LATITUDE,
  TORONTO_LONGITUDE,
  TORONTO_HEIGHT,
} from './sky/constants.js'
import { createCelestialSphere } from './sky/index.js'

const BG_COLOR = new THREE.Color('#050309')
const DEFAULT_PIXEL_RATIO_CAP = 1.5
const COMPACT_PIXEL_RATIO_CAP = 2

function getPixelRatio() {
  const cap = window.innerWidth <= 768
    ? COMPACT_PIXEL_RATIO_CAP
    : DEFAULT_PIXEL_RATIO_CAP
  return Math.min(window.devicePixelRatio, cap)
}

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = BG_COLOR
  scene.fog = new THREE.Fog(BG_COLOR, 500, 90000)

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 1, 260000)
  camera.position.set(...INTRO_CAMERA_POSITION)
  camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(getPixelRatio())
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5

  const sky = createCelestialSphere({
    date: new Date(),
    latitude: TORONTO_LATITUDE,
    longitude: TORONTO_LONGITUDE,
    height: TORONTO_HEIGHT,
    pixelRatio: renderer.getPixelRatio(),
    aspect: camera.aspect,
  })
  scene.add(sky.group)

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

  let update = null
  let lastTime = 0
  let lastRender = 0
  let animationFrameId = null

  function animate(time = 0) {
    animationFrameId = requestAnimationFrame(animate)

    if (time - lastRender < 1000 / 75) return
    lastRender = time

    const delta = Math.min((time - lastTime) / 1000, 0.1)
    lastTime = time

    sky.update(delta)
    update?.(delta)
    renderer.render(scene, camera)
  }
  animate()

  function setUpdate(nextUpdate) {
    update = nextUpdate
  }

  function dispose() {
    cancelAnimationFrame(animationFrameId)
    resizeObserver.disconnect()
    sky.dispose()
    renderer.domElement.remove()
    renderer.dispose()
  }

  return { scene, camera, renderer, sky, setUpdate, dispose }
}

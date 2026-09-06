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

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = BG_COLOR
  scene.fog = new THREE.Fog(BG_COLOR, 500, 90000)

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 1, 260000)
  camera.position.set(...INTRO_CAMERA_POSITION)
  camera.lookAt(...DEFAULT_CAMERA_LOOK_AT)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
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

  function dispose() {
    resizeObserver.disconnect()
    sky.dispose()
    renderer.domElement.remove()
    renderer.dispose()
  }

  return { scene, camera, renderer, sky, onResize, cancelLandingLoop, dispose }
}

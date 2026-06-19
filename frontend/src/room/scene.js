import * as THREE from 'three'

export function createScene() {
  const scene = new THREE.Scene()
  const background = createBackground()
  fitBackground(background)
  scene.background = background

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000)
  camera.position.set(-481, 476, 832)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    fitBackground(background)
  }
  window.addEventListener('resize', onResize)

  return { scene, camera, renderer, disposeScene: () => window.removeEventListener('resize', onResize) }
}

const BACKGROUND_WIDTH = 2048
const BACKGROUND_HEIGHT = 1024

function createBackground() {
  const canvas = document.createElement('canvas')
  canvas.width = BACKGROUND_WIDTH
  canvas.height = BACKGROUND_HEIGHT
  const context = canvas.getContext('2d')
  context.fillStyle = '#050309'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const range = (n) => Math.random() * n
  for (let i = 0; i < 1200; i++) {
    const x = range(canvas.width)
    const y = range(canvas.height)
    const r = Math.random() < 0.85 ? range(1.2) : range(2.2)
    const opacity = 0.4 + Math.random() * 0.6
    context.beginPath()
    context.arc(x, y, r, 0, Math.PI * 2)
    context.fillStyle = `rgba(255, 255, 255, ${opacity})`
    context.fill()
  }

  return new THREE.CanvasTexture(canvas)
}

function fitBackground(texture) {
  const viewportRatio = window.innerWidth / window.innerHeight
  const textureRatio = BACKGROUND_WIDTH / BACKGROUND_HEIGHT
  if (viewportRatio > textureRatio) {
    const scale = textureRatio / viewportRatio
    texture.repeat.set(1, scale)
    texture.offset.set(0, (1 - scale) / 2)
  } else {
    const scale = viewportRatio / textureRatio
    texture.repeat.set(scale, 1)
    texture.offset.set((1 - scale) / 2, 0)
  }
}

import * as THREE from 'three'
import { loadObject } from '../helpers.js'
import { WHITE } from '@/theme.js'

const NOODLES_X = -75
const NOODLES_Z = 100

export async function loadNoodles(tableMaxY) {
  const object = await loadObject('/objects/noodles.glb', {
    size: 55,
    position: (box) => ({
      x: NOODLES_X,
      y: tableMaxY - box.min.y,
      z: NOODLES_Z,
    }),
  })

  const box = new THREE.Box3().setFromObject(object)
  const steam = createSteam()
  steam.position.set(
    NOODLES_X,
    object.position.y + box.max.y - box.min.y - 25,
    NOODLES_Z,
  )

  const noodles = new THREE.Group()
  noodles.add(object, steam)
  noodles.update = (delta) => updateSteam(steam, delta)

  return noodles
}

const PARTICLE_COUNT = 25
const SPREAD = 6
const RISE_SPEED = 10
const DRIFT_SPEED = 3
const MAX_HEIGHT = 55

function createSteam() {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const speeds = new Float32Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    respawnParticle(positions, speeds, i, true)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, `${WHITE}26`)
  gradient.addColorStop(0.3, `${WHITE}14`)
  gradient.addColorStop(1, `${WHITE}00`)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  const sprite = new THREE.CanvasTexture(canvas)

  const material = new THREE.PointsMaterial({
    size: 60,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: WHITE,
    opacity: 0.1,
  })

  const points = new THREE.Points(geometry, material)
  points.userData = { positions, speeds }

  return points
}

function updateSteam(steam, delta) {
  const { positions, speeds } = steam.userData
  const t = performance.now() / 1000

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 1] += speeds[i] * delta

    const sway = Math.sin(t * 0.8 + speeds[i]) * DRIFT_SPEED * delta
    positions[i * 3] += sway
    positions[i * 3 + 2] += Math.cos(t * 0.6 + speeds[i]) * DRIFT_SPEED * delta

    if (positions[i * 3 + 1] >= MAX_HEIGHT) {
      respawnParticle(positions, speeds, i)
    }
  }

  steam.geometry.attributes.position.needsUpdate = true
}

function respawnParticle(positions, speeds, i, randomHeight = false) {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * SPREAD
  positions[i * 3] = Math.cos(angle) * radius
  positions[i * 3 + 1] = randomHeight ? Math.random() * MAX_HEIGHT : 0
  positions[i * 3 + 2] = Math.sin(angle) * radius
  speeds[i] = RISE_SPEED * (0.7 + Math.random() * 0.6)
}

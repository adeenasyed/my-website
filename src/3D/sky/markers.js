import * as THREE from 'three'
import { STAR_RADIUS, altAzToScene } from './catalog.js'

const MARKER_RADIUS = STAR_RADIUS * 0.99
const PICK_RADIUS = 2600

const STYLE = {
  sun: { color: '#ffdf8f', size: 7000, amp: 0.05 },
  star: { color: '#fff4e8', size: 3400, amp: 0.42 },
  planet: { color: '#ffffff', size: 4200, amp: 0.14 },
  moon: { color: '#e9e6df', size: 6000, amp: 0.08 },
  galaxy: { color: '#cbbcff', size: 5200, amp: 0.16 },
  nebula: { color: '#ff9ecb', size: 5000, amp: 0.18 },
  cluster: { color: '#c3e2ff', size: 4600, amp: 0.2 },
}

function createGlowTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

export function createMarkers(items) {
  const group = new THREE.Group()
  const interactables = []
  const twinklers = []
  const pos = new THREE.Vector3()
  const pickGeometry = new THREE.SphereGeometry(PICK_RADIUS, 8, 6)
  const glowTexture = createGlowTexture()

  for (const { alt, az, color, data } of items) {
    const style = STYLE[data.type]
    altAzToScene(alt, az, MARKER_RADIUS, pos)

    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(color ?? style.color),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
    const marker = new THREE.Sprite(material)
    marker.position.copy(pos)
    marker.scale.setScalar(style.size)
    marker.renderOrder = 1

    const pickSphere = new THREE.Mesh(
      pickGeometry,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    )
    pickSphere.position.copy(pos)

    group.add(marker, pickSphere)
    interactables.push({ meshes: [pickSphere], data })
    twinklers.push({
      material,
      marker,
      baseSize: style.size,
      amp: style.amp,
      speed: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
    })
  }

  let t = 0
  function update(delta) {
    t += delta
    for (const tw of twinklers) {
      const s = Math.sin(t * tw.speed + tw.phase)
      tw.material.opacity = 1 - tw.amp * (0.5 - 0.5 * s)
      tw.marker.scale.setScalar(tw.baseSize * (1 + tw.amp * 0.3 * s))
    }
  }

  function dispose() {
    pickGeometry.dispose()
    glowTexture.dispose()
    for (const tw of twinklers) tw.material.dispose()
    for (const it of interactables) it.meshes[0].material.dispose()
  }

  return { group, interactables, update, dispose }
}

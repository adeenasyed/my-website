import * as THREE from 'three'

const LERP_SPEED = 0.12
const HOVER_COLOR = '#777777'

export function createInteractionManager(camera, renderer) {
  const registry = []
  const mouse = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  
  let currentHovered = null
  let enabled = true

  function add(meshes, hoverColor = HOVER_COLOR, onClick) {
    const hoverEmissive = new THREE.Color(hoverColor)
    const originalEmissives = meshes.map((m) => m.material?.emissive?.clone() ?? new THREE.Color(0))
    registry.push({ meshes, hoverEmissive, originalEmissives, onClick, hovered: false })
  }

  function update() {
    for (const entry of registry) {
      entry.meshes.forEach((m, i) => {
        if (m.material?.emissive) {
          m.material.emissive.lerp(entry.hovered ? entry.hoverEmissive : entry.originalEmissives[i], LERP_SPEED)
        }
      })
    }
  }

  function setEnabled(val) {
    if (!val && currentHovered) {
      currentHovered.hovered = false
      currentHovered = null
      renderer.domElement.style.cursor = 'default'
    }
    enabled = val
  }

  function setMouseFromEvent(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
  }

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (!enabled) return
    setMouseFromEvent(e)

    let hit = null
    for (const entry of registry) {
      if (raycaster.intersectObjects(entry.meshes).length > 0) {
        hit = entry
        break
      }
    }

    if (hit !== currentHovered) {
      if (currentHovered) currentHovered.hovered = false
      if (hit) hit.hovered = true
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default'
      currentHovered = hit
    }
  })

  renderer.domElement.addEventListener('click', (e) => {
    if (!enabled) return
    setMouseFromEvent(e)

    for (const entry of registry) {
      if (raycaster.intersectObjects(entry.meshes).length > 0) {
        entry.hovered = false
        if (currentHovered === entry) {
          currentHovered = null
          renderer.domElement.style.cursor = 'default'
        }
        entry.onClick?.()
        break
      }
    }
  })

  return { add, update, setEnabled }
}

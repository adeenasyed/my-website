import * as THREE from 'three'

const LERP_SPEED = 0.12
const HOVER_COLOR = '#777777'

export function createInteractionManager(camera, renderer) {
  const interactables = []
  const allMeshes = []
  const meshToInteractable = new Map()
  const mouse = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()

  let currentHovered = null
  let enabled = false
  let fading = false

  function add(meshes, hoverColor = HOVER_COLOR, onClick) {
    const hoverEmissive = new THREE.Color(hoverColor)
    const originalEmissives = meshes.map((m) => m.material?.emissive?.clone() ?? new THREE.Color(0))
    const obj = { meshes, hoverEmissive, originalEmissives, onClick, hovered: false }
    interactables.push(obj)
    for (const m of meshes) {
      meshToInteractable.set(m, obj)
      allMeshes.push(m)
    }
  }

  function addBlockers(root) {
    root.traverse((child) => {
      if (child.isMesh && !meshToInteractable.has(child)) allMeshes.push(child)
    })
  }

  function update() {
    if (!fading) return
    let allArrived = true
    for (const obj of interactables) {
      for (const [i, m] of obj.meshes.entries()) {
        const emissive = m.material?.emissive
        if (!emissive) continue
        const target = obj.hovered ? obj.hoverEmissive : obj.originalEmissives[i]
        emissive.lerp(target, LERP_SPEED)
        if (Math.abs(emissive.r - target.r) + Math.abs(emissive.g - target.g) + Math.abs(emissive.b - target.b) > 0.004) {
          allArrived = false
        } else {
          emissive.copy(target)
        }
      }
    }
    if (allArrived) fading = false
  }

  function setEnabled(val) {
    if (!val && currentHovered) {
      currentHovered.hovered = false
      currentHovered = null
      fading = true
      renderer.domElement.style.cursor = 'default'
    }
    enabled = val
  }

  function setMouseFromEvent(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
  }

  function pick() {
    const hits = raycaster.intersectObjects(allMeshes, true)
    if (!hits.length) return null
    let mesh = hits[0].object
    while (mesh) {
      const interactable = meshToInteractable.get(mesh)
      if (interactable) return interactable
      mesh = mesh.parent
    }
    return null
  }

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (!enabled) return
    setMouseFromEvent(e)

    const hit = pick()
    if (hit !== currentHovered) {
      if (currentHovered) currentHovered.hovered = false
      if (hit) hit.hovered = true
      fading = true
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default'
      currentHovered = hit
    }
  })

  renderer.domElement.addEventListener('click', (e) => {
    if (!enabled) return
    setMouseFromEvent(e)

    const hit = pick()
    if (!hit) return
    hit.hovered = false
    fading = true
    if (currentHovered === hit) {
      currentHovered = null
      renderer.domElement.style.cursor = 'default'
    }
    hit.onClick()
  })

  return { add, addBlockers, update, setEnabled }
}

import * as THREE from 'three'
import { loadGLTF, getMeshes } from './helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../constants.js'
import { FONT_FAMILY, BLACK, WHITE, GRAY } from '../../theme.js'

export async function loadTV(couchCenterZ, maxAnisotropy) {
  const object = await loadGLTF('/objects/tv.glb')

  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const scale = 285 / Math.max(size.x, size.y, size.z)
  object.scale.setScalar(scale)

  object.rotation.y = -Math.PI / 2

  const centerX = (box.min.x + box.max.x) / 2
  const centerY = (box.min.y + box.max.y) / 2
  object.position.set(
    ROOM_WIDTH / 2 + box.min.z * scale,
    ROOM_HEIGHT / 2 - centerY * scale + 50,
    couchCenterZ - centerX * scale
  )

  const worldBox = new THREE.Box3().setFromObject(object)
  const screen = buildScreen(worldBox, 1.1 * scale, 0.63 * scale, maxAnisotropy)

  object.meshes = getMeshes(object, [screen.mesh])

  screen.zoomOffset = new THREE.Vector3(-310, 0, 0)

  const light = new THREE.PointLight(0xffeecc, 75000)
  light.position.set(
    worldBox.min.x - 20,
    (worldBox.min.y + worldBox.max.y) / 2,
    (worldBox.min.z + worldBox.max.z) / 2,
  )

  async function pollSpotify() {
    try {
      const res = await fetch('http://localhost:8888/now-playing')
      const data = await res.json()
      screen.updateListeningActivity(data)
    } catch {}
  }

  pollSpotify()
  setInterval(pollSpotify, 30000)

  return { object, screen, light }
}

const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = Math.round((CANVAS_WIDTH * 0.63) / 1.1)

const ALBUM_SIZE = CANVAS_HEIGHT - 56
const ALBUM_X = 28
const TEXT_X = ALBUM_X + ALBUM_SIZE + 32
const TEXT_WIDTH = CANVAS_WIDTH - TEXT_X - 24
const ARTIST_Y = CANVAS_HEIGHT - 64

const SCROLL_SPEED = 40
const SCROLL_PAUSE = 2000

const ALBUM_OF_MONTH_SIZE = 340
const ALBUM_OF_MONTH_X = (CANVAS_WIDTH - ALBUM_OF_MONTH_SIZE) / 2
const ALBUM_OF_MONTH_Y = 104

const H1_FONT = `bold 48px ${FONT_FAMILY}`
const H2_FONT = `bold 36px ${FONT_FAMILY}`
const H3_FONT = `bold 24px ${FONT_FAMILY}`
const BODY_FONT = `24px ${FONT_FAMILY}`
const SCROLL_FONT = `30px ${FONT_FAMILY}`

const SPOTIFY_GREEN = '#1DB954'

function wrapText(context, text) {
  const words = text.split(' ')
  let line = ''
  let lineCount = 1
  let y = 95
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (context.measureText(test).width > TEXT_WIDTH && line) {
      if (lineCount >= 5) {
        let truncated = line
        while (truncated.length > 0 && context.measureText(truncated + '…').width > TEXT_WIDTH) {
          truncated = truncated.slice(0, -1)
        }
        context.fillText(truncated + '…', TEXT_X, y)
        return
      }
      context.fillText(line, TEXT_X, y)
      line = word
      y += 48
      lineCount++
    } else {
      line = test
    }
  }
  context.fillText(line, TEXT_X, y)
}

function buildScreen(worldBox, screenWidth, screenHeight, maxAnisotropy) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  const material = new THREE.MeshBasicMaterial({ map: texture })
  material.toneMapped = false
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), material)

  mesh.rotation.y = -Math.PI / 2
  mesh.position.set(
    worldBox.min.x - 0.5, 
    (worldBox.min.y + worldBox.max.y) / 2, 
    (worldBox.min.z + worldBox.max.z) / 2
  )

  let mode = 0
  let listeningActivity = null
  let albumImg = null
  let albumOfMonth = null
  let albumOfMonthImg = null
  let scrollState = null
  let lastTime = null
  let rafId = null

  function clearCanvas() {
    context.fillStyle = BLACK
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  function drawListeningActivityScreen() {
    if (!listeningActivity) return
    const { track, artist, playing } = listeningActivity

    clearCanvas()

    if (albumImg) context.drawImage(albumImg, ALBUM_X, ALBUM_X, ALBUM_SIZE, ALBUM_SIZE)

    context.textBaseline = 'top'
    context.textAlign = 'left'

    context.fillStyle = playing ? SPOTIFY_GREEN : '#888'
    context.font = H3_FONT
    context.fillText(playing ? 'NOW PLAYING' : 'LAST PLAYED', TEXT_X, 36)

    context.fillStyle = WHITE
    context.font = H1_FONT
    wrapText(context, track)

    context.save()
    context.beginPath()
    context.rect(TEXT_X, ARTIST_Y - 4, TEXT_WIDTH, 44)
    context.clip()
    context.fillStyle = GRAY
    context.font = SCROLL_FONT
    context.fillText(artist, TEXT_X - (scrollState?.offset ?? 0), ARTIST_Y)
    context.restore()

    texture.needsUpdate = true
  }

  function animateScroll(timestamp) {
    if (!scrollState) return
    if (lastTime === null) lastTime = timestamp
    const delta = (timestamp - lastTime) / 1000
    lastTime = timestamp

    const now = performance.now()
    if (now >= scrollState.pauseUntil) {
      scrollState.offset += SCROLL_SPEED * delta * scrollState.direction
      if (scrollState.offset >= scrollState.overflowWidth) {
        scrollState.offset = scrollState.overflowWidth
        scrollState.direction = -1
        scrollState.pauseUntil = now + SCROLL_PAUSE
      } else if (scrollState.offset <= 0) {
        scrollState.offset = 0
        scrollState.direction = 1
        scrollState.pauseUntil = now + SCROLL_PAUSE
      }
    }

    drawListeningActivityScreen()
    rafId = requestAnimationFrame(animateScroll)
  }

  function stopScroll() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    lastTime = null
    scrollState = null
  }

  function showListeningActivityScreen() {
    stopScroll()
    context.font = SCROLL_FONT
    const overflow = context.measureText(listeningActivity.artist).width - TEXT_WIDTH
    if (overflow > 0) {
      scrollState = {
        offset: 0,
        overflowWidth: overflow,
        direction: 1,
        pauseUntil: performance.now() + SCROLL_PAUSE,
      }
      rafId = requestAnimationFrame(animateScroll)
    } else {
      drawListeningActivityScreen()
    }
  }

  const updateListeningActivity = async (data) => {
    if (!data?.track) return

    const trackChanged = !listeningActivity || 
      listeningActivity.track !== data.track || 
      listeningActivity.artist !== data.artist
    if (!trackChanged) return

    listeningActivity = data

    if (data.albumArt) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve) => {
        img.onload = img.onerror = resolve
        img.src = data.albumArt
      })
      albumImg = img
    } else {
      albumImg = null
    }

    if (mode !== 0) return
    showListeningActivityScreen()
  }

  function drawAlbumOfMonthScreen() {
    clearCanvas()
    context.textBaseline = 'top'
    context.textAlign = 'center'
    context.fillStyle = SPOTIFY_GREEN
    context.font = H1_FONT
    context.fillText('ALBUM OF THE MONTH', CANVAS_WIDTH / 2, 32)
    if (albumOfMonth) {
      if (albumOfMonthImg) {
        context.drawImage(
          albumOfMonthImg,
          ALBUM_OF_MONTH_X, 
          ALBUM_OF_MONTH_Y, 
          ALBUM_OF_MONTH_SIZE, 
          ALBUM_OF_MONTH_SIZE,
        )
      }
      context.fillStyle = WHITE
      context.font = H2_FONT
      context.fillText(
        albumOfMonth.name, 
        CANVAS_WIDTH / 2, 
        ALBUM_OF_MONTH_Y + ALBUM_OF_MONTH_SIZE + 25,
      )
      context.fillStyle = GRAY
      context.font = BODY_FONT
      context.fillText(
        albumOfMonth.artist, 
        CANVAS_WIDTH / 2, 
        ALBUM_OF_MONTH_Y + ALBUM_OF_MONTH_SIZE + 70
      )
    }
    texture.needsUpdate = true
  }

  async function fetchAlbumOfMonth() {
    if (albumOfMonth) return
    const res = await fetch('http://localhost:8888/music-stats')
    const data = await res.json()
    const album = data.albumOfTheMonth
    if (album) {
      albumOfMonth = { name: album.name, artist: album.artist }
      if (album.image) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve) => {
          img.onload = img.onerror = resolve
          img.src = album.image
        })
        albumOfMonthImg = img
      }
    }
  }

  function setMode(newMode) {
    mode = newMode
    stopScroll()
    if (mode === 1) {
      fetchAlbumOfMonth()
        .then(drawAlbumOfMonthScreen)
        .catch(() => {})
    } else if (mode === 0) {
      if (listeningActivity) showListeningActivityScreen()
    }
  }

  return { mesh, updateListeningActivity, setMode }
}

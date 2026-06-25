import * as THREE from 'three'
import { loadObject, getMeshes, loadImage } from '../helpers.js'
import { ROOM_WIDTH, ROOM_HEIGHT } from '../../constants.js'
import { FONT_FAMILY, BLACK, WHITE, GRAY, LIGHTING_COLOR } from '@/theme.js'
import { createSpotifyConnection } from '@/data/spotify.js'

export async function loadTV(couchCenterZ, maxAnisotropy) {
  const object = await loadObject('/objects/tv.glb', {
    size: 285,
    rotation: { y: -Math.PI / 2 },
    position: (box) => ({
      x: ROOM_WIDTH / 2 - box.max.x,
      y: ROOM_HEIGHT / 2 - (box.min.y + box.max.y) / 2 + 50,
      z: couchCenterZ - (box.min.z + box.max.z) / 2,
    }),
  })

  const worldBox = new THREE.Box3().setFromObject(object)

  const { screen, setMode, dispose } = buildScreen(worldBox, maxAnisotropy)

  const light = new THREE.PointLight(LIGHTING_COLOR, 75000)
  light.position.set(
    worldBox.min.x - 20,
    (worldBox.min.y + worldBox.max.y) / 2,
    (worldBox.min.z + worldBox.max.z) / 2,
  )

  const tv = new THREE.Group()
  tv.add(object, screen, light)
  tv.meshes = getMeshes(object, [screen])
  tv.zoom = { target: screen, offset: new THREE.Vector3(-310, 0, 0) }
  tv.setMode = setMode
  tv.dispose = dispose

  return tv
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
  let y = 90
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (context.measureText(test).width > TEXT_WIDTH && line) {
      if (lineCount >= 5) {
        let truncated = line
        while (truncated.length > 0 && context.measureText(`${truncated}…`).width > TEXT_WIDTH) {
          truncated = truncated.slice(0, -1)
        }
        context.fillText(`${truncated}…`, TEXT_X, y)
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

function buildScreen(worldBox, maxAnisotropy) {
  const worldSize = worldBox.getSize(new THREE.Vector3())

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const context = canvas.getContext('2d')

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  const material = new THREE.MeshBasicMaterial({ map: texture })
  material.toneMapped = false

  const screenWidth = worldSize.z * 0.97
  const screenHeight = screenWidth * (CANVAS_HEIGHT / CANVAS_WIDTH)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), material)
  screen.rotation.y = -Math.PI / 2
  screen.position.set(
    worldBox.min.x - 0.5,
    (worldBox.min.y + worldBox.max.y) / 2,
    (worldBox.min.z + worldBox.max.z) / 2,
  )

  let mode = 0
  let listeningActivity = null
  let albumOfMonth = null
  let scrollState = null
  let lastTime = null
  let rafId = null

  function clearCanvas() {
    context.fillStyle = BLACK
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    texture.needsUpdate = true
  }

  function drawListeningActivity() {
    if (!listeningActivity) return

    const { albumImage, playing, track, artist } = listeningActivity
    clearCanvas()

    if (albumImage) context.drawImage(albumImage, ALBUM_X, ALBUM_X, ALBUM_SIZE, ALBUM_SIZE)

    context.textBaseline = 'top'
    context.textAlign = 'left'
    context.fillStyle = playing ? SPOTIFY_GREEN : '#888888'
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
    context.fillText(artist, TEXT_X - (scrollState ? scrollState.offset : 0), ARTIST_Y)
    context.restore()
  }

  function startScrollAnimation(timestamp) {
    if (!scrollState) return

    if (lastTime === null) lastTime = timestamp
    const delta = (timestamp - lastTime) / 1000
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

    drawListeningActivity()
    rafId = requestAnimationFrame(startScrollAnimation)
    lastTime = timestamp
  }

  function stopScrollAnimation() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    lastTime = null
    scrollState = null
  }

  function showListeningActivity() {
    stopScrollAnimation()
    context.font = SCROLL_FONT
    const overflow = context.measureText(listeningActivity.artist).width - TEXT_WIDTH
    if (overflow > 0) {
      scrollState = {
        offset: 0,
        overflowWidth: overflow,
        direction: 1,
        pauseUntil: performance.now() + SCROLL_PAUSE,
      }
      rafId = requestAnimationFrame(startScrollAnimation)
    } else {
      drawListeningActivity()
    }
  }

  function drawAlbumOfMonth() {
    clearCanvas()

    if (albumOfMonth) {
      context.textBaseline = 'top'
      context.textAlign = 'center'
      context.fillStyle = SPOTIFY_GREEN
      context.font = H1_FONT
      context.fillText('ALBUM OF THE MONTH', CANVAS_WIDTH / 2, 32)

      if (albumOfMonth.image) {
        context.drawImage(
          albumOfMonth.image,
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
        ALBUM_OF_MONTH_Y + ALBUM_OF_MONTH_SIZE + 70,
      )
    }
  }

  function updateScreen() {
    stopScrollAnimation()
    if (mode === 0 && listeningActivity) showListeningActivity()
    else if (mode === 1 && albumOfMonth) drawAlbumOfMonth()
    else clearCanvas()
  }

  const spotifyConnection = createSpotifyConnection(async (data) => {
    if (data.listeningActivity) {
      const url = data.listeningActivity.albumImage
      const albumImage = url ? await loadImage(url) : null
      listeningActivity = { ...data.listeningActivity, albumImage }
    }
    if (data.albumOfMonth) {
      const url = data.albumOfMonth.image
      const image = url ? await loadImage(url) : null
      albumOfMonth = { ...data.albumOfMonth, image }
    }
    updateScreen()
  })

  function setMode(newMode) {
    mode = newMode
    updateScreen()
  }

  function dispose() {
    stopScrollAnimation()
    spotifyConnection.dispose()
  }

  return { screen, setMode, dispose }
}

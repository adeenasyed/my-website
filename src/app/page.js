'use client'
import '@/3D/popups/styles.css'
import { useEffect, useRef, useState } from 'react'
import { createScene } from '@/3D/scene.js'
import { PURPLE } from '@/theme.js'
import ContactPopup from '@/3D/popups/ContactPopup'
import AttributionsPopup from '@/3D/popups/AttributionsPopup'
import RemotePopup from '@/3D/popups/RemotePopup'

function getDevice(w) {
  if (w >= 1024) return 'ok'
  if (w >= 768) return 'tablet'
  return 'mobile'
}

export default function Landing() {
  const sceneRef = useRef(null)
  const roomRef = useRef(null)
  const modeRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [showRemote, setShowRemote] = useState(false)
  const [ledColor, setLEDColor] = useState(PURPLE)
  const [tvZoom, setTVZoom] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showAttributions, setShowAttributions] = useState(false)
  const [device, setDevice] = useState('ok')
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let currentDevice = getDevice(window.innerWidth)
    setDevice(currentDevice)

    function onResize() {
      currentDevice = getDevice(window.innerWidth)
      setDevice(currentDevice)
      if (modeRef.current === '3D') roomRef.current?.setInteractionsEnabled(currentDevice === 'ok')
    }
    window.addEventListener('resize', onResize)

    const context = createScene()
    sceneRef.current = context

    if (currentDevice === 'mobile') {
      setLoading(false)
    } else {
      async function loadRoom() {
        const { buildRoom } = await import('@/3D/index.js')
        const room = await buildRoom({
          ...context,
          setProgress,
          tv: () => {
            setTVZoom(true)
            openRemote()
          },
          lightSign: () => setShowContact(true),
          infoButton: () => setShowAttributions(true),
          remote: openRemote,
          onEscape: handleEscape,
        })
        if (!sceneRef.current) {
          room.dispose()
          return
        }
        roomRef.current = room
        setLoading(false)
      }
      loadRoom()
    }

    return () => {
      window.removeEventListener('resize', onResize)
      context.cancelLandingLoop()
      roomRef.current?.dispose()
      context.dispose()
      sceneRef.current = null
      roomRef.current = null
    }
  }, [])

  function handleChoose3D() {
    if (modeRef.current !== null || !roomRef.current) return
    modeRef.current = '3D'
    setMode('3D')
    sceneRef.current.cancelLandingLoop()
    roomRef.current.startIntro()
  }

  function openRemote() {
    setShowRemote(true)
    roomRef.current.setInteractionsEnabled(false)
  }

  function closeRemote() {
    setShowRemote(false)
    roomRef.current.setInteractionsEnabled(true)
  }

  function handleEscape() {
    setTVZoom(false)
    closeRemote()
    roomRef.current.resetCamera()
  }

  return (
    <>
      {loading && (
        <div className='loading-screen'>
          <div className='loading-bar' style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      {mode === null && !loading && (
        <div className='landing'>
          <button className='landing-button landing-button--disabled'>
            <span className='landing-button-mode'>2D</span>
            <span className='landing-button-note'>COMING SOON</span>
          </button>
          <button
            className={`landing-button ${{ ok: 'landing-button--active', tablet: 'landing-button--rotate', mobile: 'landing-button--disabled' }[device]}`}
            onClick={device === 'ok' ? handleChoose3D : undefined}
          >
            <span className='landing-button-mode'>3D</span>
            {device === 'mobile' && <span className='landing-button-note'>UNAVAILABLE ON MOBILE <br /> GET A BIGGER SCREEN!</span>}
            {device === 'tablet' && <span className='landing-button-note landing-button-note--flash'>ROTATE DEVICE</span>}
          </button>
        </div>
      )}

      {showRemote && (
        <RemotePopup
          ledColor={ledColor}
          tvZoom={tvZoom}
          onClose={closeRemote}
          onEscape={handleEscape}
          setTVMode={(i) => roomRef.current?.setTVMode(i)}
          setLEDColor={(color) => {
            roomRef.current?.setLEDColor(color)
            setLEDColor(color)
          }}
        />
      )}
      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}
      {showAttributions && <AttributionsPopup onClose={() => setShowAttributions(false)} />}
      {(mode === '3D' && device !== 'ok') && <div className='orientation-warning'>↺</div>}
    </>
  )
}

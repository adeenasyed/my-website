'use client'
import '@/3D/popups/styles.css'
import { useEffect, useRef, useState } from 'react'
import { buildRoom } from '@/3D/index.js'
import { PURPLE } from '@/theme.js'
import ContactPopup from '@/3D/popups/ContactPopup'
import AttributionsPopup from '@/3D/popups/AttributionsPopup'
import RemotePopup from '@/3D/popups/RemotePopup'

export default function Landing() {
  const roomRef = useRef(null)
  const [showRemote, setShowRemote] = useState(false)
  const [ledColor, setLEDColor] = useState(PURPLE)
  const [tvZoom, setTVZoom] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showAttributions, setShowAttributions] = useState(false)
  const [showLanding, setShowLanding] = useState(false)
  const [device, setDevice] = useState('ok')

  useEffect(() => {
    function checkDevice() {
      const w = window.innerWidth
      if (w >= 1024) setDevice('ok')
      else if (w >= 768) setDevice('tablet-portrait')
      else setDevice('mobile')
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  useEffect(() => {
    let disposed = false
    buildRoom({
      tv: () => {
        setTVZoom(true)
        openRemote()
      },
      remote: openRemote,
      lightSign: () => setShowContact(true),
      infoButton: () => setShowAttributions(true),
      onEscape: handleEscape,
    }).then((actions) => {
      if (disposed) {
        actions.dispose()
        return
      }
      roomRef.current = actions
      setShowLanding(true)
    })
    return () => {
      disposed = true
      roomRef.current?.dispose()
      roomRef.current = null
    }
  }, [])

  function openRemote() {
    setShowRemote(true)
    roomRef.current?.setInteractionsEnabled(false)
  }

  function closeRemote() {
    setShowRemote(false)
    roomRef.current?.setInteractionsEnabled(true)
  }

  function handleEscape() {
    setTVZoom(false)
    closeRemote()
    roomRef.current?.resetCamera()
  }

  return (
    <>
      {showLanding && (
        <div className='landing'>
          <button className='landing-button landing-button--disabled'>
            <span className='landing-button-mode'>2D</span>
            <span className='landing-button-note'>COMING SOON</span>
          </button>
          <button
            className={`landing-button ${{ ok: 'landing-button--active', mobile: 'landing-button--disabled', 'tablet-portrait': 'landing-button--rotate' }[device]}`}
            onClick={device === 'ok' ? () => { setShowLanding(false); roomRef.current?.startIntro() } : undefined}
          >
            <span className='landing-button-mode'>3D</span>
            {device === 'mobile' && <span className='landing-button-note'>UNAVAILABLE ON MOBILE</span>}
            {device === 'tablet-portrait' && <span className='landing-button-note landing-button-note--flash'>ROTATE DEVICE</span>}
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
    </>
  )
}

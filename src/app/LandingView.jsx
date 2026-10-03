'use client'
import { useEffect, useRef, useState } from 'react'
import { EMAIL, GITHUB, LINKEDIN } from '@/data/links.js'
import './LandingView.css'

const NAME = 'ADEENA SYED'
const ASIDE_PREFIX = ' ('
const INTRO_LINES = [
  'Hi, I\u2019m Adeena.',
  'I\u2019m an engineer (UW \u201826).',
]
const ENTER_INTRO_LINES = [
  ...INTRO_LINES,
  'Click anywhere to enter.',
]
const NO_ENTER_INTRO_LINES = [
  ...INTRO_LINES,
  'Get a bigger screen to enter.',
]
const LINKS = [
  { text: EMAIL, href: `mailto:${EMAIL}` },
  { text: LINKEDIN.replace('https://', ''), href: LINKEDIN },
  { text: GITHUB.replace('https://', ''), href: GITHUB },
]

const CHAR_MS = 50
const PAUSE_MS = 500
const SHORT_PAUSE_MS = 250
const UNFOLD_MS = 580
const CONTENT_FADE_MS = 220
const CONTENT_FADE_START_MS = 430
const TYPING_START_MS = UNFOLD_MS + SHORT_PAUSE_MS
const GLITCH_REVEAL_PAUSE_MS = 50
const GLITCH_MS = 500
const LAUNCH_OVERLAP_MS = 90

function pauseAfter(char) {
  if (char === ',') return SHORT_PAUSE_MS
  return char === '.' || char === '!' ? PAUSE_MS : 0
}

function createTimeline(introLines) {
  let time = TYPING_START_MS
  const lines = introLines.map((line) => (
    [...line].map((char, index) => {
      if (line.startsWith(ASIDE_PREFIX, index)) time += SHORT_PAUSE_MS
      const character = { char, appearsAt: time }
      time += CHAR_MS + pauseAfter(char)
      return character
    })
  ))
  const characters = lines.flat()

  const lastCharacter = characters.at(-1)
  const typingEndsAt = time - pauseAfter(lastCharacter.char)

  characters.forEach((character, index) => {
    character.caretEndsAt = characters[index + 1]?.appearsAt ?? typingEndsAt
  })

  const text = characters.map(({ char }) => char).join('')
  const nameStart = text.toLowerCase().indexOf(NAME.toLowerCase())
  const speakerRevealAt = lines[0].at(-1).appearsAt + CHAR_MS + GLITCH_REVEAL_PAUSE_MS
  const crestRevealAt = lines[1].at(-1).appearsAt + CHAR_MS + GLITCH_REVEAL_PAUSE_MS
  const nameCharacters = [...NAME].map((char, index) => ({
    char,
    appearsAt: characters[nameStart + index]?.appearsAt ?? speakerRevealAt,
  }))

  return {
    crestRevealAt,
    lines,
    nameCharacters,
    speakerRevealAt,
    typingEndsAt,
  }
}

const ENTER_TIMELINE = createTimeline(ENTER_INTRO_LINES)
const NO_ENTER_TIMELINE = createTimeline(NO_ENTER_INTRO_LINES)

function Character({ char, appearsAt, caretEndsAt }) {
  return (
    <span
      aria-hidden='true'
      className='landing-character'
      style={{ '--appears-at': `${appearsAt}ms`, '--caret-ends-at': `${caretEndsAt}ms` }}
    >
      {char}
    </span>
  )
}

function TypedLine({ line, characters }) {
  const wordStart = line === NO_ENTER_INTRO_LINES.at(-1)
    ? line.lastIndexOf(' ') + 1
    : characters.length

  return (
    <>
      {characters.slice(0, wordStart).map((character) => (
        <Character key={character.appearsAt} {...character} />
      ))}
      {wordStart < characters.length && (
        <span className='landing-word'>
          {characters.slice(wordStart).map((character) => (
            <Character key={character.appearsAt} {...character} />
          ))}
        </span>
      )}
    </>
  )
}

function PanelContent({ showIntro, introLines, timeline, ghost = false }) {
  const lines = showIntro || ghost ? introLines : []
  const linksOnly = lines.length === 0
  return (
    <>
      {!ghost && (
        <>
          <h1 id='landing-name' className='landing-name' aria-label={NAME}>
            {showIntro
              ? timeline.nameCharacters.map(({ char, appearsAt }, index) => (
                  <span
                    key={index}
                    aria-hidden='true'
                    className='landing-name-character'
                    style={{ '--appears-at': `${appearsAt}ms` }}
                  >
                    {char}
                  </span>
                ))
              : NAME}
          </h1>
          {showIntro && (
            <>
              <span className='landing-name landing-name-ghost landing-name-intro-ghost landing-name-intro-ghost--red' aria-hidden='true'>{NAME}</span>
              <span className='landing-name landing-name-ghost landing-name-intro-ghost landing-name-intro-ghost--blue' aria-hidden='true'>{NAME}</span>
            </>
          )}
        </>
      )}

      {!ghost && (
        <>
          <span className='landing-crest landing-crest-main'>
            <img
              className='landing-crest-image'
              src='/images/waterloo-logo.png'
              alt='University of Waterloo crest'
            />
          </span>
          {showIntro && (
            <>
              <span className='landing-crest landing-crest-ghost landing-crest-intro-ghost landing-crest-intro-ghost--red' aria-hidden='true' />
              <span className='landing-crest landing-crest-ghost landing-crest-intro-ghost landing-crest-intro-ghost--blue' aria-hidden='true' />
            </>
          )}
        </>
      )}

      <div className={`landing-panel-body${linksOnly ? ' landing-panel-body--links-only' : ''}`}>
        {lines.length > 0 && (
          <div className='landing-copy'>
            {lines.map((line, lineIndex) => (
              <p key={lineIndex} aria-label={line}>
                {showIntro ? (
                  <>
                    {lineIndex === 0 && <span className='landing-initial-caret' aria-hidden='true' />}
                    <TypedLine line={line} characters={timeline.lines[lineIndex]} />
                  </>
                ) : line}
              </p>
            ))}
          </div>
        )}

        <ul className='landing-links'>
          {LINKS.map(({ text, href }) => {
            const external = href.startsWith('https://')
            return ghost ? (
              <li key={href}><span className='landing-ghost-link'>{text}</span></li>
            ) : (
              <li key={href}>
                <a
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  onClick={(event) => event.stopPropagation()}
                >
                  {text}
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      {ghost && <span className='landing-ghost-arrow'>▼</span>}
    </>
  )
}

function LandingPanel({ showIntro, entryEnabled, exiting, introLines, showArrow, timeline, typing, onEnter }) {
  const enter = entryEnabled && !exiting ? onEnter : undefined

  return (
    <section
      className={`landing-panel${showIntro ? ' landing-panel--animated' : ''}${typing ? ' landing-panel--typing' : ''}${enter ? ' landing-panel--interactive' : ''}${exiting ? ' glitch-exit' : ''}`}
      aria-labelledby='landing-name'
      onClick={enter}
      style={{
        '--unfold-duration': `${UNFOLD_MS}ms`,
        '--content-fade-duration': `${CONTENT_FADE_MS}ms`,
        '--content-fade-delay': `${CONTENT_FADE_START_MS}ms`,
        '--typing-start': `${TYPING_START_MS}ms`,
        '--speaker-reveal-at': `${timeline.speakerRevealAt}ms`,
        '--crest-reveal-at': `${timeline.crestRevealAt}ms`,
        '--links-delay': `${timeline.typingEndsAt + PAUSE_MS}ms`,
      }}
    >
      <span className='landing-panel-flash' aria-hidden='true' />
      <PanelContent showIntro={showIntro} introLines={introLines} timeline={timeline} />
      {showArrow && <span className='landing-advance-arrow' aria-hidden='true'>▼</span>}

      {exiting && (
        <>
          <div className='glitch-exit-copy glitch-exit-copy--red' aria-hidden='true'>
            <PanelContent ghost introLines={introLines} timeline={timeline} />
          </div>
          <div className='glitch-exit-copy glitch-exit-copy--blue' aria-hidden='true'>
            <PanelContent ghost introLines={introLines} timeline={timeline} />
          </div>
          <span className='landing-name landing-name-ghost glitch-exit-copy--red' aria-hidden='true'>{NAME}</span>
          <span className='landing-name landing-name-ghost glitch-exit-copy--blue' aria-hidden='true'>{NAME}</span>
          <span className='landing-crest landing-crest-ghost landing-crest-exit-ghost glitch-exit-copy--red' aria-hidden='true' />
          <span className='landing-crest landing-crest-ghost landing-crest-exit-ghost glitch-exit-copy--blue' aria-hidden='true' />
        </>
      )}
    </section>
  )
}

export default function LandingView({
  canEnter,
  entryEnabled,
  showIntro,
  onLaunch,
  onEnter,
}) {
  const [exiting, setExiting] = useState(false)
  const [typingSkipped, setTypingSkipped] = useState(false)
  const [typingComplete, setTypingComplete] = useState(!showIntro)
  const onLaunchRef = useRef(onLaunch)
  const onEnterRef = useRef(onEnter)
  const introLines = canEnter ? ENTER_INTRO_LINES : NO_ENTER_INTRO_LINES
  const timeline = canEnter ? ENTER_TIMELINE : NO_ENTER_TIMELINE

  useEffect(() => {
    onLaunchRef.current = onLaunch
    onEnterRef.current = onEnter
  }, [onLaunch, onEnter])

  useEffect(() => {
    if (!exiting) return
    const launchId = setTimeout(
      () => onLaunchRef.current?.(),
      GLITCH_MS - LAUNCH_OVERLAP_MS,
    )
    const enterId = setTimeout(() => onEnterRef.current?.(), GLITCH_MS)
    return () => {
      clearTimeout(launchId)
      clearTimeout(enterId)
    }
  }, [exiting])

  useEffect(() => {
    if (!showIntro || typingComplete) return
    const id = setTimeout(() => setTypingComplete(true), timeline.typingEndsAt)
    return () => clearTimeout(id)
  }, [showIntro, timeline, typingComplete])

  useEffect(() => {
    if (!showIntro || !entryEnabled || exiting) return

    function handleKeyDown(event) {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      if (event.target instanceof Element && event.target.closest('a, button, input, textarea, select')) return
      event.preventDefault()
      handleEntry()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showIntro, entryEnabled, exiting, typingComplete])

  function handleEntry() {
    if (!entryEnabled || exiting) return
    if (!typingComplete) {
      setTypingSkipped(true)
      setTypingComplete(true)
      return
    }
    setExiting(true)
  }

  return (
    <div className='landing'>
      {showIntro && entryEnabled && (
        <button
          className='landing-enter'
          type='button'
          disabled={exiting}
          onClick={handleEntry}
          aria-label={typingComplete ? 'Enter room view' : 'Finish landing introduction'}
        />
      )}
      <LandingPanel
        showIntro={showIntro}
        entryEnabled={entryEnabled}
        exiting={exiting}
        introLines={introLines}
        showArrow={showIntro && entryEnabled && typingComplete}
        timeline={timeline}
        typing={showIntro && !typingSkipped}
        onEnter={handleEntry}
      />
    </div>
  )
}

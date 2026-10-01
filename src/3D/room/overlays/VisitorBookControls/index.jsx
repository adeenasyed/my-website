import './styles.css'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_VISIBLE_PAGE_DOTS = 5
const PAGE_DOT_STEP = 22
const PAGE_DOT_GAP = 4

const ICON_PATHS = {
  pencil: 'M4 19.74 5.64 16.26 17.95 4.26 20 6.21 7.69 18.21ZM5.64 16.26 7.69 18.21M15.79 6.41 17.85 8.36',
  eraser: 'M9.3 20 4 14.7 14.7 4 20 9.3ZM7.46 11.24 12.76 16.54',
  trash: 'M4.46 6.14h15.08M9.76 6.14V4h4.48v2.14M6.7 6.14 7.82 20h8.36L17.3 6.14M10.57 9.2 10.78 17.35M13.43 9.2 13.22 17.35',
  save: 'M5 4h11l3 3v13H5ZM8 4v6h8V4M8 20v-6h8v6',
}

function Icon({ name }) {
  return (
    <svg
      className='visitor-book-tool-art'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.25'
      strokeLinecap='butt'
      strokeLinejoin='miter'
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

export default function VisitorBookControls({ controls, initialPointer, onClose, setNativeCursorHidden }) {
  const [tool, setTool] = useState('pencil')
  const [hasDrawing, setHasDrawing] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [entryCount, setEntryCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const toolbarRef = useRef(null)
  const cursorRef = useRef(null)
  const pageNavigationRef = useRef(null)
  const initialPointerRef = useRef(initialPointer && {
    x: initialPointer.x,
    y: initialPointer.y,
  })
  const lastPageIndex = Math.ceil(entryCount / 2)

  const showPage = useCallback((nextPage) => {
    controls.setPage(nextPage)
    controls.setDrawingEnabled(nextPage === 0)
    setNativeCursorHidden(nextPage === 0)
    setPageIndex(nextPage)
  }, [controls, setNativeCursorHidden])

  useEffect(() => {
    showPage(0)
    controls.setTool('pencil')
    controls.setDrawingListener((nextHasDrawing) => {
      setHasDrawing(nextHasDrawing)
      if (!nextHasDrawing) setSaveError(false)
    })

    let cancelled = false
    let animationFrameId
    fetch('/api/visitor-book')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ entries }) => {
        if (cancelled) return
        controls.setEntries(entries)
        setEntryCount(entries.length)
      })
      .catch((error) => console.error('visitor-book:', error))

    function positionControl(ref, point) {
      if (!ref.current) return
      const x = Math.round(point.x)
      const y = Math.round(point.y)
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }

    function positionControls() {
      const positions = controls.getPositions()
      positionControl(toolbarRef, positions.toolbar)
      positionControl(pageNavigationRef, positions.pageNavigation)
      animationFrameId = requestAnimationFrame(positionControls)
    }

    function positionCursor(event) {
      const cursor = cursorRef.current
      if (!cursor) return
      const overControls = event.target instanceof Element
        && event.target.closest('.visitor-book-toolbar, .visitor-book-page-navigation')
      cursor.style.opacity = event.pointerType !== 'mouse' || overControls ? '0' : '1'
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-3px, -21px)`
    }

    function hideCursor() {
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
    }

    function closeOutsideBook(event) {
      const overControls = event.target instanceof Element
        && event.target.closest('.visitor-book-toolbar, .visitor-book-page-navigation')
      if (!overControls && !controls.containsPoint(event.clientX, event.clientY)) onClose()
    }

    const pointer = initialPointerRef.current
    if (pointer) {
      positionCursor({
        clientX: pointer.x,
        clientY: pointer.y,
        pointerType: 'mouse',
        target: document.elementFromPoint(pointer.x, pointer.y),
      })
    }
    positionControls()
    window.addEventListener('pointermove', positionCursor)
    window.addEventListener('pointerdown', closeOutsideBook)
    document.addEventListener('mouseleave', hideCursor)

    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('pointermove', positionCursor)
      window.removeEventListener('pointerdown', closeOutsideBook)
      document.removeEventListener('mouseleave', hideCursor)
      controls.setDrawingEnabled(false)
      controls.setDrawingListener(null)
    }
  }, [controls, onClose, showPage])

  useEffect(() => {
    if (pageIndex !== 0) return

    function handleHistoryShortcut(event) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      if (event.shiftKey) controls.redo()
      else controls.undo()
    }

    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [controls, pageIndex])

  useEffect(() => {
    function handlePageShortcut(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (event.key === 'ArrowLeft' && pageIndex > 0) {
        event.preventDefault()
        showPage(pageIndex - 1)
      } else if (event.key === 'ArrowRight' && pageIndex < lastPageIndex) {
        event.preventDefault()
        showPage(pageIndex + 1)
      }
    }

    window.addEventListener('keydown', handlePageShortcut)
    return () => window.removeEventListener('keydown', handlePageShortcut)
  }, [pageIndex, lastPageIndex, showPage])

  function selectTool(nextTool) {
    setTool(nextTool)
    controls.setTool(nextTool)
  }

  async function saveDrawing() {
    const strokes = controls.getStrokes()
    setSaving(true)
    setSaveError(false)
    try {
      const response = await fetch('/api/visitor-book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ strokes }),
      })
      if (!response.ok) {
        setSaveError(true)
        return
      }
      const { entry, maxEntries } = await response.json()
      controls.save(entry, maxEntries)
      setEntryCount((count) => Math.min(count + 1, maxEntries))
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const pageCount = lastPageIndex + 1
  const visiblePageCount = Math.min(pageCount, MAX_VISIBLE_PAGE_DOTS)
  const firstVisiblePage = Math.min(
    Math.max(pageIndex - Math.floor(visiblePageCount / 2), 0),
    pageCount - visiblePageCount,
  )
  const lastVisiblePage = firstVisiblePage + visiblePageCount - 1
  const dotViewportWidth = visiblePageCount * PAGE_DOT_STEP - PAGE_DOT_GAP

  return (
    <div className='visitor-book-controls'>
      {pageIndex === 0 && (
        <>
          <div className='visitor-book-tool-cursor' ref={cursorRef}>
            <Image src={`/images/${tool}.png`} alt='' width={18} height={18} draggable='false' />
          </div>
          <div className='visitor-book-toolbar' ref={toolbarRef}>
            <button
              type='button'
              aria-pressed={tool === 'pencil'}
              onClick={() => selectTool('pencil')}
            >
              <Icon name='pencil' />
            </button>
            <button
              type='button'
              aria-pressed={tool === 'eraser'}
              onClick={() => selectTool('eraser')}
            >
              <Icon name='eraser' />
            </button>
            <button
              className='visitor-book-trash'
              type='button'
              onClick={controls.clear}
              disabled={!hasDrawing}
            >
              <Icon name='trash' />
            </button>
            <button
              className={saveError ? 'visitor-book-save-error' : undefined}
              type='button'
              onClick={saveDrawing}
              disabled={!hasDrawing || saving}
            >
              <Icon name='save' />
            </button>
          </div>
        </>
      )}
      <nav className='visitor-book-page-navigation' ref={pageNavigationRef}>
        <div className='visitor-book-page-navigation-viewport' style={{ width: dotViewportWidth }}>
          <div
            className='visitor-book-page-navigation-track'
            style={{ transform: `translate3d(${-firstVisiblePage * PAGE_DOT_STEP}px, 0, 0)` }}
          >
            {Array.from({ length: pageCount }, (_, index) => {
              const isEdge = (
                (index === firstVisiblePage && firstVisiblePage > 0)
                || (index === lastVisiblePage && lastVisiblePage < pageCount - 1)
              )
              return (
                <button
                  key={index}
                  type='button'
                  aria-current={index === pageIndex ? 'page' : undefined}
                  data-edge={isEdge ? 'true' : undefined}
                  onClick={() => showPage(index)}
                >
                  <span />
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

const VIEW_OPTIONS = [
  { id: 'landing', label: 'LANDING VIEW' },
  { id: 'room', label: 'ROOM VIEW' },
  { id: 'sky', label: 'SKY VIEW' },
]

function ViewOption({ selected, label, ...props }) {
  return (
    <button
      className='view-switch-option'
      type='button'
      aria-pressed={selected}
      {...props}
    >
      <span className='view-switch-box'>[{selected ? '■' : '\u00A0'}]</span>
      {label}
    </button>
  )
}

export default function SiteChrome({
  activeView,
  clock,
  disabled,
  showConstellations,
  onSelectView,
  onToggleConstellations,
  ...hoverHandlers
}) {
  return (
    <div className='sky-overlay'>
      <div className='sky-caption'>THE SKY ABOVE <br /> TORONTO, ON <br /> {clock.date} <br /> {clock.time}</div>
      <div className='view-switch' role='group' {...hoverHandlers}>
        {VIEW_OPTIONS.map(({ id, label }) => (
          <ViewOption
            key={id}
            selected={activeView === id}
            label={label}
            disabled={disabled}
            onClick={() => onSelectView(id)}
          />
        ))}
      </div>

      {activeView === 'sky' && (
        <div className='view-switch' role='group' {...hoverHandlers}>
          <ViewOption
            selected={showConstellations}
            label='CONSTELLATIONS'
            disabled={disabled}
            onClick={onToggleConstellations}
          />
        </div>
      )}
    </div>
  )
}

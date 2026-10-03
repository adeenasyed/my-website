const VIEW_OPTIONS = [
  { id: 'landing', label: 'ME' },
  { id: 'room', label: 'MY ROOM' },
  { id: 'sky', label: 'THE SKY' },
]

function ViewOption({ selected, label, ...props }) {
  return (
    <button
      className='view-option'
      type='button'
      aria-pressed={selected}
      {...props}
    >
      <span className='view-option-box'>[{selected ? '■' : '\u00A0'}]</span>
      {label}
    </button>
  )
}

export default function Navbar({
  activeView,
  clock,
  disabled,
  showConstellations,
  onSelectView,
  onToggleConstellations,
  ...hoverHandlers
}) {
  return (
    <div className='navbar'>
      <div className='navbar-caption'>THE SKY ABOVE <br /> TORONTO, ON <br /> {clock.date} <br /> {clock.time}</div>
      <div className='view-options' role='group' {...hoverHandlers}>
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
        <div className='view-options' role='group' {...hoverHandlers}>
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

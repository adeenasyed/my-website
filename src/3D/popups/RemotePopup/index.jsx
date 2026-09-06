import './styles.css'
import { LED_COLORS } from '@/theme.js'

const SOURCES = ['spotify', 'nintendo']

export default function RemotePopup({ ledColor, tvZoom, tvSource, onClose, onEscape, setTVSource, setLEDColor }) {
  return (
    <div className='remote-anchor' onClick={(e) => e.stopPropagation()}>
      <div className='popup remote-popup' style={{ '--accent': ledColor, '--accent-shadow': `${ledColor}44`, '--accent-border': `${ledColor}33` }}>
        <button onClick={tvZoom ? onEscape : onClose} className='popup-close'>×</button>
        <div className='remote-section'>
          <div className='popup-label'>SOURCE</div>
          <div className='remote-source-switch' role='group'>
            {SOURCES.map((source) => {
              const chosen = tvSource === source
              return (
                <button
                  key={source}
                  type='button'
                  aria-pressed={chosen}
                  onClick={() => setTVSource(source)}
                  className='remote-source-option'
                >
                  <span className='remote-source-box'>[{chosen ? '■' : '\u00A0'}]</span>
                  {source.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>
        {!tvZoom && (
          <div className='remote-section remote-section--divided'>
            <div className='popup-label'>LEDS</div>
            <div className='color-swatch-row'>
              {LED_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setLEDColor(color)}
                  className='color-swatch'
                  style={{ background: color, '--swatch-shadow': `${color}88` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

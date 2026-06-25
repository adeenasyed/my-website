import './styles.css'
import { ATTRIBUTIONS } from '@/data/attributions.js'

export default function AttributionsPopup({ onClose }) {
  return (
    <div className='popup-overlay'>
      <div className='popup attributions-popup popup-static' onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className='popup-close'>×</button>
        <div className='attributions-title'>ATTRIBUTIONS</div>
        <div className='attributions-divider' />
        <ul className='attributions-list'>
          {ATTRIBUTIONS.map((a) => (
            <li key={a.name}>
              <span className='attributions-bullet'>•</span>
              <span className='attributions-item'>
                <a href={a.nameUrl} target='_blank' rel='noreferrer' className='attributions-item-link'>{a.name}</a>
                {a.author && (
                  <>
                    <span className='attributions-muted'> by </span>
                    <a href={a.authorUrl} target='_blank' rel='noreferrer' className='attributions-item-link'>{a.author}</a>
                  </>
                )}
                <span className='attributions-muted'> via {a.via}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

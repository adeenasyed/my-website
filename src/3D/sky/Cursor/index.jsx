import './styles.css'

export default function Cursor({ ref }) {
  return (
    <div className='sky-cursor' ref={ref}>
      <svg viewBox='0 0 64 64' fill='none' stroke='currentColor'>
        <path d='M14 7H3v50h11M50 7h11v50H50' vectorEffect='non-scaling-stroke' />
      </svg>
      <div className='sky-cursor-plus'>+</div>
    </div>
  )
}

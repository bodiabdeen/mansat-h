let uid = 0

export default function GoldArc({ className = 'w-14 h-4 mx-auto my-2' }) {
  const id = `goldArcGrad-${uid++}`
  return (
    <svg viewBox="0 0 56 16" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E0C15C" />
          <stop offset="1" stopColor="#B8952B" />
        </linearGradient>
      </defs>
      <path d="M2 2 Q28 16 54 2" fill="none" stroke={`url(#${id})`} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

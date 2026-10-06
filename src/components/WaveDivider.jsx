export default function WaveDivider({ fillClassName = 'fill-white dark:fill-indigo-950' }) {
  return (
    <svg viewBox="0 0 1440 100" preserveAspectRatio="none"
      className="absolute bottom-0 left-0 right-0 w-full h-10 md:h-16" aria-hidden="true">
      <path d="M0,50 Q360,0 720,45 T1440,40 L1440,100 L0,100 Z" className={fillClassName} />
    </svg>
  )
}

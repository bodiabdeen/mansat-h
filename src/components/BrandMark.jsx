// The real PROF | بروف mark, extracted from the brand board with a transparent
// background so it reads cleanly on both light and dark surfaces.
export default function BrandMark({ className = 'w-8 h-8' }) {
  return <img src="/logo-icon-transparent.png" alt="PROF" className={`${className} object-contain`} />
}

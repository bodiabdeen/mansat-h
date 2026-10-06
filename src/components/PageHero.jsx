import Icon from './Icon'

export default function PageHero({ icon, title, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 text-white px-5 py-5 pb-7">
      <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-gold-400/30 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -start-8 w-32 h-32 rounded-full bg-indigo-400/25 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
          <Icon e={icon} className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate">{title}</h2>
          {subtitle && <p className="text-indigo-100 text-xs mt-0.5 opacity-90 truncate">{subtitle}</p>}
        </div>
      </div>
      <svg viewBox="0 0 200 16" preserveAspectRatio="none" className="relative mt-3 w-24 h-2.5" aria-hidden="true">
        <path d="M4 4 Q100 16 196 4" fill="none" stroke="#E0C15C" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

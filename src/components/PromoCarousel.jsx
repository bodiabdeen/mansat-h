import { useEffect, useRef, useState } from 'react'

const SLIDE_MS = 5000

export default function PromoCarousel({ media, imageClassName = 'w-full h-36 rounded-xl object-cover', videoClassName = 'w-full rounded-xl max-h-52', dotClassName = 'bg-white/40' }) {
  const [index, setIndex] = useState(0)
  const playingRef = useRef(false)

  useEffect(() => { setIndex(0) }, [media])

  useEffect(() => {
    if (media.length <= 1) return
    const id = setInterval(() => {
      if (playingRef.current) return
      setIndex(i => (i + 1) % media.length)
    }, SLIDE_MS)
    return () => clearInterval(id)
  }, [media])

  if (media.length === 0) return null
  const current = media[index]

  return (
    <div className="space-y-2">
      {current.type === 'image' ? (
        <img src={current.url} alt="" className={imageClassName} />
      ) : (
        <video key={current.url} controls className={videoClassName} src={current.url}
          onPlay={() => { playingRef.current = true }}
          onPause={() => { playingRef.current = false }}
          onEnded={() => { playingRef.current = false }} />
      )}
      {media.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {media.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} aria-label={`slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-gold-400 w-4' : dotClassName + ' w-1.5'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

import { fluentIconUrl } from '../utils/icons'

// Renders a rich 3D icon (Microsoft Fluent Emoji) in place of a plain emoji
// glyph. Falls back to the native emoji character if there's no 3D asset
// for it, or if the image fails to load for any reason.
export default function Icon({ e, className = 'inline-block w-5 h-5 align-[-0.35em]' }) {
  const src = fluentIconUrl(e)
  if (!src) return <span>{e}</span>

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      onError={(ev) => { ev.currentTarget.replaceWith(document.createTextNode(e)) }}
    />
  )
}

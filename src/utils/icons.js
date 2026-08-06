// Maps every emoji glyph used in this app to its Microsoft Fluent Emoji "3D"
// asset name (https://github.com/microsoft/fluentui-emoji, MIT licensed —
// see THIRD-PARTY.md). A few glyphs have no 3D rendering upstream (gendered/
// skin-tone ZWJ sequences like "man teacher" only ship flat color variants),
// so those are mapped to a close thematic substitute instead — noted inline.
export const EMOJI_TO_FLUENT = {
  '✅': 'Check mark button',
  '👨‍🏫': 'Graduation cap',      // substitute: "man teacher" has no 3D asset
  '⏳': 'Hourglass not done',
  '📦': 'Package',
  '👤': 'Bust in silhouette',
  '👨‍🎓': 'Backpack',            // substitute: "man student" has no 3D asset
  '📚': 'Books',
  '📊': 'Bar chart',
  '📅': 'Calendar',
  '📝': 'Memo',
  '🗑': 'Wastebasket',
  '🗑️': 'Wastebasket',
  '💬': 'Speech balloon',
  '🏆': 'Trophy',
  '🛂': 'Passport control',
  '💳': 'Credit card',
  '👑': 'Crown',
  '🔍': 'Magnifying glass tilted left',
  '👋': 'Party popper',                // substitute: "waving hand" has no 3D asset
  '🏅': 'Sports medal',
  '📋': 'Clipboard',
  '🕐': 'One oclock',
  '⏱': 'Stopwatch',
  '⏱️': 'Stopwatch',
  '🪪': 'Identification card',
  '⚙': 'Gear',
  '⚙️': 'Gear',
  '🗂': 'Card index dividers',
  '🗂️': 'Card index dividers',
  '☀': 'Sun',
  '☀️': 'Sun',
  '🌙': 'Crescent moon',
  '💡': 'Light bulb',
  '🖼': 'Framed picture',
  '🖼️': 'Framed picture',
  '🚫': 'Prohibited',
  '⚠': 'Warning',
  '⚠️': 'Warning',
  '📎': 'Paperclip',
  '📤': 'Outbox tray',
  '⭐': 'Star',
  '⚡': 'High voltage',
  '↔': 'Left-right arrow',
  '↔️': 'Left-right arrow',
  '🎬': 'Clapper board',
  '🙋': 'Bust in silhouette',          // substitute: "person raising hand" has no 3D asset
  '🔐': 'Locked with key',
  '📧': 'E-mail',
  '🌐': 'Globe with meridians',
  '❌': 'Cross mark',
  '🔗': 'Link',
  '🏁': 'Chequered flag',
  '👥': 'Busts in silhouette',
  '🔒': 'Locked',
  '🎯': 'Bullseye',
  '🔥': 'Fire',
  '🌟': 'Glowing star',
  '🥇': '1st place medal',
  '🎖': 'Military medal',
  '🎖️': 'Military medal',
}

const BASE_URL = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets'

export function fluentIconUrl(emoji) {
  const name = EMOJI_TO_FLUENT[emoji]
  if (!name) return null
  const file = name.toLowerCase().replace(/ /g, '_') + '_3d.png'
  return `${BASE_URL}/${encodeURIComponent(name)}/3D/${file}`
}

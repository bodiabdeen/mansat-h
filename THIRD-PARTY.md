# Third-party assets

## Microsoft Fluent Emoji (3D)

- **Source**: https://github.com/microsoft/fluentui-emoji
- **License**: MIT
- **Usage**: icons throughout the app are rendered via `src/components/Icon.jsx`,
  which loads the "3D" style PNG for a given emoji from jsDelivr's GitHub CDN
  mirror of this repository (`cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/...`).
  No files from the repo are vendored into this codebase — they're loaded
  at runtime from the CDN. See `src/utils/icons.js` for the glyph → asset
  name mapping.

## Cairo (font)

- **Source**: Google Fonts (https://fonts.google.com/specimen/Cairo)
- **License**: SIL Open Font License 1.1
- **Usage**: site-wide typeface, loaded via a Google Fonts `<link>` in `index.html`.

## PROF | بروف logo

The graduation-cap mark and the full "بروف | PROF" lockup used across the
app (`public/logo-icon.png`, `public/logo-icon-transparent.png`) were
extracted from a brand board image supplied by the client's designer — not
independently authored. Ownership of the underlying design remains with
whoever commissioned/created that brand board.

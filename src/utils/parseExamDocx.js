import JSZip from 'jszip'

// Parses a .docx file exported from Word into structured MCQ questions.
//
// The source documents mark the correct choice by coloring its text red
// (EE0000) and often append a stray "100%" annotation after it (looks like
// leftover analytics from whatever tool generated the doc — not real
// content, so it's stripped). That same red is *also* used for section
// headers and for highlighting individual words inside reading passages, so
// "red run" alone isn't a reliable signal — it only means "correct answer"
// when it appears inside an actual choice list (i.e. after an أ/ب/ج/د
// marker). Reading-comprehension questions are frequently typed as one
// continuous paragraph (passage + question + choices, no line breaks), so a
// question that required guessing where the passage ends is flagged
// `needsReview` for a human to confirm.

function getRuns(paraXml) {
  const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs
  let m
  const out = []
  while ((m = runRegex.exec(paraXml)) !== null) {
    const run = m[1]
    const colorMatch = run.match(/<w:color w:val="([0-9A-Fa-f]{6}|auto)"/)
    const szMatch = run.match(/<w:sz w:val="(\d+)"/)
    const textMatches = [...run.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gs)]
    const text = textMatches.map(t => t[1]).join('')
    if (text) out.push({ text, color: colorMatch ? colorMatch[1].toUpperCase() : null, sz: szMatch ? Number(szMatch[1]) : null })
  }
  return out
}

function splitParagraphs(xml) {
  return xml.split('<w:p ').slice(1).map(p => '<w:p ' + p)
}

// Matches stray percentage annotations ("100%", "%99.6", "(100%)") and a
// lone "%" left behind once its number was already stripped as a separate token.
const PCT_NOISE = /^\(?\s*%?\s*\d+(\.\d+)?\s*%?\s*\)?$/

function clean(s) {
  return s
    .replace(/<\/?w:t[^>]*>/g, '')
    .replace(/\$/g, '')
    .split(/\s+/).filter(tok => tok !== '%' && tok !== '٪' && !PCT_NOISE.test(tok)).join(' ')
    .replace(/:::/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Plain "ا" is deliberately excluded from the marker set — it's too common a
// letter and causes false positives (e.g. "...أهميتها)" ends in "ا)").
// A single space before ")" or "-" is tolerated ("ب )", "أ - ..." are both
// real marker styles seen in these documents) but NOT before ".", since
// "<word ending in د/ب/ج/أ> ." matches the start of an ordinary sentence (or
// "....." filler dots) constantly in ordinary prose.
const OPTION_MARK_RE = /\(?[أبجد](?:\s?[)-]|\.)\s*/g

function isSectionHeader(runs) {
  if (runs.length === 0) return false
  return runs.every(r => r.sz === 50) && !runs.some(r => /[أبجد](?:\s?[)-]|\.)/.test(r.text))
}

function isPassageParagraph(runs) {
  return runs.some(r => r.color === '2F5496')
}

// >= 1, not >= 2 — some documents put every single choice on its own
// paragraph, so a paragraph carrying just one "أ)"-style marker still needs
// to be recognized and routed through the same option-parsing path (where
// the continuation-merge logic below stitches the four paragraphs back
// into one question).
function hasOptionMarkers(text) {
  const matches = text.match(OPTION_MARK_RE)
  return matches && matches.length >= 1
}

function firstMarkerChar(text) {
  const m = text.match(/[أبجد](?:\s?[)-]|\.)/)
  return m ? m[0][0] : null
}

function splitIntoOptions(runs) {
  const fullText = runs.map(r => r.text).join('')
  const markerRegex = /\(?[أبجد](?:\s?[)-]|\.)\s*/g
  const positions = []
  let m
  while ((m = markerRegex.exec(fullText)) !== null) {
    positions.push({ index: m.index, markerEnd: m.index + m[0].length })
  }
  if (positions.length < 1) return null

  const charColors = []
  runs.forEach(r => { for (let i = 0; i < r.text.length; i++) charColors.push(r.color) })

  const options = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].markerEnd
    const end = i + 1 < positions.length ? positions[i + 1].index : fullText.length
    const segment = fullText.slice(start, end)
    const segColors = charColors.slice(start, end)
    const hasRed = segColors.some(c => c === 'EE0000')
    options.push({ text: clean(segment), isCorrect: hasRed })
  }
  return { options, preText: fullText.slice(0, positions[0].index) }
}

// Fallback for choice lists with no letter markers at all — bare words or
// phrases separated by runs of 2+ spaces ("which word doesn't belong" style
// questions). Only tried when a stem is already pending.
function splitBareOptions(runs) {
  const fullText = runs.map(r => r.text).join('')
  const parts = fullText.split(/\s{2,}/).map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const charColors = []
  runs.forEach(r => { for (let i = 0; i < r.text.length; i++) charColors.push(r.color) })
  let cursor = 0
  const options = []
  for (const raw of parts) {
    const idx = fullText.indexOf(raw, cursor)
    const segColors = charColors.slice(idx, idx + raw.length)
    options.push({ text: clean(raw), isCorrect: segColors.some(c => c === 'EE0000') })
    cursor = idx + raw.length
  }
  return options
}

// Splits combined text (passage + embedded question, typed as one paragraph
// with no line break) at the LAST "<digits>. " marker — everything before is
// the passage, everything from there on is the question stem.
function splitPassageFromStem(preText) {
  const cleaned = clean(preText)
  const markers = [...cleaned.matchAll(/\d+\s?[.-]\s*/g)]
  if (markers.length > 0) {
    const last = markers[markers.length - 1]
    const passage = cleaned.slice(0, last.index).trim()
    const stem = cleaned.slice(last.index + last[0].length).trim()
    if (passage.length > 15) return { passage, stem }
  }
  return { passage: null, stem: cleaned.replace(/^\d+\s?[.-]\s*/, '') }
}

function parseDocumentXml(xml) {
  const paras = splitParagraphs(xml)
  const questions = []
  let currentSection = null
  let currentPassage = null
  let passageActive = false
  let pendingStem = null

  const pushQuestion = (options, preText) => {
    let stemText = preText.trim()
    let passageForQuestion = passageActive ? currentPassage : null
    let ambiguousSplit = false

    if (!stemText && pendingStem) {
      stemText = pendingStem
    } else if (stemText.length > 20) {
      const { passage, stem } = splitPassageFromStem(stemText)
      if (passage) {
        passageForQuestion = passage
        stemText = stem
        ambiguousSplit = true
      }
    }
    pendingStem = null

    const correctIndex = options.findIndex(o => o.isCorrect)
    questions.push({
      section: currentSection,
      passage: passageForQuestion,
      stem: clean(stemText).replace(/^\d+\s?[.-]\s*/, ''),
      options: options.map(o => o.text),
      correctIndex,
      needsReview: correctIndex === -1 || ambiguousSplit
    })
    passageActive = false
  }

  for (const p of paras) {
    const runs = getRuns(p)
    if (runs.length === 0) continue
    const fullText = runs.map(r => r.text).join('').trim()
    if (!fullText) continue

    if (isSectionHeader(runs)) {
      currentSection = clean(fullText)
      currentPassage = null
      passageActive = false
      pendingStem = null
      continue
    }

    if (isPassageParagraph(runs) && !hasOptionMarkers(fullText)) {
      currentPassage = (passageActive && currentPassage) ? currentPassage + '\n' + clean(fullText) : clean(fullText)
      passageActive = true
      continue
    }

    if (hasOptionMarkers(fullText)) {
      const split = splitIntoOptions(runs)
      if (!split) continue
      const { options, preText } = split
      const firstChar = firstMarkerChar(fullText)

      // Continuation paragraph (starts with ب/ج/د, not أ) — the choice list
      // wrapped across a paragraph break; merge into the previous question.
      const isContinuation = firstChar && firstChar !== 'أ' && questions.length > 0 && !preText.trim()
      if (isContinuation) {
        const prev = questions[questions.length - 1]
        options.forEach(o => {
          prev.options.push(o.text)
          if (o.isCorrect) prev.correctIndex = prev.options.length - 1
        })
        prev.needsReview = prev.correctIndex === -1
        continue
      }

      pushQuestion(options, preText)
      continue
    }

    // No letter markers — either a bare-word/whitespace-run choice list for
    // the current stem ("which word doesn't belong" style questions), or a
    // plain stem paragraph. Numbering ("1.", "9 .", or none at all) varies
    // between documents and even between sections of the same document, so
    // any such paragraph is accepted as the pending stem regardless of
    // whether it happens to start with a number.
    const bare = splitBareOptions(runs)
    if (bare && bare.length >= 2) {
      pushQuestion(bare, '')
      continue
    }
    pendingStem = clean(fullText)
  }
  return questions
}

// file: a File/Blob from an <input type="file"> element.
// Returns { questions, needsReviewCount }.
export async function parseExamDocx(file) {
  const zip = await JSZip.loadAsync(file)
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('not-a-docx')
  const xml = await entry.async('string')
  const questions = parseDocumentXml(xml)
  return { questions, needsReviewCount: questions.filter(q => q.needsReview).length }
}

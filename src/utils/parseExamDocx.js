// Intellectual Property of Riela Cyber Security Centre
import JSZip from 'jszip'

// Parses a .docx file exported from Word into structured MCQ questions.
//
// The source documents mark the correct choice by coloring its text red
// (EE0000) and often append a stray "100%" annotation after it (looks like
// leftover analytics from whatever tool generated the doc, not real
// content, so it's stripped). That same red is *also* used for section
// headers and for highlighting individual words inside reading passages, so
// "red run" alone isn't a reliable signal: it only means "correct answer"
// when it appears inside an actual choice list (i.e. after an أ/ب/ج/د
// marker).
//
// Layout conventions the documents follow (not all of them in every file):
//   * choices are separated by Word tab characters, not spaces;
//   * question stems are purple (8064A2) and/or numbered ("9. ...");
//   * reading passages are blue (365F91) or plain long paragraphs, always
//     placed BEFORE the first question that uses them, and shared by the
//     questions after it until the next passage or section;
//   * "قطعة ..." lines are passage titles; "نص آخر" / "مختبر آخر" / "صيغة
//     أخرى" introduce alternative wordings of the same passage, which are
//     dropped so they don't get glued onto the real text.
// Reading-comprehension questions are sometimes typed as one continuous
// paragraph (passage + question + choices), so a question that required
// guessing where the passage ends is flagged `needsReview`.

const STEM_COLOR = '8064A2'
const PASSAGE_COLORS = ['365F91', '2F5496']
const CORRECT_COLOR = 'EE0000'

function getRuns(paraXml) {
  const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs
  let m
  const out = []
  while ((m = runRegex.exec(paraXml)) !== null) {
    // Choices are usually separated by Word tab characters / line breaks,
    // which carry no <w:t> text; turn them into real whitespace so words
    // don't fuse together.
    const run = m[1]
      .replace(/<w:tab\/>/g, '<w:t xml:space="preserve">    </w:t>')
      .replace(/<w:br\b[^>]*\/>/g, '<w:t xml:space="preserve">\n</w:t>')
    const colorMatch = run.match(/<w:color w:val="([0-9A-Fa-f]{6}|auto)"/)
    const szMatch = run.match(/<w:sz w:val="(\d+)"/)
    const textMatches = [...run.matchAll(/<w:t(?: [^>]*)?>(.*?)<\/w:t>/gs)]
    const text = textMatches.map(t => t[1]).join('')
    if (text) out.push({ text, color: colorMatch ? colorMatch[1].toUpperCase() : null, sz: szMatch ? Number(szMatch[1]) : null })
  }
  return out
}

function splitParagraphs(xml) {
  return xml.split('<w:p ').slice(1).map(p => '<w:p ' + p)
}

// Stray analytics annotations glued after the correct choice: "100%", "99.6%",
// "%99.6", "100 %", or several fused together ("100100%100%100%%"). Only the
// annotation values (100 / 99.x) are removed: real percentages used as
// answers ("20 %", "7%") are kept.
const NOISE_RUN = /(?:100|99(?:[.,]\d+)?)+(?:\s*[%٪])+(?:\s*(?:100|99(?:[.,]\d+)?)*(?:\s*[%٪])*)*|[%٪]\s*99(?:[.,]\d+)?/g

function stripNoiseTokens(s) {
  const toks = s.replace(NOISE_RUN, ' ').split(/\s+/).filter(Boolean)
  // A "%" left on its own is only meaningful right after a number ("20 %").
  return toks.filter((t, i) => !((t === '%' || t === '٪') && !/\d$/.test(toks[i - 1] || ''))).join(' ')
}

function clean(s) {
  return stripNoiseTokens(s.replace(/<\/?w:t[^>]*>/g, '').replace(/[$@]/g, ''))
    .replace(/:::/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Plain "ا" is deliberately excluded from the marker set: it's too common a
// letter and causes false positives (e.g. "...أهميتها)" ends in "ا)").
// A single space before ")" or "-" is tolerated ("ب )", "أ - ..." are both
// real marker styles seen in these documents) but NOT before ".", since
// "<word ending in د/ب/ج/أ> ." matches the start of an ordinary sentence (or
// "....." filler dots) constantly in ordinary prose. The marker must also not
// directly follow an Arabic letter: "القلب )" ends a word, it isn't "ب )".
const MARK = String.raw`(?<![ء-ي])\(?[أبجد](?:\s?[)-]|\s?\.(?!\.))\s*`
const OPTION_MARK_TEST = new RegExp(String.raw`(?<![ء-ي])[أبجد](?:\s?[)-]|\s?\.(?!\.))`)

function isSectionHeader(runs) {
  if (runs.length === 0) return false
  return runs.every(r => r.sz === 50) && !runs.some(r => OPTION_MARK_TEST.test(r.text))
}

// >= 1, not >= 2: some documents put every single choice on its own
// paragraph, so a paragraph carrying just one "أ)"-style marker still needs
// to be recognized and routed through the same option-parsing path (where
// the continuation-merge logic below stitches the four paragraphs back
// into one question).
// Choice markers in a paragraph. A "د )" that sits inside an unclosed
// parenthesis is the end of a parenthetical ("... فيتامين د )"), not a marker.
function findMarkers(text) {
  const re = new RegExp(MARK, 'g')
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    // Only look inside the current choice, and never reject an "أ" (a list
    // always starts there, whatever unbalanced bracket the stem has).
    const isFirstLetter = m[0].replace('(', '')[0] === 'أ'
    const before = text.slice(out.length ? out[out.length - 1].markerEnd : 0, m.index)
    const depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length
    // Only the spaced form ("د )") is ambiguous; "د)" is always a marker.
    if (!isFirstLetter && depth > 0 && /^[أبجد]\s\)/.test(m[0])) continue
    out.push({ index: m.index, markerEnd: m.index + m[0].length })
  }
  return out
}

function hasOptionMarkers(text) {
  return findMarkers(text).length >= 1
}

function firstMarkerChar(text) {
  const first = findMarkers(text)[0]
  return first ? text.slice(first.index, first.markerEnd).replace('(', '')[0] : null
}

function splitIntoOptions(runs) {
  const fullText = runs.map(r => r.text).join('')
  const positions = findMarkers(fullText)
  if (positions.length < 1) return null

  // A stem can itself contain something that looks like a marker ("... (ب)..").
  // If an "أ" marker exists, the list starts there.
  const markerChar = p => fullText.slice(p.index, p.markerEnd).replace('(', '')[0]
  const firstA = positions.findIndex(p => markerChar(p) === 'أ')
  if (firstA > 0) positions.splice(0, firstA)

  const charColors = []
  runs.forEach(r => { for (let i = 0; i < r.text.length; i++) charColors.push(r.color) })

  const options = []
  let trailingStem = ''
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].markerEnd
    let end = i + 1 < positions.length ? positions[i + 1].index : fullText.length
    // The last choice can run straight into the NEXT question's stem (purple
    // text) when the paragraph break was lost; cut it off there.
    if (i === positions.length - 1) {
      let cut = -1
      for (let k = start; k < end; k++) {
        if (charColors[k] === STEM_COLOR && /\S/.test(fullText[k]) && /\S/.test(fullText.slice(start, k))) { cut = k; break }
      }
      if (cut !== -1) { trailingStem = fullText.slice(cut, end); end = cut }
    }
    const segment = fullText.slice(start, end)
    // Whitespace-only red runs are formatting leftovers, not a correct mark.
    const hasRed = [...segment].some((ch, k) => charColors[start + k] === CORRECT_COLOR && /\S/.test(ch))
    options.push({ text: clean(segment), isCorrect: hasRed })
  }
  return { options, preText: fullText.slice(0, positions[0].index), trailingStem: trailingStem.trim() }
}

// Fallback for choice lists with no letter markers at all: bare words or
// phrases separated by runs of 2+ spaces ("which word doesn't belong" style
// questions). Only tried for short, list-like paragraphs.
function splitBareOptions(runs, numberedOrStem = false) {
  // A stray "$" after a stem ("... ......   $") must not count as a second choice.
  const fullText = runs.map(r => r.text).join('').replace(/\s*\$\s*$/, '')
  const parts = fullText.split(/\s{2,}/).map(s => s.trim()).filter(Boolean)
  if (parts.length < 2 || parts.some(p => p.length > 40)) return null
  // A numbered/purple paragraph is only a choice list when it clearly is one
  // ("3. حرير   طاقية   عمامة   ثوب"): 3+ short parts, no blanks or colons that
  // would make it a stem like "6. القلق لا يسلب ..... بل يسلب ....." .
  if (numberedOrStem && (parts.length < 3 || parts.some(p => p.length > 30 || /\.\.|:/.test(p)))) return null

  const charColors = []
  runs.forEach(r => { for (let i = 0; i < r.text.length; i++) charColors.push(r.color) })
  let cursor = 0
  const options = []
  for (const raw of parts) {
    const idx = fullText.indexOf(raw, cursor)
    const segColors = charColors.slice(idx, idx + raw.length)
    options.push({
      text: clean(raw).replace(options.length === 0 ? /^\d+\s?[.-]\s*/ : /^$/, ''),
      isCorrect: [...raw].some((ch, k) => segColors[k] === CORRECT_COLOR && /\S/.test(ch))
    })
    cursor = idx + raw.length
  }
  return options
}

// Splits combined text (passage + embedded question, typed as one paragraph
// with no line break) at the LAST "<digits>. " marker: everything before is
// the passage, everything from there on is the question stem.
function splitPassageFromStem(preText) {
  const cleaned = clean(preText)
  // Only a number that follows the end of a sentence counts as a question
  // number ("... النص. 9. ما ..."); "34 - 41" inside a stem does not.
  const markers = [...cleaned.matchAll(/(?<=[.؟?!:]\s*)\d{1,2}\s?[.-]\s+(?=\S)/g)]
  if (markers.length > 0) {
    const last = markers[markers.length - 1]
    const passage = cleaned.slice(0, last.index).trim()
    const stem = cleaned.slice(last.index + last[0].length).trim()
    if (passage.length >= MIN_PASSAGE_LEN) return { passage, stem }
  }
  return { passage: null, stem: cleaned.replace(/^\d+\s?[.-]\s*/, '') }
}

const PASSAGE_TITLE_RE = /^قطعة(\s|$)/
// A line that is only a passage heading ("قطعة X", "الزعفران (1) :::").
const TITLE_LINE_RE = /^قطعة(\s|$)|:::\s*$/
// Alternative wording of a passage/question ("another version"). Dropped.
const ALT_LABEL_RE = /^(نص|مختبر|صيغة)\s+(آخر|اخر|أخرى|اخرى)|^نص مشابه/
// "( صيغة مشابهة )" on the first line of a paragraph also marks an alternative.
const ALT_PAREN_RE = /\(\s*(نص|صيغة|مختبر)\s+(مشابه|مشابهة|آخر|اخر|أخرى|اخرى)\s*\)/
// "القسم الأول في الاختبار", "2.القسم الثاني ..." : a label, not a question.
const SECTION_LABEL_RE = /^\d*\s?[.-]?\s*القسم\s+\S+\s+(في|من)\s+الاختبار/
const NUMBERED_STEM_RE = /^\d+\s?[.-]/
const MIN_PASSAGE_LEN = 60
const ODD_ONE_OUT_STEM = 'ما الكلمة المختلفة؟'

// What a non-choice paragraph is, so the block of paragraphs sitting in front
// of a choice list can be split into passage / stem:
//   alt      alternative wording, ignored
//   passage  blue text
//   stem     purple text or a numbered line
//   plain    long unformatted prose (a passage in documents with no colours)
//   short    anything else (headings, labels)
function classify(runs, text) {
  const body = text.trim()
  const firstLine = body.split('\n')[0]
  if (ALT_LABEL_RE.test(body) || (firstLine.length <= 60 && ALT_PAREN_RE.test(firstLine))) return 'alt'
  if (SECTION_LABEL_RE.test(body)) return 'short'
  if (runs.some(r => PASSAGE_COLORS.includes(r.color))) return 'passage'
  if (runs.some(r => r.color === STEM_COLOR) || NUMBERED_STEM_RE.test(body)) return 'stem'
  if (/^\(/.test(body) && !/^\(\d+\)/.test(body)) return 'alt'
  return body.length >= MIN_PASSAGE_LEN ? 'plain' : 'short'
}

// Runs covering only the text from character offset `from` onwards.
function sliceRuns(runs, from) {
  const out = []
  let pos = 0
  for (const r of runs) {
    const end = pos + r.text.length
    if (end > from) out.push({ ...r, text: r.text.slice(Math.max(0, from - pos)) })
    pos = end
  }
  return out
}

function parseDocumentXml(xml) {
  const paras = splitParagraphs(xml)
  const questions = []
  let currentSection = null
  let currentPassage = null
  // Non-choice paragraphs seen since the last question, oldest first.
  let block = []
  // True after a lone "نص آخر"-style label: the passage text that follows is
  // an alternative version and is skipped until the next stem / choices.
  let skippingAlt = false

  // Turn the pending block (+ any stem typed inline with the choices) into a
  // stem, and update the passage shared with the questions that follow.
  const resolveBlock = (inlineStem) => {
    const items = block.filter(b => b.kind !== 'alt')
    let stem = ''
    let passageItems = []
    if (inlineStem && inlineStem.trim()) {
      stem = inlineStem
      passageItems = items
    } else if (items.length > 0) {
      let i = -1
      for (let k = items.length - 1; k >= 0; k--) if (items[k].kind === 'stem') { i = k; break }
      if (i >= 0) {
        // First paragraph of the trailing run of stem paragraphs; later ones
        // are alternative wordings.
        while (i > 0 && items[i - 1].kind === 'stem') i--
        stem = items[i].text
        passageItems = items.slice(0, i)
        // A long stem earlier in the block with no choices of its own: the
        // question's choices were lost in the source. Keep it for review.
        passageItems.forEach(b => { if (b.kind === 'stem' && clean(b.text).length >= 25) orphanStems.push(b.text) })
      } else if (items.some(b => b.kind === 'passage' || b.kind === 'plain')) {
        passageItems = items // no stem at all: everything is passage text
      } else {
        stem = items[items.length - 1].text
      }
    }
    // Short lines that sit after the first passage paragraph are passage text
    // too ("وهذا المهرجان يقام منذ عقد من الزمن"); before it they are headings.
    const firstPassage = passageItems.findIndex(b => b.kind === 'passage' || b.kind === 'plain')
    const texts = passageItems.filter((b, k) => b.kind === 'passage' || b.kind === 'plain' || (b.kind === 'short' && firstPassage !== -1 && k > firstPassage)).map(b => clean(b.text.split('\n').filter(l => !TITLE_LINE_RE.test(l.trim())).join(' '))).filter(Boolean)
    if (texts.length > 0) currentPassage = texts.join('\n')
    else if (NUMBERED_STEM_RE.test(clean(stem)) && /^1\s?[.-]/.test(clean(stem))) currentPassage = null
    return stem
  }

  const orphanStems = []
  const pushQuestion = (options, inlineStem, bare) => {
    orphanStems.length = 0
    let stemText = resolveBlock(inlineStem).trim()
    orphanStems.forEach(o => questions.push({
      section: currentSection, passage: currentPassage, stem: clean(o).replace(/^\d+\s?[.-]\s*/, ''),
      options: ['', '', '', ''], correctIndex: -1, needsReview: true
    }))
    let passageForQuestion = currentPassage
    let ambiguousSplit = false

    if (inlineStem && stemText.length > 20) {
      // Title, passage, stem and choices typed as ONE paragraph, separated by
      // line breaks: the last line is the stem, the lines before it (minus
      // title lines) are the passage.
      const lines = stemText.split('\n').map(s => s.trim()).filter(Boolean)
      if (lines.length > 1) {
        const body = lines.slice(0, -1).filter(l => !TITLE_LINE_RE.test(l))
        stemText = lines[lines.length - 1]
        if (body.length > 0) currentPassage = passageForQuestion = body.map(clean).filter(Boolean).join('\n')
      } else {
        const { passage, stem } = splitPassageFromStem(stemText)
        if (passage) {
          currentPassage = passageForQuestion = passage
          stemText = stem
          ambiguousSplit = true
        }
      }
    }
    block = []
    skippingAlt = false

    stemText = clean(stemText).replace(/^\d+\s?[.-]\s*/, '')
    if (!stemText && bare) stemText = ODD_ONE_OUT_STEM

    const correctCount = options.filter(o => o.isCorrect).length
    const correctIndex = options.findIndex(o => o.isCorrect)
    questions.push({
      section: currentSection,
      passage: passageForQuestion,
      stem: stemText,
      options: options.map(o => o.text),
      correctIndex,
      needsReview: correctIndex === -1 || correctCount > 1 || ambiguousSplit || !stemText ||
        options.length !== 4 || options.some(o => !o.text)
    })
  }

  for (const p of paras) {
    let runs = getRuns(p)
    if (runs.length === 0) continue
    let fullText = runs.map(r => r.text).join('').trim()
    if (!fullText) continue

    if (isSectionHeader(runs)) {
      currentSection = clean(fullText)
      currentPassage = null
      block = []
      skippingAlt = false
      continue
    }

    // "قطعة X" title, optionally with the passage on the next line of the
    // same paragraph: the title is dropped and a new passage begins.
    if (PASSAGE_TITLE_RE.test(fullText)) {
      currentPassage = null
      block = []
      skippingAlt = false
      const nl = runs.map(r => r.text).join('').indexOf('\n')
      // Carry on with whatever follows the title line (passage text, and
      // sometimes the stem and choices too) as if it were its own paragraph.
      let rest = nl === -1 ? [] : sliceRuns(runs, nl + 1)
      // Title and passage fused in one paragraph, told apart only by run.
      if (!rest.map(r => r.text).join('').trim() && runs.length >= 2 && /^قطعة/.test(runs[0].text.trim())) rest = runs.slice(1)
      runs = rest
      fullText = runs.map(r => r.text).join('').trim()
      if (!fullText) continue
    } else if (!hasOptionMarkers(fullText) && runs.length >= 2) {
      // An un-prefixed heading fused with its passage ("فيتامين د" + text): a
      // short first run, with no sentence punctuation, then long prose.
      const head = runs[0].text.trim()
      const tail = runs.slice(1).map(r => r.text).join('').replace(/\s+/g, ' ').trim()
      if (head.length > 0 && head.length <= 40 && tail.length >= MIN_PASSAGE_LEN && !/^[(\d]/.test(head) &&
          !/[.،؛:؟!)]$/.test(head) && !runs[0].color) {
        currentPassage = null
        block = []
        skippingAlt = false
        runs = runs.slice(1)
        fullText = tail
      }
    }

    if (hasOptionMarkers(fullText)) {
      const split = splitIntoOptions(runs)
      if (!split) continue
      const { options, preText, trailingStem } = split
      const firstChar = firstMarkerChar(fullText)

      // Continuation paragraph (starts with ب/ج/د, not أ): the choice list
      // wrapped across a paragraph break; merge into the previous question.
      const isContinuation = firstChar && firstChar !== 'أ' && questions.length > 0 && !preText.trim() && block.length === 0
      if (isContinuation) {
        const prev = questions[questions.length - 1]
        options.forEach(o => {
          prev.options.push(o.text)
          if (o.isCorrect) prev.correctIndex = prev.options.length - 1
        })
        const redCount = prev.correctIndex === -1 ? 0 : 1
        prev.needsReview = redCount === 0 || prev.options.length !== 4 || prev.options.some(o => !o)
        continue
      }

      pushQuestion(options, preText, false)
      if (trailingStem) block.push({ kind: 'stem', text: trailingStem })
      continue
    }

    // No letter markers: either a bare-word/whitespace-run choice list for
    // the current stem ("which word doesn't belong" style questions), or a
    // plain stem/passage paragraph.
    const kind = classify(runs, fullText)

    // "ما الكلمة المختلفة ؟" typed with its choice words on the next line of
    // the same paragraph: first line is the stem, the rest the choices.
    const nl = fullText.indexOf('\n')
    if (kind === 'stem' && nl !== -1) {
      const restRuns = sliceRuns(runs, runs.map(r => r.text).join('').indexOf('\n') + 1)
      const restBare = splitBareOptions(restRuns)
      if (restBare && restBare.length >= 3) {
        block.push({ kind: 'stem', text: fullText.slice(0, nl) })
        pushQuestion(restBare, '', true)
        continue
      }
    }

    const bare = kind === 'passage' ? null : splitBareOptions(runs, kind === 'stem')
    if (bare && bare.length >= 2) {
      pushQuestion(bare, '', true)
      continue
    }

    if (kind === 'short' && ALT_LABEL_RE.test(fullText)) { skippingAlt = true; continue }
    if (kind === 'alt') {
      // A label standing alone also makes the paragraphs after it alternatives.
      if (fullText.trim().length < MIN_PASSAGE_LEN) skippingAlt = true
      continue
    }
    if (skippingAlt && kind !== 'stem') continue
    if (kind === 'stem') skippingAlt = false
    block.push({ kind, text: fullText })
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

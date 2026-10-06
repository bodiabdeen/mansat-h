import { useEffect, useRef, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import Icon from './Icon'

const DURATION_SECONDS = 60 * 60

const labels = {
  ar: {
    loading: 'جارٍ تحميل الاختبار...', loadFailed: 'تعذّر تحميل الاختبار. حاول مرة أخرى.',
    question: 'سؤال', of: 'من', prev: 'السابق', next: 'التالي', submit: 'تسليم الاختبار',
    submitConfirm: 'لديك أسئلة لم تُجب عليها. هل تريد تسليم الاختبار الآن؟',
    unanswered: 'بدون إجابة', back: 'رجوع', timeLeft: 'الوقت المتبقي',
    timeUp: 'انتهى الوقت — تم تسليم الاختبار تلقائياً',
    yourScore: 'نتيجتك', outOf: 'من', review: 'مراجعة الإجابات',
    yourAnswer: 'إجابتك', correctAnswer: 'الإجابة الصحيحة', doneBtn: 'إنهاء',
    reportOnceNote: 'يمكنك رؤية هذا التقرير التفصيلي الآن فقط — بعد الضغط على "إنهاء" لن يظهر مرة أخرى.'
  },
  en: {
    loading: 'Loading exam...', loadFailed: 'Could not load the exam. Please try again.',
    question: 'Question', of: 'of', prev: 'Previous', next: 'Next', submit: 'Submit Exam',
    submitConfirm: 'You have unanswered questions. Submit the exam now?',
    unanswered: 'Not answered', back: 'Back', timeLeft: 'Time Left',
    timeUp: "Time's up — the exam was submitted automatically",
    yourScore: 'Your Score', outOf: 'out of', review: 'Answer Review',
    yourAnswer: 'Your answer', correctAnswer: 'Correct answer', doneBtn: 'Done',
    reportOnceNote: 'You can see this detailed report now only — once you click "Done" it will not be shown again.'
  }
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TakeExam({ lang, examId, examTitle, onDone }) {
  const l = labels[lang]
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [remaining, setRemaining] = useState(DURATION_SECONDS)
  const startedAtRef = useRef(null)
  const submittedRef = useRef(false)
  const storageKey = `examStart_${auth.currentUser.uid}_${examId}`

  const selectAnswer = (idx) => {
    setAnswers(prev => prev.map((a, i) => i === current ? idx : a))
  }

  const submit = async (auto = false) => {
    if (submittedRef.current) return
    if (!auto) {
      const unanswered = answers.filter(a => a === null).length
      if (unanswered > 0 && !window.confirm(l.submitConfirm)) return
    }
    submittedRef.current = true
    setSubmitting(true)
    try {
      const review = questions.map((q, i) => ({
        passage: q.passage || null,
        stem: q.stem,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: answers[i] === null || answers[i] === undefined ? -1 : answers[i]
      }))
      const score = review.filter(r => r.selectedIndex === r.correctIndex).length
      const attempt = {
        examId, examTitle, studentId: auth.currentUser.uid,
        score, total: questions.length, review, submittedAt: new Date()
      }
      await addDoc(collection(db, 'examAttempts'), attempt)
      await updateDoc(doc(db, 'examPurchases', `${auth.currentUser.uid}_${examId}`), {
        attemptsUsed: increment(1)
      })
      localStorage.removeItem(storageKey)
      setResult(attempt)
    } catch (e) {
      submittedRef.current = false
      alert(l.loadFailed)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'examContent', examId))
        if (!snap.exists()) { setError(l.loadFailed); return }
        const qs = snap.data().questions || []
        setQuestions(qs)
        setAnswers(new Array(qs.length).fill(null))
      } catch (e) {
        setError(l.loadFailed)
      }
    }
    fetch()
  }, [examId])

  // Timer starts the moment the exam is ready, and survives a page refresh —
  // stored locally so reloading doesn't grant extra time (matches a real,
  // proctored exam where the clock keeps running regardless).
  useEffect(() => {
    if (!questions) return
    const stored = Number(localStorage.getItem(storageKey))
    const now = Date.now()
    const startedAt = (stored && now - stored < DURATION_SECONDS * 1000) ? stored : now
    if (startedAt === now) localStorage.setItem(storageKey, String(now))
    startedAtRef.current = startedAt

    const tick = () => {
      const left = Math.max(0, DURATION_SECONDS - Math.floor((Date.now() - startedAtRef.current) / 1000))
      setRemaining(left)
      if (left === 0 && !submittedRef.current) {
        setTimedOut(true)
        submit(true)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions])

  if (error) return <p className="text-center text-red-500 py-8">{error}</p>
  if (!questions) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin"><Icon e="📝" className="w-10 h-10 inline-block" /></div>
    </div>
  )

  if (result) return <ExamReport lang={lang} attempt={result} onDone={onDone} timedOut={timedOut} />

  const q = questions[current]
  const urgent = remaining <= 5 * 60

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{l.question} {current + 1} {l.of} {questions.length}</span>
        <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full font-mono
          ${urgent ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300' : 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'}`}>
          <Icon e="⏱" className="w-4 h-4 inline-block align-[-0.2em]" /> {formatClock(remaining)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition
              ${i === current ? 'bg-indigo-600 text-white' : answers[i] !== null ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        {q.passage && (
          <p className="text-sm bg-indigo-50 dark:bg-indigo-900/40 text-gray-700 dark:text-gray-200 rounded-xl p-3 whitespace-pre-line">
            {q.passage}
          </p>
        )}
        <p className="font-bold text-gray-800 dark:text-white">{q.stem}</p>

        <div className="space-y-2">
          {q.options.map((opt, oi) => (
            <label key={oi}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
                ${answers[current] === oi
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'}`}>
              <input type="radio" name={`q-${current}`} checked={answers[current] === oi}
                onChange={() => selectAnswer(oi)} className="accent-indigo-600" />
              <span className="text-sm dark:text-white">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40 transition">
          {l.prev}
        </button>
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition">
            {l.next}
          </button>
        ) : (
          <button onClick={() => submit(false)} disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-indigo-900 disabled:opacity-50 hover:opacity-90 transition">
            {submitting ? '...' : l.submit}
          </button>
        )}
      </div>
    </div>
  )
}

export function ExamReport({ lang, attempt, onDone, timedOut }) {
  const l = labels[lang]
  const percent = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0

  return (
    <div className="space-y-4">
      {timedOut && (
        <p className="text-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 rounded-lg py-2">
          <Icon e="⏰" className="w-4 h-4 inline-block align-[-0.2em]" /> {l.timeUp}
        </p>
      )}

      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 rounded-2xl p-6 text-center text-white">
        <div className="absolute -top-8 -end-8 w-32 h-32 rounded-full bg-gold-400/35 blur-2xl pointer-events-none" />
        <p className="relative text-4xl font-bold text-gold-300">{attempt.score} / {attempt.total}</p>
        <p className="relative text-indigo-100 opacity-90 mt-1">{l.yourScore} — {percent}%</p>
      </div>

      <p className="text-xs text-gold-700 dark:text-gold-400 bg-gold-50 dark:bg-gold-700/20 rounded-lg px-3 py-2">
        <Icon e="⚠️" className="w-4 h-4 inline-block align-[-0.2em]" /> {l.reportOnceNote}
      </p>

      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.review}</p>

      <div className="space-y-3">
        {attempt.review.map((r, i) => {
          const isCorrect = r.selectedIndex === r.correctIndex
          return (
            <div key={i} className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2 border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
              {r.passage && (
                <p className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg p-2 whitespace-pre-line">{r.passage}</p>
              )}
              <p className="font-medium text-sm text-gray-800 dark:text-white">{i + 1}. {r.stem}</p>
              <div className="space-y-1">
                {r.options.map((opt, oi) => {
                  const isSelected = oi === r.selectedIndex
                  const isRightAnswer = oi === r.correctIndex
                  return (
                    <div key={oi}
                      className={`text-sm rounded-lg px-3 py-1.5 flex items-center gap-2
                        ${isRightAnswer ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : isSelected ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300'
                          : 'text-gray-500 dark:text-gray-400'}`}>
                      {isRightAnswer
                        ? <Icon e="✅" className="w-4 h-4 inline-block shrink-0" />
                        : isSelected
                        ? <Icon e="❌" className="w-4 h-4 inline-block shrink-0" />
                        : <span className="w-4 shrink-0" />}
                      <span>{opt}</span>
                    </div>
                  )
                })}
                {r.selectedIndex === -1 && (
                  <p className="text-xs text-gray-400 italic">{l.unanswered}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onDone}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold transition">
        {l.doneBtn}
      </button>
    </div>
  )
}

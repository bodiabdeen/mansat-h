import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore'
import TakeExam from '../../components/TakeExam'
import PageHero from '../../components/PageHero'
import Icon from '../../components/Icon'

const MAX_ATTEMPTS = 5

const labels = {
  ar: {
    title: 'الاختبارات', body: 'اختبارات تفاعلية — اشترِ اختباراً وابدأ فوراً بعد التفعيل',
    noExams: 'لا توجد اختبارات متاحة بعد', purchase: 'شراء الاختبار',
    pending: 'بانتظار الموافقة', startExam: 'ابدأ الاختبار', retakeExam: 'إعادة المحاولة',
    buyAgain: 'اشترِ مرة أخرى', attemptsLabel: 'المحاولات', lastScore: 'آخر نتيجة',
    attemptsExhausted: 'استُهلكت كل المحاولات — اشترِ الاختبار مرة أخرى للمتابعة',
    purchaseConfirm: 'سيتم إرسال طلب شراء هذا الاختبار، وسيقوم أحد المسؤولين بتأكيده. هل تريد المتابعة؟',
    purchaseFailed: 'فشل إرسال الطلب. حاول مرة أخرى.\n\n', questions: 'سؤال'
  },
  en: {
    title: 'Exams', body: 'Interactive exams — purchase one and start right after it is activated',
    noExams: 'No exams available yet', purchase: 'Purchase Exam',
    pending: 'Awaiting approval', startExam: 'Start Exam', retakeExam: 'Retake Exam',
    buyAgain: 'Buy Again', attemptsLabel: 'Attempts', lastScore: 'Last score',
    attemptsExhausted: 'All attempts used up — buy the exam again to continue',
    purchaseConfirm: 'This will send a purchase request for this exam; an admin will confirm it. Continue?',
    purchaseFailed: 'Could not send the request. Try again.\n\n', questions: 'questions'
  }
}

export default function Exams({ lang }) {
  const l = labels[lang]
  const [exams, setExams] = useState([])
  const [purchases, setPurchases] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState(null) // { mode: 'take', examId, examTitle }

  const fetchData = async () => {
    const uid = auth.currentUser.uid
    const [examSnap, purchaseSnap, attemptSnap] = await Promise.all([
      getDocs(collection(db, 'exams')),
      getDocs(query(collection(db, 'examPurchases'), where('studentId', '==', uid))),
      getDocs(query(collection(db, 'examAttempts'), where('studentId', '==', uid)))
    ])
    setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setPurchases(purchaseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setAttempts(attemptSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const purchase = async (exam) => {
    if (!window.confirm(l.purchaseConfirm)) return
    setLoading(true)
    try {
      const uid = auth.currentUser.uid
      await setDoc(doc(db, 'examPurchases', `${uid}_${exam.id}`), {
        examId: exam.id, examTitle: exam.title, price: exam.price, currency: exam.currency || 'SAR',
        studentId: uid, status: 'pending_approval', attemptsUsed: 0, requestedAt: new Date()
      })
      await fetchData()
    } catch (err) {
      alert(l.purchaseFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const closeView = async () => {
    setView(null)
    await fetchData()
  }

  if (view?.mode === 'take') {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <PageHero icon="📝" title={view.examTitle} />
        <TakeExam lang={lang} examId={view.examId} examTitle={view.examTitle} onDone={closeView} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHero icon="📝" title={l.title} subtitle={l.body} />

      {exams.length === 0 && <p className="text-center text-gray-400">{l.noExams}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {exams.map(exam => {
          const myPurchase = purchases.find(p => p.examId === exam.id)
          const myAttempt = attempts
            .filter(a => a.examId === exam.id)
            .sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0))[0]
          const attemptsUsed = myPurchase?.attemptsUsed || 0
          const exhausted = attemptsUsed >= MAX_ATTEMPTS

          return (
            <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
              <p className="font-bold text-gray-800 dark:text-white">{exam.title}</p>
              {exam.description && <p className="text-sm text-gray-500 dark:text-gray-400">{exam.description}</p>}
              <p className="text-xs text-gray-400">
                {exam.questionCount || 0} {l.questions} — <span className="font-bold text-gold-600 dark:text-gold-400">{exam.price} {exam.currency}</span>
              </p>

              {myAttempt && myPurchase?.status === 'active' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {l.lastScore}: <span className="font-semibold text-gray-700 dark:text-gray-200">{myAttempt.score}/{myAttempt.total}</span>
                  {' · '}{l.attemptsLabel}: {attemptsUsed}/{MAX_ATTEMPTS}
                </p>
              )}

              {!myPurchase || myPurchase.status === 'rejected' ? (
                <button onClick={() => purchase(exam)} disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-semibold transition">
                  {l.purchase}
                </button>
              ) : myPurchase.status === 'pending_approval' ? (
                <span className="block text-center text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900 rounded-lg py-2">
                  <Icon e="⏳" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.pending}
                </span>
              ) : exhausted ? (
                <>
                  <p className="text-xs text-red-500 dark:text-red-400">{l.attemptsExhausted}</p>
                  <button onClick={() => purchase(exam)} disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-semibold transition">
                    {l.buyAgain}
                  </button>
                </>
              ) : (
                <button onClick={() => setView({ mode: 'take', examId: exam.id, examTitle: exam.title })}
                  className="w-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-indigo-900 text-sm py-2 rounded-lg font-bold transition hover:opacity-90">
                  {myAttempt ? l.retakeExam : l.startExam}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

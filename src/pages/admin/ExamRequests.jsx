import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'طلبات شراء الاختبارات', pending: 'قيد الانتظار', active: 'مفعّلة',
    noPending: 'لا توجد طلبات معلقة', noActive: 'لا توجد اختبارات مفعّلة بعد',
    student: 'الطالب', approve: 'موافقة وتفعيل', reject: 'رفض',
    saveFailed: 'فشلت العملية. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Exam Purchase Requests', pending: 'Pending', active: 'Active',
    noPending: 'No pending requests', noActive: 'No active exams yet',
    student: 'Student', approve: 'Approve & Activate', reject: 'Reject',
    saveFailed: 'Action failed. Try again.\n\n'
  }
}

export default function ExamRequests({ lang }) {
  const l = labels[lang]
  const [pending, setPending] = useState([])
  const [active, setActive] = useState([])
  const [loading, setLoading] = useState(false)

  const enrich = async (list) => Promise.all(list.map(async ep => {
    const data = { ...ep }
    try {
      const studentSnap = await getDoc(doc(db, 'users', ep.studentId))
      data.studentName = studentSnap.exists() ? studentSnap.data().name : ''
    } catch (e) {
      data.studentName = ''
    }
    return data
  }))

  const fetchData = async () => {
    try {
      const [pendingSnap, activeSnap] = await Promise.all([
        getDocs(query(collection(db, 'examPurchases'), where('status', '==', 'pending_approval'))),
        getDocs(query(collection(db, 'examPurchases'), where('status', '==', 'active')))
      ])
      setPending(await enrich(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }))))
      setActive(await enrich(activeSnap.docs.map(d => ({ id: d.id, ...d.data() }))))
    } catch (err) {
      alert(l.saveFailed + err.message)
    }
  }

  useEffect(() => { fetchData() }, [])

  const approve = async (ep) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, 'examPurchases', ep.id), {
        status: 'active', approvedBy: auth.currentUser.uid, approvedAt: new Date()
      })
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const reject = async (ep) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, 'examPurchases', ep.id), { status: 'rejected' })
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📝" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.pending}
        </p>
        {pending.length === 0 && <p className="text-center text-gray-400">{l.noPending}</p>}
        {pending.map(ep => (
          <div key={ep.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{ep.examTitle}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <Icon e="👨‍🎓" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.student}: {ep.studentName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{ep.price} {ep.currency}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => approve(ep)} disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-semibold transition">
                <Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.approve}
              </button>
              <button onClick={() => reject(ep)} disabled={loading}
                className="text-red-400 hover:text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200 hover:border-red-400 transition">
                {l.reject}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.active}
        </p>
        {active.length === 0 && <p className="text-center text-gray-400">{l.noActive}</p>}
        {active.map(ep => (
          <div key={ep.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium dark:text-white">{ep.examTitle}</p>
              <p className="text-xs text-gray-400">{ep.studentName}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{ep.price} {ep.currency}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

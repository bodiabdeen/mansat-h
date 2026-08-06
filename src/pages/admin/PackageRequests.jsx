import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'طلبات الدفع', pending: 'قيد الانتظار', active: 'باقات مفعّلة',
    noPending: 'لا توجد طلبات معلقة', noActive: 'لا توجد باقات مفعّلة بعد',
    student: 'الطالب', teacher: 'المعلم المختار', course: 'الدورة', lessons: 'حصة',
    amountPaid: 'المبلغ المدفوع', paymentStatus: 'حالة الدفع',
    unpaid: 'لم يُدفع', partial: 'دفع جزئي', paid: 'دُفع بالكامل',
    approve: 'موافقة وتفعيل', reject: 'رفض', currency: 'ريال',
    selfRequested: 'لم يتم اختيار معلم', remaining: 'المتبقي',
    editPayment: 'تعديل الدفع', save: 'حفظ', cancel: 'إلغاء',
    saveFailed: 'فشلت العملية. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Payment Requests', pending: 'Pending', active: 'Active Packages',
    noPending: 'No pending requests', noActive: 'No active packages yet',
    student: 'Student', teacher: 'Chosen teacher', course: 'Course', lessons: 'lessons',
    amountPaid: 'Amount Paid', paymentStatus: 'Payment Status',
    unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Fully Paid',
    approve: 'Approve & Activate', reject: 'Reject', currency: 'SAR',
    selfRequested: 'No teacher chosen', remaining: 'Remaining',
    editPayment: 'Edit Payment', save: 'Save', cancel: 'Cancel',
    saveFailed: 'Action failed. Try again.\n\n'
  }
}

export default function PackageRequests({ lang }) {
  const l = labels[lang]
  const [pending, setPending] = useState([])
  const [active, setActive] = useState([])
  const [forms, setForms] = useState({})
  const [editingActiveId, setEditingActiveId] = useState(null)
  const [loading, setLoading] = useState(false)

  const enrich = async (list) => Promise.all(list.map(async sp => {
    const data = { ...sp }
    try {
      const [studentSnap, teacherSnap, courseSnap] = await Promise.all([
        getDoc(doc(db, 'users', sp.studentId)),
        sp.teacherId ? getDoc(doc(db, 'users', sp.teacherId)) : Promise.resolve(null),
        sp.courseId ? getDoc(doc(db, 'courses', sp.courseId)) : Promise.resolve(null)
      ])
      data.studentName = studentSnap.exists() ? studentSnap.data().name : ''
      data.teacherName = teacherSnap && teacherSnap.exists() ? teacherSnap.data().name : ''
      data.courseName = courseSnap && courseSnap.exists() ? courseSnap.data().name : ''
    } catch (e) {
      data.studentName = data.teacherName = data.courseName = ''
    }
    return data
  }))

  const fetchData = async () => {
    try {
      const [pendingSnap, activeSnap] = await Promise.all([
        getDocs(query(collection(db, 'studentPackages'), where('status', '==', 'pending_approval'))),
        getDocs(query(collection(db, 'studentPackages'), where('status', '==', 'active')))
      ])
      const pendingList = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const activeList = activeSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPending(await enrich(pendingList))
      setActive(await enrich(activeList))
      setForms(prev => {
        const next = { ...prev }
        pendingList.forEach(p => {
          if (!next[p.id]) next[p.id] = { amountPaid: p.price || 0, paymentStatus: 'paid' }
        })
        return next
      })
    } catch (err) {
      alert(l.saveFailed + err.message)
    }
  }

  useEffect(() => { fetchData() }, [])

  const approve = async (sp) => {
    const form = forms[sp.id] || { amountPaid: sp.price, paymentStatus: 'paid' }
    setLoading(true)
    try {
      await updateDoc(doc(db, 'studentPackages', sp.id), {
        status: 'active',
        remainingLessons: sp.totalLessons,
        paymentStatus: form.paymentStatus,
        amountPaid: Number(form.amountPaid) || 0,
        approvedBy: auth.currentUser.uid,
        approvedAt: new Date()
      })
      // Mark this teacher/student pair as connected — this is what lets them message
      // each other (and what future package approvals for the same pair reuse).
      if (sp.teacherId) {
        await setDoc(doc(db, 'connections', `${sp.teacherId}_${sp.studentId}`), {
          teacherId: sp.teacherId,
          studentId: sp.studentId,
          createdAt: new Date()
        }, { merge: true })
      }
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const reject = async (sp) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, 'studentPackages', sp.id), { status: 'rejected' })
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditPayment = (sp) => {
    setEditingActiveId(sp.id)
    setForms({ ...forms, [sp.id]: { amountPaid: sp.amountPaid ?? 0, paymentStatus: sp.paymentStatus || 'unpaid' } })
  }

  const cancelEditPayment = () => setEditingActiveId(null)

  const savePayment = async (sp) => {
    const form = forms[sp.id]
    setLoading(true)
    try {
      await updateDoc(doc(db, 'studentPackages', sp.id), {
        paymentStatus: form.paymentStatus,
        amountPaid: Number(form.amountPaid) || 0
      })
      setEditingActiveId(null)
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const remainingFor = (sp, amountPaid) => Math.max((sp.price || 0) - (Number(amountPaid) || 0), 0)

  const paymentBadge = (status) => {
    const cls = status === 'paid'
      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
      : status === 'partial'
      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
      : 'bg-red-100 text-red-500 dark:bg-red-900 dark:text-red-300'
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{l[status] || status}</span>
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="💳" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      {/* Pending requests */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.pending}
        </p>
        {pending.length === 0 && <p className="text-center text-gray-400">{l.noPending}</p>}
        {pending.map(sp => {
          const form = forms[sp.id] || { amountPaid: sp.price, paymentStatus: 'paid' }
          return (
            <div key={sp.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{sp.packageName}</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400">
                  <Icon e="📚" className="w-4 h-4 inline-block align-[-0.3em]" /> {sp.courseName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <Icon e="👨‍🎓" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.student}: {sp.studentName} —{' '}
                  {sp.teacherId
                    ? <><Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.teacher}: {sp.teacherName}</>
                    : <><Icon e="🙋" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.selfRequested}</>}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sp.totalLessons} {l.lessons} — {sp.price} {sp.currency || l.currency}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" className="input flex-1" placeholder={l.amountPaid}
                  value={form.amountPaid}
                  onChange={e => setForms({ ...forms, [sp.id]: { ...form, amountPaid: e.target.value } })} />
                <select className="input flex-1" value={form.paymentStatus}
                  onChange={e => setForms({ ...forms, [sp.id]: { ...form, paymentStatus: e.target.value } })}>
                  <option value="unpaid">{l.unpaid}</option>
                  <option value="partial">{l.partial}</option>
                  <option value="paid">{l.paid}</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">
                {l.remaining}: {remainingFor(sp, form.amountPaid)} {sp.currency || l.currency}
              </p>
              <div className="flex gap-2">
                <button onClick={() => approve(sp)} disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-semibold transition">
                  <Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.approve}
                </button>
                <button onClick={() => reject(sp)} disabled={loading}
                  className="text-red-400 hover:text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200 hover:border-red-400 transition">
                  {l.reject}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active packages (record keeping) */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.active}
        </p>
        {active.length === 0 && <p className="text-center text-gray-400">{l.noActive}</p>}
        {active.map(sp => {
          const isEditing = editingActiveId === sp.id
          const form = forms[sp.id] || { amountPaid: sp.amountPaid ?? 0, paymentStatus: sp.paymentStatus || 'unpaid' }
          return (
            <div key={sp.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium dark:text-white">{sp.packageName}</p>
                  <p className="text-xs text-gray-400">{sp.studentName} · {sp.courseName}</p>
                  {typeof sp.amountPaid === 'number' && (
                    <p className="text-xs text-gray-400">
                      {l.amountPaid}: {sp.amountPaid} {sp.currency || l.currency}
                      {' '}— {l.remaining}: {remainingFor(sp, sp.amountPaid)} {sp.currency || l.currency}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {paymentBadge(sp.paymentStatus || 'unpaid')}
                  {!isEditing && (
                    <button onClick={() => startEditPayment(sp)}
                      className="text-indigo-500 hover:text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200 hover:border-indigo-400 transition">
                      {l.editPayment}
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex gap-2 items-center">
                    <input type="number" className="input flex-1" placeholder={l.amountPaid}
                      value={form.amountPaid}
                      onChange={e => setForms({ ...forms, [sp.id]: { ...form, amountPaid: e.target.value } })} />
                    <select className="input flex-1" value={form.paymentStatus}
                      onChange={e => setForms({ ...forms, [sp.id]: { ...form, paymentStatus: e.target.value } })}>
                      <option value="unpaid">{l.unpaid}</option>
                      <option value="partial">{l.partial}</option>
                      <option value="paid">{l.paid}</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400">
                    {l.remaining}: {remainingFor(sp, form.amountPaid)} {sp.currency || l.currency}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => savePayment(sp)} disabled={loading}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs py-1.5 rounded-lg font-semibold transition">
                      {l.save}
                    </button>
                    <button onClick={cancelEditPayment} disabled={loading}
                      className="px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs py-1.5 rounded-lg font-semibold transition">
                      {l.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

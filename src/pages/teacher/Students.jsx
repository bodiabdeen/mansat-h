import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import {
  collection, getDocs, query, where, doc, getDoc,
  addDoc, deleteDoc
} from 'firebase/firestore'
import Icon from '../../components/Icon'

const BADGES = ['⭐', '🏆', '🎯', '🔥', '💡', '🌟', '🥇', '🎖️']

const labels = {
  ar: {
    title: 'الطلاب', noStudents: 'لا يوجد طلاب مسجلون بعد', points: 'النقاط',
    addPoints: 'إضافة نقاط', note: 'ملاحظة', add: 'إضافة', badge: 'منح شارة',
    history: 'السجل', grade: 'الدرجة', giveBadge: 'منح', addGrade: 'إضافة درجة',
    gradeLabel: 'الدرجة (مثال: A+)', totalPoints: 'مجموع النقاط', badges: 'الشارات',
    packages: 'الباقات', noPackages: 'لا توجد باقات', used: 'مستخدم',
    of: 'من',
    lessonsLeft: 'حصص', remove: 'إزالة', searchPlaceholder: 'بحث عن طالب...',
    pendingApproval: 'بانتظار موافقة الإدارة على الدفع',
    actionFailed: 'فشلت العملية. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Students', noStudents: 'No students registered yet', points: 'Points',
    addPoints: 'Add Points', note: 'Note', add: 'Add', badge: 'Give Badge',
    history: 'History', grade: 'Grade', giveBadge: 'Give', addGrade: 'Add Grade',
    gradeLabel: 'Grade (e.g. A+)', totalPoints: 'Total Points', badges: 'Badges',
    packages: 'Packages', noPackages: 'No packages assigned', used: 'used',
    of: 'of',
    lessonsLeft: 'lessons', remove: 'Remove', searchPlaceholder: 'Search student...',
    pendingApproval: 'Awaiting admin payment approval',
    actionFailed: 'Action failed. Try again.\n\n'
  }
}

export default function Students({ lang }) {
  const l = labels[lang]
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)
  const [rewards, setRewards] = useState([])
  const [studentPackages, setStudentPackages] = useState([])
  const [form, setForm] = useState({ points: '', note: '', grade: '', badge: '' })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchStudents = async () => {
    // Only students with an admin-approved (active) package tied to me —
    // not every student in the system.
    const activeSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('teacherId', '==', auth.currentUser.uid),
      where('status', '==', 'active')
    ))
    const myStudentIds = [...new Set(activeSnap.docs.map(d => d.data().studentId))]
    const studentDocs = await Promise.all(myStudentIds.map(id => getDoc(doc(db, 'users', id))))
    setStudents(studentDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })))
  }

  const fetchStudentData = async (studentId) => {
    // Only show packages assigned BY this teacher to this student
    const pkgSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('studentId', '==', studentId),
      where('teacherId', '==', auth.currentUser.uid)
    ))
    setStudentPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    // Rewards added by this teacher
    const snap = await getDocs(query(
      collection(db, 'rewards'),
      where('studentId', '==', studentId),
      where('teacherId', '==', auth.currentUser.uid)
    ))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    setRewards(list)
  }

  useEffect(() => { fetchStudents() }, [])

  const selectStudent = async (s) => {
    setSelected(s)
    await fetchStudentData(s.id)
  }

  const removePackage = async (packageDocId) => {
    await deleteDoc(doc(db, 'studentPackages', packageDocId))
    if (selected) await fetchStudentData(selected.id)
  }

  const addReward = async (type) => {
    if (!selected) return
    if (type === 'points' && !form.points) return
    if (type === 'grade' && !form.grade) return
    if (type === 'badge' && !form.badge) return
    setLoading(true)
    try {
      await addDoc(collection(db, 'rewards'), {
        studentId: selected.id,
        teacherId: auth.currentUser.uid,
        type,
        points: type === 'points' ? Number(form.points) : 0,
        grade: type === 'grade' ? form.grade : '',
        badge: type === 'badge' ? form.badge : '',
        note: form.note,
        createdAt: new Date()
      })
      setForm({ points: '', note: '', grade: '', badge: '' })
      await fetchStudentData(selected.id)
    } catch (err) {
      alert(l.actionFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPoints = rewards.filter(r => r.type === 'points').reduce((s, r) => s + r.points, 0)
  const allBadges = rewards.filter(r => r.type === 'badge').map(r => r.badge)
  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="👨‍🎓" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
      </h2>

      {/* Search */}
      <input
        className="input"
        placeholder={`🔍 ${l.searchPlaceholder}`}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filteredStudents.length === 0 && (
        <p className="text-center text-gray-400">{l.noStudents}</p>
      )}

      {/* Student list */}
      <div className="flex gap-2 flex-wrap">
        {filteredStudents.map(s => (
          <button key={s.id} onClick={() => selectStudent(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border
              ${selected?.id === s.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>
            <Icon e="👤" className="w-5 h-5 inline-block align-[-0.3em]" /> {s.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl p-4 flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{totalPoints}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400"><Icon e="⭐" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.totalPoints}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1"><Icon e="🏅" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.badges}</p>
              <div className="flex gap-1 flex-wrap">
                {allBadges.length === 0
                  ? <span className="text-gray-400 text-sm">—</span>
                  : allBadges.map((b, i) => <Icon key={i} e={b} className="w-7 h-7 inline-block" />)
                }
              </div>
            </div>
          </div>

          {/* Student Packages */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📦" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.packages}</p>
            {studentPackages.length === 0
              ? <p className="text-sm text-gray-400">{l.noPackages}</p>
              : (
                <div className="space-y-2">
                  {studentPackages.map(pkg => (
                    <div key={pkg.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-white">{pkg.packageName}</p>
                        {pkg.status === 'pending_approval' ? (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400"><Icon e="⏳" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.pendingApproval}</p>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pkg.totalLessons - pkg.remainingLessons} {l.used} / {pkg.totalLessons} {l.lessonsLeft}
                            </p>
                            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                              <div className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${((pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons) * 100}%` }} />
                            </div>
                          </>
                        )}
                      </div>
                      {pkg.status === 'pending_approval' && (
                        <button onClick={() => removePackage(pkg.id)}
                          className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded ml-2 border border-red-200 hover:border-red-400 transition whitespace-nowrap">
                          {l.remove}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Add Points */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="⭐" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.addPoints}</p>
            <div className="flex gap-2">
              <input className="input" type="number" placeholder={l.points}
                value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} />
              <input className="input" placeholder={l.note}
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <button onClick={() => addReward('points')} disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
              {loading ? '...' : `+ ${l.add}`}
            </button>
          </div>

          {/* Add Grade */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📊" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.addGrade}</p>
            <div className="flex gap-2">
              <input className="input" placeholder={l.gradeLabel}
                value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} />
              <input className="input" placeholder={l.note}
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <button onClick={() => addReward('grade')} disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition">
              {loading ? '...' : `+ ${l.add}`}
            </button>
          </div>

          {/* Give Badge */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="🏆" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.badge}</p>
            <div className="flex gap-2 flex-wrap">
              {BADGES.map(b => (
                <button key={b} onClick={() => setForm({ ...form, badge: b })}
                  className={`text-2xl p-2 rounded-xl border-2 transition
                    ${form.badge === b ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900' : 'border-transparent'}`}>
                  <Icon e={b} className="w-7 h-7 inline-block" />
                </button>
              ))}
            </div>
            <button onClick={() => addReward('badge')} disabled={loading || !form.badge}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold transition">
              {loading ? '...' : <>{l.giveBadge} <Icon e={form.badge} className="w-5 h-5 inline-block align-[-0.3em]" /></>}
            </button>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📋" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.history}</p>
            {rewards.length === 0 && <p className="text-gray-400 text-sm text-center">—</p>}
            {rewards.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-lg">
                  {r.type === 'points'
                    ? <Icon e="⭐" className="w-6 h-6 inline-block" />
                    : r.type === 'grade'
                      ? <Icon e="📊" className="w-6 h-6 inline-block" />
                      : <Icon e={r.badge} className="w-6 h-6 inline-block" />}
                </span>
                <div className="flex-1">
                  {r.type === 'points' && <p className="text-sm dark:text-white">+{r.points} {l.points}</p>}
                  {r.type === 'grade' && <p className="text-sm dark:text-white">{l.grade}: {r.grade}</p>}
                  {r.type === 'badge' && <p className="text-sm dark:text-white"><Icon e={r.badge} className="w-5 h-5 inline-block align-[-0.3em]" /> {l.badge}</p>}
                  {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs } from 'firebase/firestore'
import StatTile from '../../components/StatTile'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'تقرير الحصص', completed: 'مكتملة', missed: 'ملغاة (محتسبة)',
    cancelled: 'ملغاة (مستردة)', upcoming: 'قادمة', revenue: 'الإيرادات المحتسبة',
    all: 'الكل', student: 'الطالب', teacher: 'المعلم',
    noSessions: 'لا توجد حصص بعد'
  },
  en: {
    title: 'Sessions Report', completed: 'Completed', missed: 'Missed (Counted)',
    cancelled: 'Cancelled (Refunded)', upcoming: 'Upcoming', revenue: 'Revenue Recognized',
    all: 'All', student: 'Student', teacher: 'Teacher',
    noSessions: 'No sessions yet'
  }
}

const TABS = ['all', 'completed', 'missed', 'cancelled', 'upcoming']

const STATUS_BADGE = {
  completed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  missed: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  upcoming: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
}

export default function SessionsReport({ lang }) {
  const l = labels[lang]
  const [bookings, setBookings] = useState([])
  const [studentPackages, setStudentPackages] = useState([])
  const [users, setUsers] = useState({})
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [bookingSnap, spSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'studentPackages')),
        getDocs(collection(db, 'users'))
      ])
      setBookings(bookingSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setStudentPackages(spSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      const userMap = {}
      userSnap.docs.forEach(d => { userMap[d.id] = d.data().name || '' })
      setUsers(userMap)
      setLoading(false)
    }
    fetchData()
  }, [])

  const spById = useMemo(() => {
    const map = {}
    studentPackages.forEach(sp => { map[sp.id] = sp })
    return map
  }, [studentPackages])

  const categorized = useMemo(() => {
    const now = new Date()
    return bookings.map(b => {
      const isPast = new Date(b.date + 'T' + b.time) < now
      let category = 'upcoming'
      if (b.status === 'missed') category = 'missed'
      else if (b.status === 'cancelled') category = 'cancelled'
      else if (b.status === 'confirmed' && isPast) category = 'completed'
      return { ...b, category }
    })
  }, [bookings])

  const counts = useMemo(() => ({
    completed: categorized.filter(b => b.category === 'completed').length,
    missed: categorized.filter(b => b.category === 'missed').length,
    cancelled: categorized.filter(b => b.category === 'cancelled').length,
    upcoming: categorized.filter(b => b.category === 'upcoming').length,
  }), [categorized])

  const revenueByCurrency = useMemo(() => {
    const totals = {}
    categorized
      .filter(b => b.category === 'completed' || b.category === 'missed')
      .forEach(b => {
        const sp = spById[b.studentPackageId]
        if (!sp || !sp.totalLessons || !sp.price) return
        const perLesson = sp.price / sp.totalLessons
        const currency = sp.currency || 'SAR'
        totals[currency] = (totals[currency] || 0) + perLesson
      })
    return totals
  }, [categorized, spById])

  const filtered = (tab === 'all' ? categorized : categorized.filter(b => b.category === tab))
    .slice()
    .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time))

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin"><Icon e="📊" className="w-10 h-10 inline-block" /></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📈" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon="✅" label={l.completed} value={counts.completed} color="green" />
        <StatTile icon="⚠️" label={l.missed} value={counts.missed} color="orange" />
        <StatTile icon="🚫" label={l.cancelled} value={counts.cancelled} color="gray" />
        <StatTile icon="📅" label={l.upcoming} value={counts.upcoming} color="indigo" />
      </div>

      {Object.keys(revenueByCurrency).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            <Icon e="💰" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.revenue}
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(revenueByCurrency).map(([currency, amount]) => (
              <span key={currency} className="text-lg font-bold text-gold-600 dark:text-gold-400">
                {amount.toFixed(2)} {currency}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
              ${tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
            {l[t]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-gray-400">{l.noSessions}</p>}
        {filtered.map(b => (
          <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium dark:text-white">{b.date} — {b.time}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                <Icon e="👨‍🎓" className="w-4 h-4 inline-block align-[-0.25em]" /> {users[b.studentId] || '—'}
                {' · '}
                <Icon e="👨‍🏫" className="w-4 h-4 inline-block align-[-0.25em]" /> {users[b.teacherId] || '—'}
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400">{b.packageName}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[b.category]}`}>
              {l[b.category]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'لوحة التحكم', welcome: 'أهلاً', myPackage: 'باقتي',
    remaining: 'متبقي', total: 'الإجمالي', upcomingBookings: 'حجوزاتي القادمة',
    noBookings: 'لا توجد حجوزات قادمة', pendingAssignments: 'واجبات معلقة',
    totalPoints: 'نقاطي', badges: 'شاراتي', minutes: 'دقيقة', noPackage: 'لا توجد باقة'
  },
  en: {
    title: 'Dashboard', welcome: 'Welcome', myPackage: 'My Package',
    remaining: 'Remaining', total: 'Total', upcomingBookings: 'Upcoming Bookings',
    noBookings: 'No upcoming bookings', pendingAssignments: 'Pending Assignments',
    totalPoints: 'My Points', badges: 'My Badges', minutes: 'min', noPackage: 'No Package'
  }
}

export default function StudentDashboard({ lang, userData }) {
  const l = labels[lang]
  const [myPackage, setMyPackage] = useState(null)
  const [bookings, setBookings] = useState([])
  const [pending, setPending] = useState(0)
  const [points, setPoints] = useState(0)
  const [badges, setBadges] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const uid = auth.currentUser.uid

      // Package
      const pkgSnap = await getDoc(doc(db, 'studentPackages', uid))
      if (pkgSnap.exists()) setMyPackage(pkgSnap.data())

      // Upcoming bookings
      const bookSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('studentId', '==', uid),
        where('status', '==', 'confirmed')
      ))
      const now = new Date()
      const upcoming = bookSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => new Date(b.date + 'T' + b.time) > now)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 3)
      setBookings(upcoming)

      // Pending assignments
      const assignSnap = await getDocs(query(
        collection(db, 'assignments'),
        where('studentId', '==', uid),
        where('status', '==', 'pending')
      ))
      setPending(assignSnap.size)

      // Rewards
      const rewardSnap = await getDocs(query(
        collection(db, 'rewards'), where('studentId', '==', uid)
      ))
      const rewards = rewardSnap.docs.map(d => d.data())
      setPoints(rewards.filter(r => r.type === 'points').reduce((s, r) => s + r.points, 0))
      setBadges(rewards.filter(r => r.type === 'badge').map(r => r.badge))
    }
    fetch()
  }, [])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📊 {l.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} 👋
        </p>
      </div>

      {/* Package Progress */}
      <div className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl p-4 space-y-2">
        <p className="font-semibold text-indigo-700 dark:text-indigo-300">📦 {l.myPackage}</p>
        {myPackage ? (
          <>
            <p className="font-bold dark:text-white">{myPackage.packageName}</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${(myPackage.remainingLessons / myPackage.totalLessons) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {l.remaining}: {myPackage.remainingLessons} / {l.total}: {myPackage.totalLessons}
            </p>
          </>
        ) : <p className="text-gray-400 text-sm">{l.noPackage}</p>}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 dark:bg-yellow-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{points}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">⭐ {l.totalPoints}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">{badges.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">🏅 {l.badges}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-300">{pending}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">📝 {l.pendingAssignments}</div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">📅 {l.upcomingBookings}</p>
        {bookings.length === 0
          ? <p className="text-center text-gray-400 text-sm">{l.noBookings}</p>
          : bookings.map(b => (
            <div key={b.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium dark:text-white">📅 {b.date} — 🕐 {b.time}</p>
                <p className="text-xs text-gray-400">⏱ {b.duration} {l.minutes}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                ✅
              </span>
            </div>
          ))
        }
      </div>

      {/* Badges display */}
      {badges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">🏅 {l.badges}</p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((b, i) => <span key={i} className="text-3xl">{b}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
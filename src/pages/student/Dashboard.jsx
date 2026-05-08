import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'لوحة التحكم', welcome: 'أهلاً', myPackages: 'باقاتي',
    remaining: 'متبقي', total: 'الإجمالي', upcomingBookings: 'حجوزاتي القادمة',
    noBookings: 'لا توجد حجوزات قادمة', pendingAssignments: 'واجبات معلقة',
    totalPoints: 'نقاطي', badges: 'شاراتي', minutes: 'دقيقة', noPackages: 'لا توجد باقات',
    used: 'مستخدم', of: 'من'
  },
  en: {
    title: 'Dashboard', welcome: 'Welcome', myPackages: 'My Packages',
    remaining: 'Remaining', total: 'Total', upcomingBookings: 'Upcoming Bookings',
    noBookings: 'No upcoming bookings', pendingAssignments: 'Pending Assignments',
    totalPoints: 'My Points', badges: 'My Badges', minutes: 'min', noPackages: 'No Packages',
    used: 'used', of: 'of'
  }
}

export default function StudentDashboard({ lang, userData }) {
  const l = labels[lang]
  const [myPackages, setMyPackages] = useState([])
  const [bookings, setBookings] = useState([])
  const [pending, setPending] = useState(0)
  const [points, setPoints] = useState(0)
  const [badges, setBadges] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const uid = auth.currentUser.uid

      // Get all packages for this student
      const pkgSnap = await getDocs(query(
        collection(db, 'studentPackages'),
        where('studentId', '==', uid)
      ))
      const packages = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMyPackages(packages)

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📊 {l.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} 👋
        </p>
      </div>

      {/* My Packages */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">📦 {l.myPackages}</p>
        {myPackages.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-2xl p-4 text-center text-sm text-yellow-700 dark:text-yellow-300">
            {l.noPackages}
          </div>
        ) : (
          <div className="space-y-2">
            {myPackages.map(pkg => (
              <div key={pkg.id} className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{pkg.packageName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {pkg.totalLessons - pkg.remainingLessons} {l.used} / {pkg.totalLessons} {l.of}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{pkg.remainingLessons}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{l.remaining}</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${((pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
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
                <p className="text-xs text-gray-400">📦 {b.packageName}</p>
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
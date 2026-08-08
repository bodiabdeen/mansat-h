import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import CourseCatalog from './CourseCatalog'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'لوحة التحكم', welcome: 'أهلاً', myPackages: 'باقاتي',
    remaining: 'متبقي', total: 'الإجمالي', upcomingBookings: 'حجوزاتي القادمة',
    noBookings: 'لا توجد حجوزات قادمة', pendingAssignments: 'واجبات معلقة',
    totalPoints: 'نقاطي', badges: 'شاراتي', minutes: 'دقيقة', noPackages: 'لا توجد باقات',
    used: 'مستخدم', of: 'من', catalogTitle: '📚 الدورات والباقات المتاحة'
  },
  en: {
    title: 'Dashboard', welcome: 'Welcome', myPackages: 'My Packages',
    remaining: 'Remaining', total: 'Total', upcomingBookings: 'Upcoming Bookings',
    noBookings: 'No upcoming bookings', pendingAssignments: 'Pending Assignments',
    totalPoints: 'My Points', badges: 'My Badges', minutes: 'min', noPackages: 'No Packages',
    used: 'used', of: 'of', catalogTitle: '📚 Available Courses & Packages'
  }
}

export default function StudentDashboard({ lang, userData, setPage }) {
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
      setMyPackages(packages.filter(p => p.status !== 'pending_approval' && p.status !== 'rejected'))

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
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400"><Icon e="📊" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} <Icon e="👋" className="w-5 h-5 inline-block align-[-0.3em]" />
        </p>
      </div>

      {/* My Packages */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📦" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.myPackages}</p>
        {myPackages.length === 0 ? (
          <div className="bg-gold-50 dark:bg-gold-700/25 rounded-2xl p-4 text-center text-sm text-gold-700 dark:text-gold-400">
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
        <button onClick={() => setPage?.('achievements')}
          className="bg-gold-50 dark:bg-gold-700/25 rounded-2xl p-3 text-center transition hover:opacity-80 hover:scale-[1.02]">
          <div className="text-2xl font-bold text-gold-700 dark:text-gold-400">{points}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1"><Icon e="⭐" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.totalPoints}</div>
        </button>
        <button onClick={() => setPage?.('achievements')}
          className="bg-indigo-100 dark:bg-indigo-800 rounded-2xl p-3 text-center transition hover:opacity-80 hover:scale-[1.02]">
          <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">{badges.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1"><Icon e="🏅" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.badges}</div>
        </button>
        <button onClick={() => setPage?.('assignments')}
          className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl p-3 text-center transition hover:opacity-80 hover:scale-[1.02]">
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{pending}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1"><Icon e="📝" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.pendingAssignments}</div>
        </button>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.upcomingBookings}</p>
        {bookings.length === 0
          ? <p className="text-center text-gray-400 text-sm">{l.noBookings}</p>
          : bookings.map(b => (
            <div key={b.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium dark:text-white"><Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {b.date} — <Icon e="🕐" className="w-5 h-5 inline-block align-[-0.3em]" /> {b.time}</p>
                <p className="text-xs text-gray-400"><Icon e="📦" className="w-4 h-4 inline-block align-[-0.25em]" /> {b.packageName}</p>
                <p className="text-xs text-gray-400"><Icon e="⏱" className="w-4 h-4 inline-block align-[-0.25em]" /> {b.duration} {l.minutes}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                <Icon e="✅" className="w-4 h-4 inline-block" />
              </span>
            </div>
          ))
        }
      </div>

      {/* Badges display */}
      {badges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2"><Icon e="🏅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.badges}</p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((b, i) => <span key={i} className="text-3xl">{b}</span>)}
          </div>
        </div>
      )}

      {/* Courses & Packages showcase */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.catalogTitle}</p>
        <CourseCatalog lang={lang} />
      </div>
    </div>
  )
}
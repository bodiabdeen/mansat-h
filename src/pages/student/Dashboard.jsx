import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import CourseCatalog from './CourseCatalog'
import Icon from '../../components/Icon'
import WaveDivider from '../../components/WaveDivider'

const labels = {
  ar: {
    title: 'لوحة التحكم', welcome: 'أهلاً', myPackages: 'باقاتي',
    remaining: 'متبقي', total: 'الإجمالي', upcomingBookings: 'حجوزاتي القادمة',
    noBookings: 'لا توجد حجوزات قادمة', pendingAssignments: 'واجبات معلقة',
    totalPoints: 'نقاطي', badges: 'شاراتي', minutes: 'دقيقة', noPackages: 'لا توجد باقات',
    used: 'مستخدم', of: 'من', catalogTitle: '📚 الدورات والباقات المتاحة',
    nextSession: 'حصتك القادمة', with: 'مع', viewBooking: 'التفاصيل',
    noUpcoming: 'لا توجد حصص قادمة — احجز واحدة الآن!', more: 'أخرى'
  },
  en: {
    title: 'Dashboard', welcome: 'Welcome', myPackages: 'My Packages',
    remaining: 'Remaining', total: 'Total', upcomingBookings: 'Upcoming Bookings',
    noBookings: 'No upcoming bookings', pendingAssignments: 'Pending Assignments',
    totalPoints: 'My Points', badges: 'My Badges', minutes: 'min', noPackages: 'No Packages',
    used: 'used', of: 'of', catalogTitle: '📚 Available Courses & Packages',
    nextSession: 'Your Next Session', with: 'with', viewBooking: 'Details',
    noUpcoming: 'No upcoming sessions — book one now!', more: 'more'
  }
}

export default function StudentDashboard({ lang, userData, setPage }) {
  const l = labels[lang]
  const [myPackages, setMyPackages] = useState([])
  const [bookings, setBookings] = useState([])
  const [nextTeacherName, setNextTeacherName] = useState('')
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
      if (upcoming[0]?.teacherId) {
        const teacherSnap = await getDoc(doc(db, 'users', upcoming[0].teacherId))
        setNextTeacherName(teacherSnap.exists() ? teacherSnap.data().name || '' : '')
      } else {
        setNextTeacherName('')
      }

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

  const activePackages = myPackages.filter(p => p.status !== 'pending_approval' && p.remainingLessons > 0)
  const finishedPackages = myPackages.filter(p => p.status !== 'pending_approval' && p.remainingLessons === 0)
  const primaryPackage = activePackages[0]
  const morePackagesCount = Math.max(0, activePackages.length - 1)
  const nextBooking = bookings[0]

  const initials = (userData?.name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const ringDasharray = primaryPackage
    ? `${((primaryPackage.totalLessons - primaryPackage.remainingLessons) / primaryPackage.totalLessons) * 264} 264`
    : '0 264'

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 text-white px-5 md:px-8 pt-5 md:pt-6 pb-16">
        <div className="absolute -top-10 -end-10 w-44 h-44 rounded-full bg-gold-400/35 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-14 -start-10 w-40 h-40 rounded-full bg-indigo-400/25 blur-2xl pointer-events-none" />
        <WaveDivider />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-indigo-100 text-xs opacity-90">{l.welcome}</p>
            <p className="text-xl font-bold mt-0.5">{userData?.name}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-bold text-gold-300 shrink-0">
            {initials || <Icon e="🎓" className="w-5 h-5" />}
          </div>
        </div>

        <div className="relative mt-5 flex items-center bg-white/10 border border-white/20 rounded-2xl md:max-w-md">
          <button onClick={() => setPage?.('achievements')} className="flex-1 text-center py-2.5 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <p className="text-lg font-bold leading-none">{points}</p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-100 opacity-80 mt-1">{l.totalPoints}</p>
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button onClick={() => setPage?.('achievements')} className="flex-1 text-center py-2.5 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <p className="text-lg font-bold leading-none">{badges.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-100 opacity-80 mt-1">{l.badges}</p>
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button onClick={() => setPage?.('assignments')} className="flex-1 text-center py-2.5 rounded-2xl hover:bg-white/10 transition cursor-pointer">
            <p className="text-lg font-bold leading-none">{pending}</p>
            <p className="text-[10px] uppercase tracking-wide text-indigo-100 opacity-80 mt-1">{l.pendingAssignments}</p>
          </button>
        </div>
      </div>

      {/* Glass package card, overlapping the hero */}
      {primaryPackage && (
        <div className="relative -mt-12 mx-1">
          <button onClick={() => setPage?.('myPackage')}
            className="w-full text-start bg-white/85 dark:bg-gray-800/85 backdrop-blur-md border border-white/70 dark:border-gray-700/70 rounded-2xl p-4 shadow-lg shadow-indigo-900/10 flex items-center gap-4 hover:shadow-xl transition cursor-pointer md:max-w-md">
            <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90 shrink-0">
              <defs>
                <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#E0C15C" />
                  <stop offset="1" stopColor="#B8952B" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" className="fill-none stroke-gray-200 dark:stroke-gray-700" strokeWidth="9" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#heroRingGrad)" strokeWidth="9" strokeLinecap="round"
                style={{ strokeDasharray: ringDasharray }} />
            </svg>
            <div className="min-w-0">
              <p className="font-bold text-gray-800 dark:text-white text-sm truncate">{primaryPackage.packageName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {primaryPackage.remainingLessons} {l.remaining} · {primaryPackage.totalLessons} {l.total}
              </p>
              {morePackagesCount > 0 && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">+{morePackagesCount} {l.more}</p>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Two-column body on desktop */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Next session spotlight */}
          {nextBooking ? (
            <button onClick={() => setPage?.('bookSlot')}
              className="w-full text-start bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between gap-3 hover:shadow-md transition cursor-pointer">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gold-600 dark:text-gold-400">{l.nextSession}</p>
                <p className="font-bold text-gray-800 dark:text-white text-sm mt-1">
                  <Icon e="📅" className="w-4 h-4 inline-block align-[-0.25em]" /> {nextBooking.date} — <Icon e="🕐" className="w-4 h-4 inline-block align-[-0.25em]" /> {nextBooking.time}
                </p>
                {nextTeacherName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{l.with} {nextTeacherName}</p>
                )}
              </div>
              <span className="shrink-0 bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-indigo-900 text-xs font-bold px-4 py-2 rounded-xl">
                {l.viewBooking}
              </span>
            </button>
          ) : (
            <button onClick={() => setPage?.('bookSlot')}
              className="w-full bg-gold-50 dark:bg-gold-700/20 rounded-2xl p-4 text-center text-sm text-gold-700 dark:text-gold-400 font-medium hover:bg-gold-100 dark:hover:bg-gold-700/30 transition cursor-pointer">
              {l.noUpcoming}
            </button>
          )}

          {/* My Packages */}
          <div className="space-y-3">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📦" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.myPackages}</p>
            {myPackages.length === 0 ? (
              <div className="bg-gold-50 dark:bg-gold-700/25 rounded-2xl p-4 text-center text-sm text-gold-700 dark:text-gold-400">
                {l.noPackages}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {[...activePackages, ...finishedPackages].map((pkg, i) => {
                  const gradId = `pkgRingGrad-${pkg.id}`
                  const fraction = pkg.totalLessons ? (pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons : 0
                  return (
                    <button key={pkg.id} onClick={() => setPage?.('myPackage')}
                      className="text-start bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition cursor-pointer">
                      <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90 shrink-0">
                        <defs>
                          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor={i === 0 ? '#E0C15C' : '#3B62A0'} />
                            <stop offset="1" stopColor={i === 0 ? '#B8952B' : '#0C1B2E'} />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="42" className="fill-none stroke-gray-200 dark:stroke-gray-700" strokeWidth="9" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#${gradId})`} strokeWidth="9" strokeLinecap="round"
                          style={{ strokeDasharray: `${fraction * 264} 264` }} />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 dark:text-white">{pkg.packageName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {pkg.totalLessons - pkg.remainingLessons} {l.used} / {pkg.totalLessons} {l.of}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{pkg.remainingLessons}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{l.remaining}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">

          {/* Upcoming Bookings */}
          <button onClick={() => setPage?.('bookSlot')}
            className="w-full text-start bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3 hover:shadow-md transition cursor-pointer">
            <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.upcomingBookings}</p>
            {bookings.length === 0
              ? <p className="text-center text-gray-400 text-sm">{l.noBookings}</p>
              : bookings.map(b => {
                const d = new Date(b.date + 'T' + b.time)
                return (
                  <div key={b.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-900 text-white flex flex-col items-center justify-center shrink-0 leading-none">
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
                        {d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium dark:text-white">{b.time}</p>
                      <p className="text-xs text-gray-400"><Icon e="📦" className="w-4 h-4 inline-block align-[-0.25em]" /> {b.packageName}</p>
                      <p className="text-xs text-gray-400"><Icon e="⏱" className="w-4 h-4 inline-block align-[-0.25em]" /> {b.duration} {l.minutes}</p>
                    </div>
                  </div>
                )
              })
            }
          </button>

          {/* Badges display */}
          {badges.length > 0 && (
            <button onClick={() => setPage?.('achievements')}
              className="w-full text-start bg-white dark:bg-gray-800 rounded-2xl shadow p-4 hover:shadow-md transition cursor-pointer">
              <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2"><Icon e="🏅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.badges}</p>
              <div className="flex gap-2 flex-wrap">
                {badges.map((b, i) => (
                  <span key={i} className="text-3xl bg-gold-50 dark:bg-gold-700/20 rounded-xl p-2">{b}</span>
                ))}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Courses & Packages showcase */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.catalogTitle}</p>
        <CourseCatalog lang={lang} />
      </div>
    </div>
  )
}

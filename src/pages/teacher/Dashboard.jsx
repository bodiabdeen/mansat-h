import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'لوحة التحكم', totalStudents: 'الطلاب (الكل)', totalSlots: 'المواعيد',
    bookedSlots: 'المحجوزة', totalPackages: 'باقاتي', upcomingSlots: 'المواعيد القادمة',
    noUpcoming: 'لا توجد مواعيد قادمة', pendingAssignments: 'واجبات معلقة',
    minutes: 'دقيقة', welcome: 'أهلاً', myStudents: 'طلابي (بباقة)'
  },
  en: {
    title: 'Dashboard', totalStudents: 'All Students', totalSlots: 'My Slots',
    bookedSlots: 'Booked', totalPackages: 'My Packages', upcomingSlots: 'Upcoming Slots',
    noUpcoming: 'No upcoming slots', pendingAssignments: 'Pending Assignments',
    minutes: 'min', welcome: 'Welcome', myStudents: 'My Students (w/ package)'
  }
}

export default function TeacherDashboard({ lang, userData, setPage }) {
  const l = labels[lang]
  const [stats, setStats] = useState({
    allStudents: 0, myStudents: 0, slots: 0, booked: 0, packages: 0, pending: 0
  })
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const uid = auth.currentUser.uid

      // All students in the system
      const allStudentsSnap = await getDocs(query(collection(db, 'users'), where('roles', 'array-contains', 'student')))

      // Packages naming me as the chosen teacher
      const stdPkgSnap = await getDocs(query(
        collection(db, 'studentPackages'), where('teacherId', '==', uid)
      ))
      // Only count active (admin-approved) packages, not still-pending or rejected ones —
      // matches "My Students" below, which is also active-only.
      const activePkgs = stdPkgSnap.docs.filter(d => d.data().status === 'active')
      const myStudentIds = new Set(activePkgs.map(d => d.data().studentId))

      // My slots
      const slotSnap = await getDocs(query(collection(db, 'slots'), where('teacherId', '==', uid)))
      const slots = slotSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Upcoming slots
      const now = new Date()
      const upcomingList = slots
        .filter(s => new Date(s.date + 'T' + s.time) > now)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 5)

      // Pending assignments by this teacher
      const assignSnap = await getDocs(query(
        collection(db, 'assignments'), where('teacherId', '==', uid)
      ))
      const pending = assignSnap.docs.filter(d => d.data().status === 'pending').length

      setStats({
        allStudents: allStudentsSnap.size,
        myStudents: myStudentIds.size,
        slots: slots.length,
        booked: slots.filter(s => s.booked).length,
        packages: activePkgs.length,
        pending
      })
      setUpcoming(upcomingList)
    }
    fetch()
  }, [])

  const cards = [
    { label: l.totalStudents, value: stats.allStudents, icon: '👥', color: 'sage', page: 'students' },
    { label: l.myStudents, value: stats.myStudents, icon: '👨‍🎓', color: 'deep', page: 'students' },
    { label: l.totalPackages, value: stats.packages, icon: '📦', color: 'forest', page: 'packages' },
    { label: l.totalSlots, value: stats.slots, icon: '📅', color: 'sage', page: 'slots' },
    { label: l.bookedSlots, value: stats.booked, icon: '🔒', color: 'gold', page: 'slots' },
    { label: l.pendingAssignments, value: stats.pending, icon: '📝', color: 'slate', page: 'assignments' },
  ]

  // Brand-only tones (navy shades + gold accent + a neutral) — no off-brand hues.
  const colorMap = {
    deep: 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
    sage: 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200',
    forest: 'bg-indigo-200 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300',
    gold: 'bg-gold-50 dark:bg-gold-700/25 text-gold-700 dark:text-gold-400',
    slate: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          <Icon e="📊" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} <Icon e="👋" className="w-5 h-5 inline-block align-[-0.3em]" />
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(card => (
          <button key={card.label} onClick={() => setPage?.(card.page)}
            className={`rounded-2xl p-4 text-center transition hover:opacity-80 hover:scale-[1.02] cursor-pointer ${colorMap[card.color]}`}>
            <div className="text-3xl mb-1"><Icon e={card.icon} className="w-8 h-8 inline-block" /></div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-80">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Upcoming Slots */}
      <button onClick={() => setPage?.('slots')}
        className="w-full text-start bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3 hover:shadow-md transition cursor-pointer">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400"><Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.upcomingSlots}</p>
        {upcoming.length === 0
          ? <p className="text-center text-gray-400 text-sm">{l.noUpcoming}</p>
          : (
            <div className="grid md:grid-cols-2 gap-2">
              {upcoming.map(slot => (
                <div key={slot.id}
                  className="flex items-center justify-between py-2 px-1 border-b md:border border-gray-100 dark:border-gray-700 last:border-0 md:rounded-xl md:px-3">
                  <div>
                    <p className="text-sm font-medium dark:text-white">
                      <Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {slot.date} — <Icon e="🕐" className="w-5 h-5 inline-block align-[-0.3em]" /> {slot.time}
                    </p>
                    <p className="text-xs text-gray-400"><Icon e="⏱" className="w-4 h-4 inline-block align-[-0.3em]" /> {slot.duration} {l.minutes}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${slot.booked
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                      : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'}`}>
                    {slot.booked
                      ? <Icon e="🔒" className="w-4 h-4 inline-block" />
                      : <Icon e="✅" className="w-4 h-4 inline-block" />}
                  </span>
                </div>
              ))}
            </div>
          )
        }
      </button>
    </div>
  )
}

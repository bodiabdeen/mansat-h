import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'لوحة التحكم', totalStudents: 'الطلاب', totalSlots: 'المواعيد',
    bookedSlots: 'المحجوزة', totalPackages: 'الباقات', upcomingSlots: 'المواعيد القادمة',
    noUpcoming: 'لا توجد مواعيد قادمة', pendingAssignments: 'واجبات معلقة',
    minutes: 'دقيقة', welcome: 'أهلاً', packages: 'عدد الباقات المعطاة'
  },
  en: {
    title: 'Dashboard', totalStudents: 'Students', totalSlots: 'Slots',
    bookedSlots: 'Booked', totalPackages: 'Packages', upcomingSlots: 'Upcoming Slots',
    noUpcoming: 'No upcoming slots', pendingAssignments: 'Pending Assignments',
    minutes: 'min', welcome: 'Welcome', packages: 'Packages Assigned'
  }
}

export default function TeacherDashboard({ lang, userData }) {
  const l = labels[lang]
  const [stats, setStats] = useState({ students: 0, slots: 0, booked: 0, packages: 0, pending: 0 })
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const uid = auth.currentUser.uid

      // Get packages count
      const pkgSnap = await getDocs(query(collection(db, 'packages'), where('teacherId', '==', uid)))
      
      // Get student packages count (how many packages assigned to students)
      const stdPkgSnap = await getDocs(query(
        collection(db, 'studentPackages'), where('teacherId', '==', uid)
      ))

      // Get slots
      const slotSnap = await getDocs(query(collection(db, 'slots'), where('teacherId', '==', uid)))
      const slots = slotSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // Get unique students
      const studentIds = new Set(stdPkgSnap.docs.map(d => d.data().studentId))

      // Get upcoming slots
      const now = new Date()
      const upcomingList = slots
        .filter(s => new Date(s.date + 'T' + s.time) > now)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 5)

      // Get pending assignments
      const assignSnap = await getDocs(query(
        collection(db, 'assignments'), where('teacherId', '==', uid)
      ))
      const pending = assignSnap.docs.filter(d => d.data().status === 'pending').length

      setStats({
        students: studentIds.size,
        slots: slots.length,
        booked: slots.filter(s => s.booked).length,
        packages: pkgSnap.size,
        pending
      })
      setUpcoming(upcomingList)
    }
    fetch()
  }, [])

  const cards = [
    { label: l.totalStudents, value: stats.students, icon: '👨‍🎓', color: 'indigo' },
    { label: l.totalPackages, value: stats.packages, icon: '📦', color: 'purple' },
    { label: l.totalSlots, value: stats.slots, icon: '📅', color: 'blue' },
    { label: l.bookedSlots, value: stats.booked, icon: '🔒', color: 'orange' },
    { label: l.pendingAssignments, value: stats.pending, icon: '📝', color: 'yellow' },
  ]

  const colorMap = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300',
    purple: 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
    blue: 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    orange: 'bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📊 {l.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} 👋
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(card => (
          <div key={card.label}
            className={`rounded-2xl p-4 text-center ${colorMap[card.color]}`}>
            <div className="text-3xl mb-1">{card.icon}</div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming Slots */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">📅 {l.upcomingSlots}</p>
        {upcoming.length === 0
          ? <p className="text-center text-gray-400 text-sm">{l.noUpcoming}</p>
          : upcoming.map(slot => (
            <div key={slot.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium dark:text-white">📅 {slot.date} — 🕐 {slot.time}</p>
                <p className="text-xs text-gray-400">⏱ {slot.duration} {l.minutes}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full
                ${slot.booked
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                  : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'}`}>
                {slot.booked ? '🔒' : '✅'}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
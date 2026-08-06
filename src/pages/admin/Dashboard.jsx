import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { hasRole } from '../../utils/roles'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'لوحة التحكم', welcome: 'أهلاً',
    pendingRegistrations: 'طلبات تسجيل معلقة', pendingPayments: 'طلبات دفع معلقة',
    totalCourses: 'الدورات', totalPackages: 'الباقات',
    totalTeachers: 'المعلمون', totalStudents: 'الطلاب'
  },
  en: {
    title: 'Dashboard', welcome: 'Welcome',
    pendingRegistrations: 'Pending Registrations', pendingPayments: 'Pending Payments',
    totalCourses: 'Courses', totalPackages: 'Packages',
    totalTeachers: 'Teachers', totalStudents: 'Students'
  }
}

export default function Dashboard({ lang, userData, setPage }) {
  const l = labels[lang]
  const [stats, setStats] = useState({
    pendingRegistrations: 0, pendingPayments: 0,
    courses: 0, packages: 0, teachers: 0, students: 0
  })

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, requestsSnap, coursesSnap, packagesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'studentPackages'), where('status', '==', 'pending_approval'))),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'packages'))
      ])
      const users = usersSnap.docs.map(d => d.data())
      setStats({
        pendingRegistrations: users.filter(u => u.status !== 'approved' && u.status !== 'rejected').length,
        pendingPayments: requestsSnap.size,
        courses: coursesSnap.size,
        packages: packagesSnap.size,
        teachers: users.filter(u => hasRole(u, 'teacher')).length,
        students: users.filter(u => hasRole(u, 'student')).length
      })
    }
    fetch()
  }, [])

  const cards = [
    { label: l.pendingRegistrations, value: stats.pendingRegistrations, icon: '🛂', color: 'gold', page: 'registrations' },
    { label: l.pendingPayments, value: stats.pendingPayments, icon: '💳', color: 'deep', page: 'packageRequests' },
    { label: l.totalCourses, value: stats.courses, icon: '📚', color: 'sage', page: 'courses' },
    { label: l.totalPackages, value: stats.packages, icon: '📦', color: 'forest', page: 'courses' },
    { label: l.totalTeachers, value: stats.teachers, icon: '👨‍🏫', color: 'sage', page: 'registrations' },
    { label: l.totalStudents, value: stats.students, icon: '👨‍🎓', color: 'slate', page: 'registrations' },
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          <Icon e="📊" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {l.welcome}، {userData?.name} <Icon e="👋" className="w-5 h-5 inline-block align-[-0.3em]" />
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(card => (
          <button key={card.label} onClick={() => setPage?.(card.page)}
            className={`rounded-2xl p-4 text-center transition hover:opacity-80 hover:scale-[1.02] ${colorMap[card.color]}`}>
            <div className="text-3xl mb-1"><Icon e={card.icon} className="w-8 h-8 inline-block align-[-0.3em]" /></div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-80">{card.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

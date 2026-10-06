import PageContent from './PageContent'
import { useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { getRoles } from '../utils/roles'
import BrandMark from './BrandMark'
import Icon from './Icon'

const teacherNav = [
  { key: 'dashboard', icon: '📊' },
  { key: 'packages', icon: '📦' },
  { key: 'slots', icon: '📅' },
  { key: 'assignments', icon: '📝' },
  { key: 'students', icon: '👨‍🎓' },
  { key: 'messages', icon: '💬' },
  { key: 'profile', icon: '🪪' },
  { key: 'settings', icon: '⚙️' },
]

const studentNav = [
  { key: 'dashboard', icon: '📊' },
  { key: 'courses', icon: '📚' },
  { key: 'teachers', icon: '👨‍🏫' },
  { key: 'myPackage', icon: '📦' },
  { key: 'bookSlot', icon: '📅' },
  { key: 'exams', icon: '🧪' },
  { key: 'assignments', icon: '📝' },
  { key: 'achievements', icon: '🏆' },
  { key: 'messages', icon: '💬' },
  { key: 'settings', icon: '⚙️' },
]

const adminNav = [
  { key: 'dashboard', icon: '📊' },
  { key: 'registrations', icon: '🛂' },
  { key: 'courses', icon: '📚' },
  { key: 'promotions', icon: '📣' },
  { key: 'exams', icon: '🧪' },
  { key: 'examRequests', icon: '🧾' },
  { key: 'packageRequests', icon: '💳' },
  { key: 'sessionsReport', icon: '📈' },
  { key: 'manageTeachers', icon: '👨‍🏫' },
  { key: 'chatLogs', icon: '🗂️' },
  { key: 'settings', icon: '⚙️' },
]

const navLabels = {
  ar: {
    dashboard: 'الرئيسية', packages: 'الباقات', slots: 'المواعيد',
    assignments: 'الواجبات', students: 'الطلاب',
    myPackage: 'باقاتي', bookSlot: 'حجوزاتي', achievements: 'إنجازاتي', exams: 'الاختبارات',
    logout: 'تسجيل الخروج', settings: 'الإعدادات',
    registrations: 'طلبات التسجيل', courses: 'الدورات والباقات', teachers: 'معلمونا', promotions: 'الإعلانات والعروض', packageRequests: 'طلبات الدفع',
    examRequests: 'طلبات شراء الاختبارات',
    sessionsReport: 'تقرير الحصص',
    messages: 'الرسائل', manageTeachers: 'إدارة المعلمين', chatLogs: 'سجل المحادثات', profile: 'ملفي التعريفي'
  },
  en: {
    dashboard: 'Dashboard', packages: 'Packages', slots: 'Slots',
    assignments: 'Assignments', students: 'Students',
    myPackage: 'My Packages', bookSlot: 'My Bookings', achievements: 'Achievements', exams: 'Exams',
    logout: 'Logout', settings: 'Settings',
    registrations: 'Registrations', courses: 'Courses & Packages', teachers: 'Our Teachers', promotions: 'Promotions & Events', packageRequests: 'Payment Requests',
    examRequests: 'Exam Requests',
    sessionsReport: 'Sessions Report',
    messages: 'Messages', manageTeachers: 'Manage Teachers', chatLogs: 'Chat Logs', profile: 'My Profile'
  }
}

const roleLabels = {
  ar: { admin: '👑 إدارة', teacher: '👨‍🏫 معلم', student: '👨‍🎓 طالب' },
  en: { admin: '👑 Admin', teacher: '👨‍🏫 Teacher', student: '👨‍🎓 Student' }
}

export default function Layout({ userData, page, setPage, activeRole, switchRole }) {
  const { theme, setTheme, lang, setLang } = useApp()
  const { i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isAr = lang === 'ar'
  const labels = navLabels[lang]
  const rLabels = roleLabels[lang]
  const roles = getRoles(userData)
  const nav = activeRole === 'admin' ? adminNav
    : activeRole === 'teacher' ? teacherNav : studentNav

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    i18n.changeLanguage(next)
  }

  useEffect(() => {
    if (activeRole === 'admin') return
    const fetchUnread = async () => {
      const uid = auth.currentUser.uid
      // Filtering by `participants` (not recipientId) is what the read rule
      // can actually verify from the query alone; the recipient/read check
      // happens client-side after.
      const snap = await getDocs(query(
        collection(db, 'messages'),
        where('participants', 'array-contains', uid)
      ))
      const count = snap.docs.filter(d => d.data().recipientId === uid && !d.data().read).length
      setUnreadCount(count)
    }
    fetchUnread().catch(console.error)
  }, [page, activeRole])

  const goToPage = (key) => {
    setPage(key)
    if (key === 'messages') setUnreadCount(0)
  }

  return (
    <div className={`min-h-screen flex flex-col ${isAr ? 'rtl' : 'ltr'}`}>

      {/* Top Bar */}
      <header className="bg-indigo-600 dark:bg-indigo-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <button className="md:hidden text-xl" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <BrandMark className="w-9 h-7" />
          <span className="text-lg font-bold" dir="rtl">بروف <span className="font-normal opacity-80">| PROF</span></span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {roles.length > 1 && (
            <select
              value={activeRole}
              onChange={e => switchRole(e.target.value)}
              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-white text-xs">
              {roles.map(r => (
                <option key={r} value={r} className="text-gray-800">{rLabels[r] || r}</option>
              ))}
            </select>
          )}
          <button onClick={toggleLang} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            <Icon e={theme === 'dark' ? '☀️' : '🌙'} className="inline-block w-5 h-5 align-[-0.35em]" />
          </button>
          <span className="hidden md:block opacity-80">{userData?.name}</span>
          <button onClick={() => signOut(auth)}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            {labels.logout}
          </button>
        </div>
      </header>

      <div className="flex flex-1">

        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-52 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 py-4 gap-1">
          {nav.map(item => (
            <button key={item.key}
              onClick={() => goToPage(item.key)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition rounded-lg mx-2 relative
                ${page === item.key
                  ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <Icon e={item.icon} className="w-6 h-6" />
              <span>{labels[item.key]}</span>
              {item.key === 'messages' && unreadCount > 0 && (
                <span className="absolute top-1.5 start-8 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="w-56 bg-white dark:bg-gray-800 shadow-xl flex flex-col py-4 gap-1">
              <div className="px-4 pb-2 flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400" dir="rtl">
                <BrandMark className="w-8 h-6" />
                بروف | PROF
              </div>
              {nav.map(item => (
                <button key={item.key}
                  onClick={() => { goToPage(item.key); setMenuOpen(false) }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition relative
                    ${page === item.key
                      ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <Icon e={item.icon} className="w-6 h-6" />
                  <span>{labels[item.key]}</span>
                  {item.key === 'messages' && unreadCount > 0 && (
                    <span className="absolute top-1.5 start-8 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-y-auto">
          <PageContent page={page} setPage={setPage} userData={userData} lang={lang} activeRole={activeRole} />
        </main>

      </div>
    </div>
  )
}
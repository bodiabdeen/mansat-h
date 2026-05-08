import PageContent from './PageContent'
import { useState } from 'react'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'

const teacherNav = [
  { key: 'dashboard', icon: '📊' },
  { key: 'packages', icon: '📦' },
  { key: 'slots', icon: '📅' },
  { key: 'assignments', icon: '📝' },
  { key: 'students', icon: '👨‍🎓' },
]

const studentNav = [
  { key: 'dashboard', icon: '📊' },
  { key: 'myPackage', icon: '📦' },
  { key: 'bookSlot', icon: '📅' },
  { key: 'assignments', icon: '📝' },
  { key: 'achievements', icon: '🏆' },
]

const navLabels = {
  ar: {
    dashboard: 'الرئيسية', packages: 'الباقات', slots: 'المواعيد',
    assignments: 'الواجبات', students: 'الطلاب',
    myPackage: 'باقتي', bookSlot: 'حجز موعد', achievements: 'إنجازاتي',
    logout: 'تسجيل الخروج', settings: 'الإعدادات'
  },
  en: {
    dashboard: 'Dashboard', packages: 'Packages', slots: 'Slots',
    assignments: 'Assignments', students: 'Students',
    myPackage: 'My Package', bookSlot: 'Book Slot', achievements: 'Achievements',
    logout: 'Logout', settings: 'Settings'
  }
}

export default function Layout({ userData, page, setPage }) {
  const { theme, setTheme, lang, setLang } = useApp()
  const { i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const labels = navLabels[lang]
  const nav = userData?.role === 'teacher' ? teacherNav : studentNav

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    i18n.changeLanguage(next)
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top Bar */}
      <header className="bg-indigo-600 dark:bg-indigo-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <button className="md:hidden text-xl" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <span className="text-lg font-bold">🎓 منصة H</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={toggleLang} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            {theme === 'dark' ? '☀️' : '🌙'}
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
              onClick={() => setPage(item.key)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition rounded-lg mx-2
                ${page === item.key
                  ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <span>{item.icon}</span>
              <span>{labels[item.key]}</span>
            </button>
          ))}
        </aside>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="w-56 bg-white dark:bg-gray-800 shadow-xl flex flex-col py-4 gap-1">
              <div className="px-4 pb-2 font-bold text-indigo-600 dark:text-indigo-400">🎓 منصة H</div>
              {nav.map(item => (
                <button key={item.key}
                  onClick={() => { setPage(item.key); setMenuOpen(false) }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition
                    ${page === item.key
                      ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  <span>{item.icon}</span>
                  <span>{labels[item.key]}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-y-auto">
          <PageContent page={page} userData={userData} lang={lang} />
        </main>

      </div>
    </div>
  )
}
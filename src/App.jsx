import { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { AppProvider, useApp } from './context/AppContext'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Layout from './components/Layout'
import PendingApproval from './pages/PendingApproval'
import { getRoles } from './utils/roles'
import BrandMark from './components/BrandMark'
import InstallPrompt from './components/InstallPrompt'

const ROLE_PRIORITY = ['admin', 'teacher', 'student']

function Main() {
  const { lang } = useApp()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [activeRole, setActiveRole] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [registerFirst, setRegisterFirst] = useState(false)

  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        setUserData(snap.data())
        setUser(u)
      } else {
        setUser(null)
        setUserData(null)
        setActiveRole(null)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !userData) return
    const roles = getRoles(userData)
    const stored = localStorage.getItem(`activeRole_${user.uid}`)
    if (stored && roles.includes(stored)) {
      setActiveRole(stored)
    } else {
      setActiveRole(ROLE_PRIORITY.find(r => roles.includes(r)) || roles[0] || null)
    }

    // Restore whatever page they were last on, so refreshing the browser
    // doesn't bounce them back to the dashboard.
    const storedPage = localStorage.getItem(`page_${user.uid}`)
    if (storedPage) setPage(storedPage)
  }, [user, userData])

  useEffect(() => {
    if (user) localStorage.setItem(`page_${user.uid}`, page)
  }, [page, user])

  const switchRole = (role) => {
    setActiveRole(role)
    if (user) localStorage.setItem(`activeRole_${user.uid}`, role)
    setPage('dashboard')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <BrandMark className="w-12 h-12 animate-spin" />
    </div>
  )

  if (!user) {
    if (!showAuth) {
      return <Landing
        onGetStarted={() => { setRegisterFirst(true); setShowAuth(true) }}
        onLogin={() => { setRegisterFirst(false); setShowAuth(true) }} />
    }
    return <Login initialRegister={registerFirst} onBack={() => setShowAuth(false)} />
  }

  if (userData?.status !== 'approved') {
    return <PendingApproval lang={lang} status={userData?.status} />
  }

  if (!activeRole) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <BrandMark className="w-12 h-12 animate-spin" />
    </div>
  )

  return <Layout userData={userData} page={page} setPage={setPage}
    activeRole={activeRole} switchRole={switchRole} />
}

export default function App() {
  return (
    <AppProvider>
      <Main />
      <InstallPrompt />
    </AppProvider>
  )
}
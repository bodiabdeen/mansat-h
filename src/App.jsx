import { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { AppProvider, useApp } from './context/AppContext'
import Login from './pages/Login'
import Layout from './components/Layout'

function Main() {
  const { lang } = useApp()
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

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
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-4xl animate-spin">🎓</div>
    </div>
  )

  if (!user) return <Login />

  return <Layout userData={userData} page={page} setPage={setPage} />
}

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  )
}
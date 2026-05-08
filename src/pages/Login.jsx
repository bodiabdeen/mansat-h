import { useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import '../i18n'

export default function Login() {
  const { t, i18n } = useTranslation()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const isAr = i18n.language === 'ar'

  const handle = async () => {
    setError('')
    try {
      if (isRegister) {
        const res = await createUserWithEmailAndPassword(auth, form.email, form.password)
        await setDoc(doc(db, 'users', res.user.uid), {
          name: form.name, email: form.email, role: form.role, uid: res.user.uid,
          createdAt: new Date()
        })
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${isAr ? 'rtl' : 'ltr'}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-sm">
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t('appName')}</h1>
        </div>

        <div className="space-y-3">
          {isRegister && (
            <input className="input" placeholder={t('name')}
              onChange={e => setForm({...form, name: e.target.value})} />
          )}
          <input className="input" placeholder={t('email')} type="email"
            onChange={e => setForm({...form, email: e.target.value})} />
          <input className="input" placeholder={t('password')} type="password"
            onChange={e => setForm({...form, password: e.target.value})} />

          {isRegister && (
            <select className="input" onChange={e => setForm({...form, role: e.target.value})}>
              <option value="student">{t('student')}</option>
              <option value="teacher">{t('teacher')}</option>
            </select>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={handle}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
            {isRegister ? t('register') : t('login')}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {isRegister ? t('hasAccount') : t('noAccount')}{' '}
            <span className="text-indigo-500 cursor-pointer" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? t('login') : t('register')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
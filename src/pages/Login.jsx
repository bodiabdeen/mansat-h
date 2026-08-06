import { useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import '../i18n'

export default function Login({ initialRegister = false, onBack }) {
  const { t, i18n } = useTranslation()
  const [isRegister, setIsRegister] = useState(initialRegister)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const isAr = i18n.language === 'ar'

  const handle = async () => {
    setError('')
    try {
      if (isRegister) {
        const res = await createUserWithEmailAndPassword(auth, form.email, form.password)
        await setDoc(doc(db, 'users', res.user.uid), {
          name: form.name, email: form.email, role: form.role, roles: [form.role], uid: res.user.uid,
          status: 'pending', createdAt: new Date()
        })
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  const handleReset = async () => {
    setError('')
    try {
      await sendPasswordResetEmail(auth, form.email)
      setResetSent(true)
    } catch (e) {
      setError(e.message)
    }
  }

  const backToLogin = () => {
    setShowReset(false)
    setResetSent(false)
    setError('')
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4
      bg-[radial-gradient(ellipse_at_top,_#F5EBD1,_#F3F4F6)] dark:bg-[radial-gradient(ellipse_at_top,_#142842,_#06101B)]
      ${isAr ? 'rtl' : 'ltr'}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-sm border border-gold-100 dark:border-gray-700">

        {onBack && (
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-indigo-500 mb-3 transition">
            {isAr ? '→' : '←'} {t('backToHome')}
          </button>
        )}

        <div className="text-center mb-6">
          <img src="/logo-icon-transparent.png" alt="" className="w-20 mx-auto" />
          <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-2">{t('appName')}</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold-600 dark:text-gold-400">The Professor</p>
          <p className="text-xs text-gray-400 mt-1">{t('appTagline')}</p>
        </div>

        {showReset ? (
          <div className="space-y-3">
            {resetSent ? (
              <p className="text-green-600 dark:text-green-400 text-sm text-center">{t('resetSent')}</p>
            ) : (
              <>
                <input className="input" placeholder={t('email')} type="email"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleReset}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
                  {t('sendResetLink')}
                </button>
              </>
            )}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              <span className="text-indigo-500 cursor-pointer" onClick={backToLogin}>
                {t('backToLogin')}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {isRegister && (
              <input className="input" placeholder={t('name')}
                onChange={e => setForm({...form, name: e.target.value})} />
            )}
            <input className="input" placeholder={t('email')} type="email"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
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

            {!isRegister && (
              <p className="text-center text-sm">
                <span className="text-indigo-500 cursor-pointer" onClick={() => { setShowReset(true); setError('') }}>
                  {t('forgotPassword')}
                </span>
              </p>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {isRegister ? t('hasAccount') : t('noAccount')}{' '}
              <span className="text-indigo-500 cursor-pointer" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? t('login') : t('register')}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
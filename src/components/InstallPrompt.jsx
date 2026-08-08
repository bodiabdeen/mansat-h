import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import Icon from './Icon'

const DISMISS_KEY = 'installPromptDismissedAt'
const DISMISS_DAYS = 14

const labels = {
  ar: {
    title: 'ثبّت تطبيق بروف',
    body: 'أضِف بروف إلى شاشتك الرئيسية لتجربة أسرع، كتطبيق حقيقي',
    iosBody: 'اضغط على زر المشاركة، ثم اختر "إضافة إلى الشاشة الرئيسية"',
    install: 'تثبيت', dismiss: 'ليس الآن'
  },
  en: {
    title: 'Install the PROF app',
    body: 'Add PROF to your home screen for a faster, app-like experience',
    iosBody: 'Tap the Share button, then "Add to Home Screen"',
    install: 'Install', dismiss: 'Not now'
  }
}

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function InstallPrompt() {
  const { lang } = useApp()
  const l = labels[lang]
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (!isMobile() || isStandalone()) return
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return

    if (isIos()) {
      setIosHint(true)
      setVisible(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-3 inset-x-3 z-[100] md:hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3 flex items-center gap-3">
        <img src="/logo-icon.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white">{l.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{iosHint ? l.iosBody : l.body}</p>
        </div>
        <div className="flex flex-col items-stretch gap-1 shrink-0">
          {!iosHint && (
            <button onClick={install}
              className="flex items-center justify-center gap-1 bg-gold-500 hover:bg-gold-400 text-indigo-900 text-xs font-bold px-3 py-1.5 rounded-lg transition">
              <Icon e="📲" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.install}
            </button>
          )}
          <button onClick={dismiss} className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {l.dismiss}
          </button>
        </div>
      </div>
    </div>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'ar')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
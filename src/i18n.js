import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ar: {
    translation: {
      appName: 'منصة H',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      name: 'الاسم الكامل',
      role: 'نوع الحساب',
      teacher: 'معلم',
      student: 'طالب',
      submit: 'دخول',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟',
    }
  },
  en: {
    translation: {
      appName: 'Mansat H',
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      role: 'Account Type',
      teacher: 'Teacher',
      student: 'Student',
      submit: 'Login',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false }
})

export default i18n
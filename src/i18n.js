import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ar: {
    translation: {
      appName: 'بروف',
      appTagline: 'منصة تعليمية ذكية تُلهم التميز',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      name: 'الاسم الكامل',
      role: 'نوع الحساب',
      teacher: 'معلم',
      student: 'طالب',
      admin: 'إدارة',
      submit: 'دخول',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟',
      forgotPassword: 'نسيت كلمة المرور؟',
      sendResetLink: 'إرسال رابط إعادة التعيين',
      resetSent: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني ✅',
      backToLogin: 'العودة لتسجيل الدخول',
      backToHome: 'العودة للصفحة الرئيسية',
    }
  },
  en: {
    translation: {
      appName: 'PROF',
      appTagline: 'Intelligent EdTech Platform Inspiring Excellence',
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      role: 'Account Type',
      teacher: 'Teacher',
      student: 'Student',
      admin: 'Admin',
      submit: 'Login',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      forgotPassword: 'Forgot password?',
      sendResetLink: 'Send Reset Link',
      resetSent: 'Reset link sent to your email ✅',
      backToLogin: 'Back to Login',
      backToHome: 'Back to Home',
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
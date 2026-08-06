import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import Icon from '../components/Icon'

const labels = {
  ar: {
    pendingTitle: 'حسابك قيد المراجعة',
    pendingBody: 'تم استلام طلب تسجيلك بنجاح. سيقوم أحد المسؤولين بمراجعة الحساب والموافقة عليه قريباً.',
    rejectedTitle: 'تم رفض طلب التسجيل',
    rejectedBody: 'نأسف، تم رفض طلب تسجيل هذا الحساب. للاستفسار يرجى التواصل مع الإدارة.',
    logout: 'تسجيل الخروج'
  },
  en: {
    pendingTitle: 'Your account is pending approval',
    pendingBody: 'Your registration was received. An admin will review and approve your account shortly.',
    rejectedTitle: 'Registration rejected',
    rejectedBody: 'Sorry, this account registration was rejected. Please contact the administration for details.',
    logout: 'Logout'
  }
}

export default function PendingApproval({ lang, status }) {
  const l = labels[lang] || labels.en
  const isRejected = status === 'rejected'

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">
          {isRejected
            ? <Icon e="🚫" className="w-16 h-16 inline-block align-[-0.3em]" />
            : <Icon e="⏳" className="w-16 h-16 inline-block align-[-0.3em]" />}
        </div>
        <h1 className={`text-xl font-bold ${isRejected ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {isRejected ? l.rejectedTitle : l.pendingTitle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isRejected ? l.rejectedBody : l.pendingBody}
        </p>
        <button onClick={() => signOut(auth)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
          {l.logout}
        </button>
      </div>
    </div>
  )
}

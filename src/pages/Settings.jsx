import { useState } from 'react'
import { auth, db } from '../firebase'
import {
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { doc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'الإعدادات',
    passwordSection: 'تغيير كلمة المرور',
    resetPassword: 'إرسال رابط إعادة تعيين كلمة المرور',
    resetSent: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني ✅',
    dangerZone: 'منطقة الخطر',
    deleteAccount: 'حذف الحساب',
    deleteWarning: 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائياً.',
    confirmDelete: 'هل أنت متأكد؟ أدخل كلمة المرور للتأكيد',
    password: 'كلمة المرور',
    confirmBtn: 'تأكيد الحذف',
    cancel: 'إلغاء',
    deleting: 'جارٍ الحذف...',
    wrongPassword: 'كلمة المرور غير صحيحة',
    error: 'حدث خطأ، حاول مرة أخرى',
    accountInfo: 'معلومات الحساب',
    email: 'البريد الإلكتروني',
    role: 'نوع الحساب',
    teacher: 'معلم',
    student: 'طالب',
    sending: 'جارٍ الإرسال...'
  },
  en: {
    title: 'Settings',
    passwordSection: 'Change Password',
    resetPassword: 'Send Password Reset Email',
    resetSent: 'Reset link sent to your email ✅',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteWarning: 'This action cannot be undone. All your data will be permanently deleted.',
    confirmDelete: 'Are you sure? Enter your password to confirm',
    password: 'Password',
    confirmBtn: 'Confirm Delete',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    wrongPassword: 'Incorrect password',
    error: 'An error occurred, please try again',
    accountInfo: 'Account Info',
    email: 'Email',
    role: 'Account Type',
    teacher: 'Teacher',
    student: 'Student',
    sending: 'Sending...'
  }
}

export default function Settings({ lang, userData }) {
  const l = labels[lang]
  const [resetSent, setResetSent] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleResetPassword = async () => {
    setSendingReset(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email)
      setResetSent(true)
    } catch (e) {
      setError(l.error)
    }
    setSendingReset(false)
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setError('')
    try {
      const user = auth.currentUser
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, deletePassword)
      await reauthenticateWithCredential(user, credential)

      const uid = user.uid
      const batch = writeBatch(db)

      // Delete user doc
      batch.delete(doc(db, 'users', uid))

      // Delete user's data based on role
      const collections = userData?.role === 'teacher'
        ? ['packages', 'slots', 'assignments']
        : ['studentPackages', 'bookings', 'assignments', 'rewards']

      for (const col of collections) {
        const field = userData?.role === 'teacher' ? 'teacherId' : 'studentId'
        const snap = await getDocs(query(collection(db, col), where(field, '==', uid)))
        snap.docs.forEach(d => batch.delete(d.ref))
      }

      await batch.commit()
      await deleteUser(user)
      // Auth state change will redirect to login automatically
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError(l.wrongPassword)
      } else {
        setError(l.error + ' ' + e.message)
      }
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">⚙️ {l.title}</h2>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">👤 {l.accountInfo}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">{l.email}</span>
            <span className="text-sm font-medium dark:text-white">{auth.currentUser?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{l.role}</span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium
              ${userData?.role === 'teacher'
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'}`}>
              {userData?.role === 'teacher' ? `👨‍🏫 ${l.teacher}` : `👨‍🎓 ${l.student}`}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">🔐 {l.passwordSection}</p>
        {resetSent
          ? <p className="text-green-600 dark:text-green-400 text-sm">{l.resetSent}</p>
          : (
            <button
              onClick={handleResetPassword}
              disabled={sendingReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition">
              {sendingReset ? `⏳ ${l.sending}` : `📧 ${l.resetPassword}`}
            </button>
          )
        }
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-5 space-y-4">
        <p className="font-semibold text-red-600 dark:text-red-400">⚠️ {l.dangerZone}</p>
        <p className="text-sm text-red-500 dark:text-red-400">{l.deleteWarning}</p>

        {!showDeleteConfirm
          ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition">
              🗑️ {l.deleteAccount}
            </button>
          )
          : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{l.confirmDelete}</p>
              <input
                type="password"
                className="input border-red-300 dark:border-red-700 focus:ring-red-500"
                placeholder={l.password}
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setError('') }}
                  disabled={deleting}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-semibold transition">
                  {l.cancel}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
                  {deleting ? `⏳ ${l.deleting}` : `🗑️ ${l.confirmBtn}`}
                </button>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { getRoles, hasRole, ALL_ROLES } from '../../utils/roles'
import { deleteUserData } from '../../utils/deleteAccount'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'طلبات التسجيل', noPending: 'لا توجد طلبات تسجيل قيد الانتظار',
    approve: 'موافقة', reject: 'رفض', role: 'الدور',
    teacher: 'معلم', student: 'طالب', admin: 'إدارة',
    rejectNote: 'الرفض يمنع الحساب من استخدام التطبيق فقط، ولا يحذف حساب الدخول',
    rejected: 'الحسابات المرفوضة', approvedNote: 'تمت الموافقة',
    manageRoles: 'إدارة الأدوار', roles: 'الأدوار',
    delete: 'حذف الحساب',
    deleteConfirm: 'سيتم حذف بيانات هذا المستخدم نهائياً (باقاته وحجوزاته وواجباته). لا يمكن التراجع. هل أنت متأكد؟',
    deleteNote: 'الحذف يمسح بيانات المستخدم من التطبيق، لكن لا يمكن حذف حساب الدخول (Firebase Auth) من هنا',
    actionFailed: 'فشلت العملية. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Registrations', noPending: 'No pending registrations',
    approve: 'Approve', reject: 'Reject', role: 'Role',
    teacher: 'Teacher', student: 'Student', admin: 'Admin',
    rejectNote: 'Rejecting only blocks app access — it does not delete the login account',
    rejected: 'Rejected Accounts', approvedNote: 'Approved',
    manageRoles: 'Manage Roles', roles: 'Roles',
    delete: 'Delete Account',
    deleteConfirm: 'This permanently deletes this user\'s data (packages, bookings, assignments). Cannot be undone. Are you sure?',
    deleteNote: 'Deleting removes the user\'s app data, but their Firebase Auth login credential can\'t be removed from here',
    actionFailed: 'Action failed. Try again.\n\n'
  }
}

const roleIcon = { teacher: '👨‍🏫', student: '👨‍🎓', admin: '👑' }

export default function Registrations({ lang }) {
  const l = labels[lang]
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // One-time backfill: accounts created before multi-role support only have
      // a single `role` string — mirror it into a `roles` array so array-contains
      // queries elsewhere in the app can see them.
      const batch = writeBatch(db)
      let needsBackfill = false
      list.forEach(u => {
        if (!u.roles?.length && u.role) {
          batch.update(doc(db, 'users', u.id), { roles: [u.role] })
          u.roles = [u.role]
          needsBackfill = true
        }
      })
      if (needsBackfill) await batch.commit()

      setUsers(list)
    } catch (err) {
      alert(l.actionFailed + err.message)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const setStatus = async (uid, status) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', uid), { status })
      await fetchUsers()
    } catch (err) {
      alert(l.actionFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (u) => {
    if (u.id === auth.currentUser?.uid) return
    if (!window.confirm(l.deleteConfirm)) return
    setLoading(true)
    try {
      await deleteUserData(u.id, u)
      await fetchUsers()
    } catch (err) {
      alert(l.actionFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = async (u, role) => {
    const current = getRoles(u)
    const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role]
    if (next.length === 0) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', u.id), { roles: next })
      await fetchUsers()
    } catch (err) {
      alert(l.actionFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const pending = users.filter(u => u.status !== 'approved' && u.status !== 'rejected')
  const rejected = users.filter(u => u.status === 'rejected')
  const approved = users.filter(u => u.status === 'approved')

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="🛂" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>
      <p className="text-xs text-gray-400">{l.rejectNote}</p>
      <p className="text-xs text-gray-400">{l.deleteNote}</p>

      <div className="space-y-3">
        {pending.length === 0 && (
          <p className="text-center text-gray-400">{l.noPending}</p>
        )}
        {pending.map(u => (
          <div key={u.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">
                <Icon e={roleIcon[u.role] || '👤'} className="w-5 h-5 inline-block align-[-0.3em]" /> {u.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400">
                {l.role}: {l[u.role] || u.role}
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => setStatus(u.id, 'approved')} disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg font-semibold transition">
                <Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.approve}
              </button>
              <button onClick={() => setStatus(u.id, 'rejected')} disabled={loading}
                className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                {l.reject}
              </button>
              <button onClick={() => deleteUser(u)} disabled={loading}
                className="text-red-600 hover:text-red-800 text-xs px-3 py-1 rounded-lg border border-red-300 hover:border-red-500 transition">
                <Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.delete}
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejected.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{l.rejected}</p>
          {rejected.map(u => (
            <div key={u.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between opacity-70">
              <div>
                <p className="text-sm font-medium dark:text-white">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setStatus(u.id, 'approved')} disabled={loading}
                  className="text-green-500 hover:text-green-700 text-xs px-2 py-1 rounded border border-green-200 hover:border-green-400 transition">
                  {l.approve}
                </button>
                <button onClick={() => deleteUser(u)} disabled={loading}
                  className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition">
                  <Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role management for approved users */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{l.manageRoles}</p>
        {approved.map(u => {
          const isSelf = u.id === auth.currentUser?.uid
          return (
            <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium dark:text-white">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {ALL_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                    <input type="checkbox"
                      checked={hasRole(u, role)}
                      disabled={loading || (isSelf && role === 'admin')}
                      onChange={() => toggleRole(u, role)}
                      className="accent-indigo-600" />
                    <Icon e={roleIcon[role]} className="w-4 h-4 inline-block align-[-0.3em]" /> {l[role]}
                  </label>
                ))}
                {!isSelf && (
                  <button onClick={() => deleteUser(u)} disabled={loading}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition">
                    <Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

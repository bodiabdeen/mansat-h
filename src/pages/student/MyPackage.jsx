import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'باقاتي', noPackages: 'لا توجد باقات مُعيَّنة لك بعد',
    remaining: 'متبقي', used: 'مستخدم', total: 'الإجمالي',
    lessons: 'حصة', teacher: 'المعلم', active: 'نشطة', finished: 'منتهية',
    progress: 'التقدم', pending: 'بانتظار الموافقة',
    pendingNote: 'بانتظار موافقة الإدارة على الدفع',
    unpaid: 'لم يُدفع', partial: 'دفع جزئي', paid: 'دُفع بالكامل',
    tapToBook: 'اضغط لحجز موعد ←'
  },
  en: {
    title: 'My Packages', noPackages: 'No packages assigned to you yet',
    remaining: 'Remaining', used: 'Used', total: 'Total',
    lessons: 'lessons', teacher: 'Teacher', active: 'Active', finished: 'Finished',
    progress: 'Progress', pending: 'Awaiting Approval',
    pendingNote: 'Awaiting admin payment approval',
    unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Fully Paid',
    tapToBook: 'Tap to book a slot →'
  }
}

export default function MyPackage({ lang, setPage }) {
  const l = labels[lang]
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, 'studentPackages'),
        where('studentId', '==', auth.currentUser.uid)
      ))
      const list = await Promise.all(snap.docs.map(async d => {
        const data = { id: d.id, ...d.data() }
        // Get teacher name
        try {
          const teacherSnap = await getDoc(doc(db, 'users', data.teacherId))
          if (teacherSnap.exists()) {
            data.teacherName = teacherSnap.data().name || ''
          }
        } catch (e) {
          data.teacherName = ''
        }
        return data
      }))
      list.sort((a, b) => b.selectedAt?.toDate() - a.selectedAt?.toDate())
      setPackages(list)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin"><Icon e="📦" className="w-10 h-10 inline-block" /></div>
    </div>
  )

  const pendingPackages = packages.filter(p => p.status === 'pending_approval')
  const activePackages = packages.filter(p => p.status !== 'pending_approval' && p.remainingLessons > 0)
  const finishedPackages = packages.filter(p => p.status !== 'pending_approval' && p.remainingLessons === 0)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400"><Icon e="📦" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}</h2>

      {packages.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="mb-3"><Icon e="📦" className="w-14 h-14 inline-block" /></div>
          <p>{l.noPackages}</p>
        </div>
      )}

      {/* Pending approval */}
      {pendingPackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400"><Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.pending}</p>
          {pendingPackages.map(pkg => (
            <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-1">
              <p className="font-bold text-gray-800 dark:text-white text-lg">{pkg.packageName}</p>
              {pkg.teacherName && (
                <p className="text-sm text-indigo-500 dark:text-indigo-400"><Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {pkg.teacherName}</p>
              )}
              <p className="text-xs text-yellow-600 dark:text-yellow-400">{l.pendingNote}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active packages */}
      {activePackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400"><Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.active}</p>
          {activePackages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} l={l} onClick={() => {
              localStorage.setItem('bookSlotInitialTab', 'available')
              setPage?.('bookSlot')
            }} />
          ))}
        </div>
      )}

      {/* Finished packages */}
      {finishedPackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400"><Icon e="🏁" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.finished}</p>
          {finishedPackages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} l={l} finished />
          ))}
        </div>
      )}
    </div>
  )
}

function PackageCard({ pkg, l, finished, onClick }) {
  const usedPercent = pkg.totalLessons
    ? ((pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons) * 100
    : 0

  return (
    <div onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3
      ${finished ? 'opacity-60' : ''} ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">{pkg.packageName}</p>
          {pkg.teacherName && (
            <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-0.5">
              <Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {pkg.teacherName}
            </p>
          )}
          {pkg.paymentStatus && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium
              ${pkg.paymentStatus === 'paid'
                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                : pkg.paymentStatus === 'partial'
                ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                : 'bg-red-100 text-red-500 dark:bg-red-900 dark:text-red-300'}`}>
              {l[pkg.paymentStatus] || pkg.paymentStatus}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300">{pkg.remainingLessons}</p>
          <p className="text-xs text-gray-400">{l.remaining}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{pkg.totalLessons - pkg.remainingLessons} {l.used}</span>
          <span>{pkg.totalLessons} {l.total}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${finished ? 'bg-gray-400' : 'bg-indigo-600'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      {onClick && (
        <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium text-end">{l.tapToBook}</p>
      )}
    </div>
  )
}

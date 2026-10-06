import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import Icon from '../../components/Icon'
import PageHero from '../../components/PageHero'

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
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHero icon="📦" title={l.title} />

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
          <div className="grid sm:grid-cols-2 gap-3">
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
        </div>
      )}

      {/* Active packages */}
      {activePackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400"><Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.active}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {activePackages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} l={l} onClick={() => {
                localStorage.setItem('bookSlotInitialTab', 'available')
                setPage?.('bookSlot')
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Finished packages */}
      {finishedPackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400"><Icon e="🏁" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.finished}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {finishedPackages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} l={l} finished />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PackageCard({ pkg, l, finished, onClick }) {
  const usedFraction = pkg.totalLessons
    ? (pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons
    : 0
  const gradId = `myPkgRingGrad-${pkg.id}`

  return (
    <div onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-5 flex items-center gap-4
      ${finished ? 'opacity-60' : ''} ${onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}>
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={finished ? '#9CA3AF' : '#E0C15C'} />
              <stop offset="1" stopColor={finished ? '#6B7280' : '#B8952B'} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="42" className="fill-none stroke-gray-200 dark:stroke-gray-700" strokeWidth="9" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#${gradId})`}
            strokeWidth="9" strokeLinecap="round" style={{ strokeDasharray: `${usedFraction * 264} 264` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">{pkg.remainingLessons}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-800 dark:text-white text-base truncate">{pkg.packageName}</p>
        {pkg.teacherName && (
          <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-0.5">
            <Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {pkg.teacherName}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {pkg.totalLessons - pkg.remainingLessons} {l.used} / {pkg.totalLessons} {l.total}
        </p>
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
        {onClick && (
          <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mt-1">{l.tapToBook}</p>
        )}
      </div>
    </div>
  )
}

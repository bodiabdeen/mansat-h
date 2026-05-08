import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'باقاتي', noPackages: 'لا توجد باقات مُعيَّنة لك بعد',
    remaining: 'متبقي', used: 'مستخدم', total: 'الإجمالي',
    lessons: 'حصة', teacher: 'المعلم', active: 'نشطة', finished: 'منتهية',
    progress: 'التقدم'
  },
  en: {
    title: 'My Packages', noPackages: 'No packages assigned to you yet',
    remaining: 'Remaining', used: 'Used', total: 'Total',
    lessons: 'lessons', teacher: 'Teacher', active: 'Active', finished: 'Finished',
    progress: 'Progress'
  }
}

export default function MyPackage({ lang }) {
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
      <div className="text-3xl animate-spin">📦</div>
    </div>
  )

  const activePackages = packages.filter(p => p.remainingLessons > 0)
  const finishedPackages = packages.filter(p => p.remainingLessons === 0)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📦 {l.title}</h2>

      {packages.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📦</div>
          <p>{l.noPackages}</p>
        </div>
      )}

      {/* Active packages */}
      {activePackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">✅ {l.active}</p>
          {activePackages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} l={l} />
          ))}
        </div>
      )}

      {/* Finished packages */}
      {finishedPackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400">🏁 {l.finished}</p>
          {finishedPackages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} l={l} finished />
          ))}
        </div>
      )}
    </div>
  )
}

function PackageCard({ pkg, l, finished }) {
  const usedPercent = pkg.totalLessons
    ? ((pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons) * 100
    : 0

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3
      ${finished ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">{pkg.packageName}</p>
          {pkg.teacherName && (
            <p className="text-sm text-indigo-500 dark:text-indigo-400 mt-0.5">
              👨‍🏫 {pkg.teacherName}
            </p>
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'باقتي', available: 'الباقات المتاحة', lessons: 'حصة',
    currency: 'ريال', noPackages: 'لا توجد باقات متاحة',
    myPackage: 'باقتي الحالية', remaining: 'الحصص المتبقية',
    total: 'إجمالي الحصص', active: 'نشطة', noPackage: 'لم يتم تعيين باقة بعد',
    contactTeacher: 'تواصل مع المعلم لتفعيل باقتك'
  },
  en: {
    title: 'My Package', available: 'Available Packages', lessons: 'lessons',
    currency: 'SAR', noPackages: 'No packages available',
    myPackage: 'My Current Package', remaining: 'Remaining Lessons',
    total: 'Total Lessons', active: 'Active', noPackage: 'No package assigned yet',
    contactTeacher: 'Contact your teacher to activate your package'
  }
}

export default function MyPackage({ lang }) {
  const l = labels[lang]
  const [packages, setPackages] = useState([])
  const [myPackage, setMyPackage] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'packages'))
      setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      const mySnap = await getDoc(doc(db, 'studentPackages', auth.currentUser.uid))
      if (mySnap.exists()) setMyPackage(mySnap.data())
    }
    fetch()
  }, [])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📦 {l.title}</h2>

      {/* My current package */}
      {myPackage ? (
        <div className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl shadow p-4 space-y-2">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">✅ {l.myPackage}</p>
          <p className="text-lg font-bold dark:text-white">{myPackage.packageName}</p>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span>📚 {l.total}: {myPackage.totalLessons}</span>
            <span>⏳ {l.remaining}: {myPackage.remainingLessons}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${(myPackage.remainingLessons / myPackage.totalLessons) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400">{l.active} ✓</p>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900 rounded-2xl p-4 text-center space-y-1">
          <p className="text-yellow-700 dark:text-yellow-300 font-semibold">{l.noPackage}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{l.contactTeacher}</p>
        </div>
      )}

      {/* Available packages — view only */}
      <div className="space-y-3">
        <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">📋 {l.available}</p>
        {packages.length === 0 && <p className="text-center text-gray-400">{l.noPackages}</p>}
        {packages.map(pkg => (
          <div key={pkg.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{pkg.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                📚 {pkg.lessons} {l.lessons} — 💰 {pkg.price} {l.currency}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
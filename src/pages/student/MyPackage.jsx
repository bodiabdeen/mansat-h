import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs, query, where, doc, setDoc, getDoc } from 'firebase/firestore'
import { auth } from '../../firebase'

const labels = {
  ar: {
    title: 'باقتي', available: 'الباقات المتاحة', select: 'اختر هذه الباقة',
    lessons: 'حصة', currency: 'ريال', noPackages: 'لا توجد باقات متاحة',
    myPackage: 'باقتي الحالية', remaining: 'الحصص المتبقية',
    total: 'إجمالي الحصص', status: 'الحالة', active: 'نشطة',
    alreadyHas: 'لديك باقة نشطة بالفعل', selected: 'تم الاختيار ✓'
  },
  en: {
    title: 'My Package', available: 'Available Packages', select: 'Select Package',
    lessons: 'lessons', currency: 'SAR', noPackages: 'No packages available',
    myPackage: 'My Current Package', remaining: 'Remaining Lessons',
    total: 'Total Lessons', status: 'Status', active: 'Active',
    alreadyHas: 'You already have an active package', selected: 'Selected ✓'
  }
}

export default function MyPackage({ lang }) {
  const l = labels[lang]
  const [packages, setPackages] = useState([])
  const [myPackage, setMyPackage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(null)

  const fetchData = async () => {
    // fetch all packages from all teachers
    const snap = await getDocs(collection(db, 'packages'))
    setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })))

    // fetch student's package
    const mySnap = await getDoc(doc(db, 'studentPackages', auth.currentUser.uid))
    if (mySnap.exists()) setMyPackage(mySnap.data())
  }

  useEffect(() => { fetchData() }, [])

  const selectPackage = async (pkg) => {
    if (myPackage) return alert(l.alreadyHas)
    setSelecting(pkg.id)
    setLoading(true)
    await setDoc(doc(db, 'studentPackages', auth.currentUser.uid), {
      packageId: pkg.id,
      packageName: pkg.name,
      teacherId: pkg.teacherId,
      totalLessons: pkg.lessons,
      remainingLessons: pkg.lessons,
      price: pkg.price,
      studentId: auth.currentUser.uid,
      selectedAt: new Date(),
      status: 'active'
    })
    await fetchData()
    setLoading(false)
    setSelecting(null)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📦 {l.title}</h2>

      {/* My current package */}
      {myPackage && (
        <div className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl shadow p-4 space-y-2">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">✅ {l.myPackage}</p>
          <p className="text-lg font-bold dark:text-white">{myPackage.packageName}</p>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span>📚 {l.total}: {myPackage.totalLessons}</span>
            <span>⏳ {l.remaining}: {myPackage.remainingLessons}</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${(myPackage.remainingLessons / myPackage.totalLessons) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400">{l.status}: {l.active}</p>
        </div>
      )}

      {/* Available packages */}
      {!myPackage && (
        <div className="space-y-3">
          <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">{l.available}</p>
          {packages.length === 0 && (
            <p className="text-center text-gray-400">{l.noPackages}</p>
          )}
          {packages.map(pkg => (
            <div key={pkg.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{pkg.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📚 {pkg.lessons} {l.lessons} — 💰 {pkg.price} {l.currency}
                </p>
              </div>
              <button
                onClick={() => selectPackage(pkg)}
                disabled={loading && selecting === pkg.id}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
                {loading && selecting === pkg.id ? '...' : l.select}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'الباقات', lessons_: 'حصة', price_: 'السعر', currency: 'ريال',
    noPackages: 'لا توجد باقات بعد', viewOnlyNote: 'الباقات يتم إنشاؤها من قِبل الإدارة'
  },
  en: {
    title: 'Packages', lessons_: 'lessons', price_: 'Price', currency: 'SAR',
    noPackages: 'No packages yet', viewOnlyNote: 'Packages are created by the admin'
  }
}

export default function Packages({ lang }) {
  const l = labels[lang]
  const [packages, setPackages] = useState([])
  const [courses, setCourses] = useState([])

  useEffect(() => {
    const fetchPackages = async () => {
      const [pkgSnap, courseSnap] = await Promise.all([
        getDocs(collection(db, 'packages')),
        getDocs(collection(db, 'courses'))
      ])
      setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    fetchPackages()
  }, [])

  const courseName = (courseId) => courses.find(c => c.id === courseId)?.name || '—'

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📦" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
      </h2>
      <p className="text-xs text-gray-400">{l.viewOnlyNote}</p>

      <div className="space-y-3">
        {packages.length === 0 && (
          <p className="text-center text-gray-400">{l.noPackages}</p>
        )}
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
            <p className="font-bold text-gray-800 dark:text-white">{pkg.name}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400"><Icon e="📚" className="w-4 h-4 inline-block align-[-0.3em]" /> {courseName(pkg.courseId)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pkg.lessons} {l.lessons_} — {pkg.price} {pkg.currency || l.currency}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

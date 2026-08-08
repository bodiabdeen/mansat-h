import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'
import Icon from './Icon'

const labels = {
  ar: {
    title: 'الدورات التي يدرّسها', noCourses: 'لا توجد دورات بعد',
    save: 'حفظ', saved: 'تم الحفظ ✅', saving: 'جارٍ الحفظ...',
    saveError: 'حدث خطأ أثناء الحفظ، حاول مرة أخرى.'
  },
  en: {
    title: 'Courses Taught', noCourses: 'No courses yet',
    save: 'Save', saved: 'Saved ✅', saving: 'Saving...',
    saveError: 'Something went wrong while saving. Please try again.'
  }
}

export default function TeacherCoursesForm({ lang, teacherId }) {
  const l = labels[lang]
  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [courseSnap, profileSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDoc(doc(db, 'teacherProfiles', teacherId))
      ])
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSelected(profileSnap.exists() ? (profileSnap.data().courseIds || []) : [])
      setSaved(false)
      setError('')
    }
    fetchData()
  }, [teacherId])

  const toggle = (courseId) => {
    setSelected(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId])
  }

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      await setDoc(doc(db, 'teacherProfiles', teacherId), { courseIds: selected }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(l.saveError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
      <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
        <Icon e="📚" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.title}
      </p>
      {courses.length === 0 ? (
        <p className="text-sm text-gray-400">{l.noCourses}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {courses.map(c => (
            <button key={c.id} onClick={() => toggle(c.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border
                ${selected.includes(c.id)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
        {loading
          ? <><Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.saving}</>
          : (saved ? l.saved : l.save)}
      </button>
    </div>
  )
}

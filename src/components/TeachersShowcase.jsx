import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import SlotCalendar from './SlotCalendar'
import Icon from './Icon'

const labels = {
  ar: {
    noTeachers: 'ملفات المعلمين قادمة قريباً',
    coursesLabel: 'الدورات:',
    viewAvailability: 'عرض المواعيد المتاحة', noAvailability: 'لا توجد مواعيد متاحة حالياً',
    close: 'إغلاق'
  },
  en: {
    noTeachers: 'Teacher profiles coming soon',
    coursesLabel: 'Courses:',
    viewAvailability: 'View Availability', noAvailability: 'No availability yet',
    close: 'Close'
  }
}

export default function TeachersShowcase({ lang }) {
  const l = labels[lang]
  const [teachers, setTeachers] = useState([])
  const [courses, setCourses] = useState([])
  const [slotsByTeacher, setSlotsByTeacher] = useState({})
  const [openTeacher, setOpenTeacher] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const [courseSnap, teacherSnap, slotSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'teacherProfiles')),
        getDocs(query(collection(db, 'slots'), where('booked', '==', false)))
      ])
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(t => (t.title && t.title.trim()) || (t.bio && t.bio.trim())))

      const now = new Date()
      const grouped = {}
      slotSnap.docs.forEach(d => {
        const slot = { id: d.id, ...d.data() }
        if (new Date(slot.date + 'T' + slot.time) <= now) return
        ;(grouped[slot.teacherId] = grouped[slot.teacherId] || []).push(slot)
      })
      Object.values(grouped).forEach(list =>
        list.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)))
      setSlotsByTeacher(grouped)
    }
    fetchData()
  }, [])

  if (teachers.length === 0) {
    return <p className="text-center text-gray-400">{l.noTeachers}</p>
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
      {teachers.map(teacher => {
        const teacherCourses = (teacher.courseIds || [])
          .map(id => courses.find(c => c.id === id))
          .filter(Boolean)
        const upcoming = slotsByTeacher[teacher.id] || []
        return (
          <div key={teacher.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 text-center space-y-2">
            <img src={teacher.photoUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23e5e7eb"/%3E%3C/svg%3E'}
              alt={teacher.name} className="w-20 h-20 rounded-full object-cover bg-gray-200 dark:bg-gray-700 mx-auto" />
            <p className="font-bold">{teacher.name}</p>
            {teacher.title && <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">{teacher.title}</p>}
            {teacher.bio && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{teacher.bio}</p>}
            {teacher.specialties && (
              <div className="flex flex-wrap gap-1 justify-center pt-1">
                {teacher.specialties.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="text-[10px] bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {teacherCourses.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{l.coursesLabel}</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {teacherCourses.map(c => (
                    <span key={c.id} className="text-[10px] bg-gold-50 dark:bg-gold-700/25 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              {upcoming.length === 0 ? (
                <p className="text-xs text-gray-400">{l.noAvailability}</p>
              ) : (
                <button onClick={() => setOpenTeacher(teacher)}
                  className="w-full bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 transition">
                  <Icon e="🕐" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.viewAvailability}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {openTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpenTeacher(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-lg dark:text-white">
                <Icon e="👨‍🏫" className="w-6 h-6 inline-block align-[-0.3em]" /> {openTeacher.name}
              </p>
              <button onClick={() => setOpenTeacher(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
            </div>
            <SlotCalendar lang={lang} mode="book" slots={slotsByTeacher[openTeacher.id] || []} />
          </div>
        </div>
      )}
    </div>
  )
}

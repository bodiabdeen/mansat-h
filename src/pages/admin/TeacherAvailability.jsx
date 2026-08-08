import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import SlotCalendar from '../../components/SlotCalendar'
import TeacherProfileForm from '../../components/TeacherProfileForm'
import TeacherCoursesForm from '../../components/TeacherCoursesForm'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'إدارة المعلمين', selectTeacher: 'اختر معلماً لإدارة مواعيده أو ملفه التعريفي',
    noTeachers: 'لا يوجد معلمون بعد', searchPlaceholder: 'بحث عن معلم...',
    availability: 'المواعيد', profile: 'الملف التعريفي', courses: 'الدورات'
  },
  en: {
    title: 'Manage Teachers', selectTeacher: 'Select a teacher to manage their availability or profile',
    noTeachers: 'No teachers yet', searchPlaceholder: 'Search teacher...',
    availability: 'Availability', profile: 'Profile', courses: 'Courses'
  }
}

export default function ManageTeachers({ lang }) {
  const l = labels[lang]
  const [teachers, setTeachers] = useState([])
  const [selected, setSelected] = useState(null)
  const [slots, setSlots] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('availability')

  const fetchTeachers = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('roles', 'array-contains', 'teacher')))
    setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const fetchSlots = async (teacherId) => {
    const snap = await getDocs(query(collection(db, 'slots'), where('teacherId', '==', teacherId)))
    setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchTeachers() }, [])

  const selectTeacher = async (t) => {
    setSelected(t)
    setTab('availability')
    await fetchSlots(t.id)
  }

  const filtered = teachers.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="👨‍🏫" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      <input className="input" placeholder={`🔍 ${l.searchPlaceholder}`}
        value={search} onChange={e => setSearch(e.target.value)} />

      {filtered.length === 0 && (
        <p className="text-center text-gray-400">{l.noTeachers}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {filtered.map(t => (
          <button key={t.id} onClick={() => selectTeacher(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition border
              ${selected?.id === t.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>
            <Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {t.name}
          </button>
        ))}
      </div>

      {!selected && teachers.length > 0 && (
        <p className="text-center text-gray-400 text-sm">{l.selectTeacher}</p>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
            {['availability', 'courses', 'profile'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
                  ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {l[t]}
              </button>
            ))}
          </div>

          {tab === 'availability' && (
            <SlotCalendar lang={lang} mode="manage" teacherId={selected.id}
              slots={slots} onSlotsChanged={() => fetchSlots(selected.id)} />
          )}
          {tab === 'courses' && (
            <TeacherCoursesForm lang={lang} teacherId={selected.id} />
          )}
          {tab === 'profile' && (
            <TeacherProfileForm lang={lang} teacherId={selected.id} />
          )}
        </div>
      )}
    </div>
  )
}

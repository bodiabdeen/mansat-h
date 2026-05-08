import { useEffect, useState } from 'react'
import { db, auth, storage } from '../../firebase'
import {
  collection, addDoc, getDocs, query, where, doc, getDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const labels = {
  ar: {
    title: 'الواجبات', addAssignment: 'إضافة واجب', selectStudent: 'اختر الطالب',
    assignmentTitle: 'عنوان الواجب', description: 'الوصف', attach: 'إرفاق ملف',
    add: 'إضافة', noAssignments: 'لا توجد واجبات', submitted: 'تم التسليم',
    pending: 'قيد الانتظار', viewFile: 'عرض الملف', submittedFile: 'ملف الطالب',
    noStudents: 'لا يوجد طلاب بعد'
  },
  en: {
    title: 'Assignments', addAssignment: 'Add Assignment', selectStudent: 'Select Student',
    assignmentTitle: 'Assignment Title', description: 'Description', attach: 'Attach File',
    add: 'Add', noAssignments: 'No assignments yet', submitted: 'Submitted',
    pending: 'Pending', viewFile: 'View File', submittedFile: 'Student File',
    noStudents: 'No students yet'
  }
}

export default function Assignments({ lang }) {
  const l = labels[lang]
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState({ studentId: '', title: '', description: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    // Get students who have this teacher's package
    const pkgSnap = await getDocs(query(
      collection(db, 'studentPackages'), where('teacherId', '==', auth.currentUser.uid)
    ))
    const studentIds = pkgSnap.docs.map(d => d.data().studentId)
    const studentList = await Promise.all(studentIds.map(async id => {
      const u = await getDoc(doc(db, 'users', id))
      return { id, ...u.data() }
    }))
    setStudents(studentList)

    // Get assignments created by this teacher
    const aSnap = await getDocs(query(
      collection(db, 'assignments'), where('teacherId', '==', auth.currentUser.uid)
    ))
    setAssignments(aSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const addAssignment = async () => {
    if (!form.studentId || !form.title) return
    setLoading(true)
    let fileUrl = ''
    if (file) {
      const fileRef = ref(storage, `assignments/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      fileUrl = await getDownloadURL(fileRef)
    }
    await addDoc(collection(db, 'assignments'), {
      ...form,
      teacherId: auth.currentUser.uid,
      fileUrl,
      status: 'pending',
      submittedUrl: '',
      createdAt: new Date()
    })
    setForm({ studentId: '', title: '', description: '' })
    setFile(null)
    await fetchData()
    setLoading(false)
  }

  const getStudentName = (id) => students.find(s => s.id === id)?.name || id

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📝 {l.title}</h2>

      {/* Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.addAssignment}</p>

        {students.length === 0
          ? <p className="text-sm text-gray-400">{l.noStudents}</p>
          : <select className="input" value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}>
              <option value="">{l.selectStudent}</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        }

        <input className="input" placeholder={l.assignmentTitle}
          value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder={l.description}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 dark:text-indigo-400">
            📎 {l.attach}
            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </label>
          {file && <span className="text-xs text-gray-500 truncate max-w-xs">{file.name}</span>}
        </div>

        <button onClick={addAssignment} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
          {loading ? '...' : `+ ${l.add}`}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {assignments.length === 0 && <p className="text-center text-gray-400">{l.noAssignments}</p>}
        {assignments.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold dark:text-white">📝 {a.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${a.status === 'submitted'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                {a.status === 'submitted' ? `✅ ${l.submitted}` : `⏳ ${l.pending}`}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">👤 {getStudentName(a.studentId)}</p>
            {a.description && <p className="text-sm text-gray-600 dark:text-gray-300">{a.description}</p>}
            <div className="flex gap-3 pt-1">
              {a.fileUrl && (
                <a href={a.fileUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-500 hover:underline">📎 {l.viewFile}</a>
              )}
              {a.submittedUrl && (
                <a href={a.submittedUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-green-500 hover:underline">📤 {l.submittedFile}</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
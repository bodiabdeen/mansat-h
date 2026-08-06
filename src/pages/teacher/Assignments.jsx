import { useEffect, useState } from 'react'
import { db, auth, storage } from '../../firebase'
import {
  collection, addDoc, getDocs, query, where, doc, getDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'الواجبات', addAssignment: 'إضافة واجب', selectStudent: 'اختر الطالب',
    assignmentTitle: 'عنوان الواجب', description: 'الوصف', attach: 'إرفاق ملف',
    add: 'إضافة', noAssignments: 'لا توجد واجبات', submitted: 'تم التسليم',
    pending: 'قيد الانتظار', viewFile: 'عرض الملف', submittedFile: 'ملف الطالب',
    noStudents: 'لا يوجد طلاب بعد', filterAll: 'الكل', filterPending: 'معلق', filterSubmitted: 'مُسلَّم',
    saveFailed: 'فشلت العملية. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Assignments', addAssignment: 'Add Assignment', selectStudent: 'Select Student',
    assignmentTitle: 'Assignment Title', description: 'Description', attach: 'Attach File',
    add: 'Add', noAssignments: 'No assignments yet', submitted: 'Submitted',
    pending: 'Pending', viewFile: 'View File', submittedFile: 'Student File',
    noStudents: 'No students yet', filterAll: 'All', filterPending: 'Pending', filterSubmitted: 'Submitted',
    saveFailed: 'Action failed. Try again.\n\n'
  }
}

export default function Assignments({ lang }) {
  const l = labels[lang]
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState({ studentId: '', title: '', description: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchData = async () => {
    // Only students with an admin-approved (active) package tied to me
    const activeSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('teacherId', '==', auth.currentUser.uid),
      where('status', '==', 'active')
    ))
    const myStudentIds = [...new Set(activeSnap.docs.map(d => d.data().studentId))]
    const studentDocs = await Promise.all(myStudentIds.map(id => getDoc(doc(db, 'users', id))))
    setStudents(studentDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })))

    // Assignments created by this teacher
    const aSnap = await getDocs(query(
      collection(db, 'assignments'), where('teacherId', '==', auth.currentUser.uid)
    ))
    const list = aSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    setAssignments(list)
  }

  useEffect(() => { fetchData() }, [])

  const addAssignment = async () => {
    if (!form.studentId || !form.title) return
    setLoading(true)
    try {
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
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStudentName = (id) => students.find(s => s.id === id)?.name || id

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'pending') return a.status === 'pending'
    if (filter === 'submitted') return a.status === 'submitted'
    return true
  })

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📝" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
      </h2>

      {/* Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.addAssignment}</p>

        {students.length === 0
          ? <p className="text-sm text-gray-400">{l.noStudents}</p>
          : (
            <select className="input" value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}>
              <option value="">{l.selectStudent}</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )
        }

        <input className="input" placeholder={l.assignmentTitle}
          value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder={l.description}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 dark:text-indigo-400">
            <Icon e="📎" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.attach}
            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </label>
          {file && <span className="text-xs text-gray-500 truncate max-w-xs">{file.name}</span>}
        </div>

        <button onClick={addAssignment} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
          {loading ? '...' : `+ ${l.add}`}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', icon: '📋', label: l.filterAll },
          { key: 'pending', icon: '⏳', label: l.filterPending },
          { key: 'submitted', icon: '✅', label: l.filterSubmitted },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition
              ${filter === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            <Icon e={f.icon} className="w-4 h-4 inline-block align-[-0.3em]" /> {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 && (
          <p className="text-center text-gray-400">{l.noAssignments}</p>
        )}
        {filteredAssignments.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold dark:text-white"><Icon e="📝" className="w-5 h-5 inline-block align-[-0.3em]" /> {a.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${a.status === 'submitted'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                {a.status === 'submitted'
                  ? <><Icon e="✅" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.submitted}</>
                  : <><Icon e="⏳" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.pending}</>}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400"><Icon e="👤" className="w-5 h-5 inline-block align-[-0.3em]" /> {getStudentName(a.studentId)}</p>
            {a.description && <p className="text-sm text-gray-600 dark:text-gray-300">{a.description}</p>}
            <div className="flex gap-3 pt-1">
              {a.fileUrl && (
                <a href={a.fileUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-500 hover:underline"><Icon e="📎" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.viewFile}</a>
              )}
              {a.submittedUrl && (
                <a href={a.submittedUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-green-500 hover:underline"><Icon e="📤" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.submittedFile}</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

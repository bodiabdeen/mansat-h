import { useEffect, useState } from 'react'
import { db, auth, storage } from '../../firebase'
import {
  collection, getDocs, query, where, doc, updateDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const labels = {
  ar: {
    title: 'واجباتي', submit: 'تسليم الواجب', attach: 'إرفاق ملف',
    upload: 'رفع', noAssignments: 'لا توجد واجبات', submitted: 'تم التسليم',
    pending: 'قيد الانتظار', viewFile: 'عرض الملف', submittedFile: 'ملفي المرفوع'
  },
  en: {
    title: 'My Assignments', submit: 'Submit', attach: 'Attach File',
    upload: 'Upload', noAssignments: 'No assignments yet', submitted: 'Submitted',
    pending: 'Pending', viewFile: 'View File', submittedFile: 'My Submitted File'
  }
}

export default function StudentAssignments({ lang }) {
  const l = labels[lang]
  const [assignments, setAssignments] = useState([])
  const [files, setFiles] = useState({})
  const [uploading, setUploading] = useState(null)

  const fetchData = async () => {
    const snap = await getDocs(query(
      collection(db, 'assignments'), where('studentId', '==', auth.currentUser.uid)
    ))
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    setAssignments(list)
  }

  useEffect(() => { fetchData() }, [])

  const submitHomework = async (assignment) => {
    const file = files[assignment.id]
    if (!file) return
    setUploading(assignment.id)
    const fileRef = ref(storage, `homework/${Date.now()}_${file.name}`)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    await updateDoc(doc(db, 'assignments', assignment.id), {
      submittedUrl: url, status: 'submitted', submittedAt: new Date()
    })
    await fetchData()
    setUploading(null)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📝 {l.title}</h2>

      <div className="space-y-3">
        {assignments.length === 0 && <p className="text-center text-gray-400">{l.noAssignments}</p>}
        {assignments.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold dark:text-white">📝 {a.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${a.status === 'submitted'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                {a.status === 'submitted' ? `✅ ${l.submitted}` : `⏳ ${l.pending}`}
              </span>
            </div>

            {a.description && <p className="text-sm text-gray-600 dark:text-gray-300">{a.description}</p>}

            {a.fileUrl && (
              <a href={a.fileUrl} target="_blank" rel="noreferrer"
                className="text-xs text-indigo-500 hover:underline">📎 {l.viewFile}</a>
            )}

            {a.submittedUrl && (
              <a href={a.submittedUrl} target="_blank" rel="noreferrer"
                className="text-xs text-green-500 hover:underline">📤 {l.submittedFile}</a>
            )}

            {/* Submit section */}
            {a.status !== 'submitted' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1 cursor-pointer text-sm text-indigo-600 dark:text-indigo-400">
                  📎 {l.attach}
                  <input type="file" className="hidden"
                    onChange={e => setFiles({ ...files, [a.id]: e.target.files[0] })} />
                </label>
                {files[a.id] && (
                  <>
                    <span className="text-xs text-gray-400 truncate max-w-[120px]">{files[a.id].name}</span>
                    <button onClick={() => submitHomework(a)} disabled={uploading === a.id}
                      className="ms-auto bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg transition">
                      {uploading === a.id ? '...' : l.upload}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
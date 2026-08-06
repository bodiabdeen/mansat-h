import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import ChatThread from '../../components/ChatThread'
import Icon from '../../components/Icon'

const labels = {
  ar: { title: 'الرسائل', noContacts: 'لا يوجد معلمون معتمدون بعد للمراسلة', selectContact: 'اختر معلماً للمحادثة' },
  en: { title: 'Messages', noContacts: 'No approved teachers to message yet', selectContact: 'Select a teacher to chat' }
}

export default function Messages({ lang }) {
  const l = labels[lang]
  const [teachers, setTeachers] = useState([])
  const [unread, setUnread] = useState({})
  const [selected, setSelected] = useState(null)

  const fetchContacts = async () => {
    const uid = auth.currentUser.uid
    const activeSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('studentId', '==', uid),
      where('status', '==', 'active')
    ))
    const teacherIds = [...new Set(activeSnap.docs.map(d => d.data().teacherId).filter(Boolean))]
    const teacherDocs = await Promise.all(teacherIds.map(id => getDoc(doc(db, 'users', id))))
    setTeachers(teacherDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })))

    const unreadSnap = await getDocs(query(
      collection(db, 'messages'), where('participants', 'array-contains', uid)
    ))
    const counts = {}
    unreadSnap.docs.forEach(d => {
      const m = d.data()
      if (m.recipientId === uid && !m.read) counts[m.senderId] = (counts[m.senderId] || 0) + 1
    })
    setUnread(counts)
  }

  useEffect(() => { fetchContacts() }, [])

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400"><Icon e="💬" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}</h2>

      {teachers.length === 0 && (
        <p className="text-center text-gray-400">{l.noContacts}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {teachers.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition border
              ${selected?.id === t.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}>
            <Icon e="👤" className="w-5 h-5 inline-block align-[-0.3em]" /> {t.name}
            {unread[t.id] > 0 && (
              <span className="absolute -top-1.5 -end-1.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                {unread[t.id] > 9 ? '9+' : unread[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {teachers.length > 0 && !selected && (
        <p className="text-center text-gray-400 text-sm">{l.selectContact}</p>
      )}

      {selected && (
        <ChatThread lang={lang} teacherId={selected.id} studentId={auth.currentUser.uid}
          otherName={selected.name} onRead={fetchContacts} />
      )}
    </div>
  )
}

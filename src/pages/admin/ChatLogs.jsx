import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import ChatThread from '../../components/ChatThread'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'سجل جميع المحادثات', noConversations: 'لا توجد محادثات بعد',
    messages: 'رسالة', searchPlaceholder: 'بحث بالاسم...',
    loadError: 'تعذّر تحميل المحادثات. حاول مرة أخرى.\n\n'
  },
  en: {
    title: 'All Conversations', noConversations: 'No conversations yet',
    messages: 'messages', searchPlaceholder: 'Search by name...',
    loadError: 'Could not load conversations. Try again.\n\n'
  }
}

export default function ChatLogs({ lang }) {
  const l = labels[lang]
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'messages'))
      const byThread = {}
      snap.docs.forEach(d => {
        const m = { id: d.id, ...d.data() }
        const t = byThread[m.threadId] || { threadId: m.threadId, teacherId: m.teacherId, studentId: m.studentId, count: 0, lastAt: 0, lastText: '' }
        t.count += 1
        const at = m.createdAt?.toMillis?.() || 0
        if (at >= t.lastAt) { t.lastAt = at; t.lastText = m.text }
        byThread[m.threadId] = t
      })
      const list = Object.values(byThread).sort((a, b) => b.lastAt - a.lastAt)

      const ids = [...new Set(list.flatMap(t => [t.teacherId, t.studentId]))]
      const nameDocs = await Promise.all(ids.map(id => getDoc(doc(db, 'users', id))))
      const names = {}
      nameDocs.forEach(d => { if (d.exists()) names[d.id] = d.data().name })

      setThreads(list.map(t => ({
        ...t,
        teacherName: names[t.teacherId] || t.teacherId,
        studentName: names[t.studentId] || t.studentId
      })))
    } catch (err) {
      alert(l.loadError + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchThreads() }, [])

  const filtered = threads.filter(t =>
    t.teacherName?.toLowerCase().includes(search.toLowerCase()) ||
    t.studentName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="🗂️" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      <input className="input" placeholder={`🔍 ${l.searchPlaceholder}`}
        value={search} onChange={e => setSearch(e.target.value)} />

      {!loading && filtered.length === 0 && (
        <p className="text-center text-gray-400">{l.noConversations}</p>
      )}

      <div className="space-y-2">
        {filtered.map(t => (
          <button key={t.threadId} onClick={() => setSelected(t)}
            className={`w-full text-start bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between gap-3 border-2 transition
              ${selected?.threadId === t.threadId ? 'border-indigo-600' : 'border-transparent'}`}>
            <div className="min-w-0">
              <p className="font-semibold text-sm dark:text-white">
                <Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {t.teacherName}{' '}
                <span className="text-gray-400"><Icon e="↔" className="w-5 h-5 inline-block align-[-0.3em]" /></span>{' '}
                <Icon e="👨‍🎓" className="w-5 h-5 inline-block align-[-0.3em]" /> {t.studentName}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{t.lastText}</p>
            </div>
            <span className="text-xs shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
              {t.count} {l.messages}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <ChatThread lang={lang} teacherId={selected.teacherId} studentId={selected.studentId}
          otherName={`${selected.teacherName} ↔ ${selected.studentName}`}
          canDelete
          onConversationDeleted={() => { setSelected(null); fetchThreads() }}
          onMessagesChanged={fetchThreads} />
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import Icon from './Icon'

const labels = {
  ar: {
    placeholder: 'اكتب رسالة...', send: 'إرسال', noMessages: 'لا توجد رسائل بعد، ابدأ المحادثة',
    deleteMessage: 'حذف الرسالة', deleteConversation: 'حذف المحادثة كاملة',
    deleteConversationConfirm: 'سيتم حذف جميع رسائل هذه المحادثة نهائياً. هل أنت متأكد؟',
    loadError: 'تعذر تحميل الرسائل، حاول مرة أخرى'
  },
  en: {
    placeholder: 'Type a message...', send: 'Send', noMessages: 'No messages yet — say hello',
    deleteMessage: 'Delete message', deleteConversation: 'Delete entire conversation',
    deleteConversationConfirm: 'This permanently deletes every message in this conversation. Are you sure?',
    loadError: 'Could not load messages, try again'
  }
}

// canDelete/onConversationDeleted are only used by the admin chat-log view.
export default function ChatThread({ lang, teacherId, studentId, otherName, onRead, canDelete, onConversationDeleted, onMessagesChanged }) {
  const l = labels[lang]
  const uid = auth.currentUser.uid
  const threadId = `${teacherId}_${studentId}`
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const fetchMessages = async () => {
    setError('')
    try {
      // The read rule checks `uid in participants`, so the query must filter
      // on that same field — filtering by threadId alone can't be proven safe
      // by Firestore's rules engine and gets rejected outright.
      const snap = await getDocs(query(
        collection(db, 'messages'),
        where('participants', 'array-contains', uid),
        where('threadId', '==', threadId)
      ))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
      setMessages(list)

      const unread = list.filter(m => m.recipientId === uid && !m.read)
      if (unread.length > 0) {
        await Promise.all(unread.map(m => updateDoc(doc(db, 'messages', m.id), { read: true })))
        onRead?.()
      }
    } catch (e) {
      console.error(e)
      setError(l.loadError)
    }
  }

  useEffect(() => { fetchMessages() }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const recipientId = uid === teacherId ? studentId : teacherId
      await addDoc(collection(db, 'messages'), {
        threadId, teacherId, studentId,
        participants: [teacherId, studentId],
        senderId: uid, recipientId,
        text: text.trim(), read: false, createdAt: new Date()
      })
      setText('')
      await fetchMessages()
    } catch (e) {
      console.error(e)
      setError(l.loadError)
    }
    setLoading(false)
  }

  const deleteMessage = async (id) => {
    await deleteDoc(doc(db, 'messages', id))
    await fetchMessages()
    onMessagesChanged?.()
  }

  const deleteConversation = async () => {
    if (!window.confirm(l.deleteConversationConfirm)) return
    const batch = writeBatch(db)
    messages.forEach(m => batch.delete(doc(db, 'messages', m.id)))
    await batch.commit()
    onConversationDeleted?.()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow flex flex-col h-[28rem]">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="font-semibold text-gray-800 dark:text-white"><Icon e="👤" className="w-5 h-5 inline-block align-[-0.3em]" /> {otherName}</span>
        {canDelete && (
          <button onClick={deleteConversation}
            className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition whitespace-nowrap">
            <Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.deleteConversation}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {error && <p className="text-center text-red-500 text-sm mt-4">{error}</p>}
        {!error && messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-4">{l.noMessages}</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex items-center gap-2 ${m.senderId === uid ? 'justify-end' : 'justify-start'}`}>
            {canDelete && m.senderId === uid && (
              <button onClick={() => deleteMessage(m.id)} title={l.deleteMessage}
                className="text-gray-300 hover:text-red-500 text-xs transition"><Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" /></button>
            )}
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm
              ${m.senderId === uid
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}>
              {m.text}
            </div>
            {canDelete && m.senderId !== uid && (
              <button onClick={() => deleteMessage(m.id)} title={l.deleteMessage}
                className="text-gray-300 hover:text-red-500 text-xs transition"><Icon e="🗑️" className="w-4 h-4 inline-block align-[-0.3em]" /></button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!canDelete && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <input className="input flex-1" placeholder={l.placeholder}
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }} />
          <button onClick={send} disabled={loading || !text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            {l.send}
          </button>
        </div>
      )}
    </div>
  )
}

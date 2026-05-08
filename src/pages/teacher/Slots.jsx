import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'المواعيد المتاحة', addSlot: 'إضافة موعد', date: 'التاريخ',
    time: 'الوقت', duration: 'المدة (دقيقة)', add: 'إضافة',
    delete: 'حذف', noSlots: 'لا توجد مواعيد', minutes: 'دقيقة',
    booked: 'محجوز', available: 'متاح',
    joinLink: 'رابط الانضمام', saveLink: 'حفظ', linkPlaceholder: 'https://meet.google.com/...'
  },
  en: {
    title: 'Available Slots', addSlot: 'Add Slot', date: 'Date',
    time: 'Time', duration: 'Duration (min)', add: 'Add',
    delete: 'Delete', noSlots: 'No slots yet', minutes: 'min',
    booked: 'Booked', available: 'Available',
    joinLink: 'Join Link', saveLink: 'Save', linkPlaceholder: 'https://meet.google.com/...'
  }
}

function JoinLinkEditor({ slot, onSaved, l }) {
  const [link, setLink] = useState(slot.joinLink || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    await updateDoc(doc(db, 'slots', slot.id), { joinLink: link })
    await onSaved()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex gap-2 pt-1">
      <input
        className="input text-sm"
        placeholder={l.linkPlaceholder}
        value={link}
        onChange={e => setLink(e.target.value)}
      />
      <button onClick={save} disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded-lg transition whitespace-nowrap">
        {saved ? '✓' : saving ? '...' : l.saveLink}
      </button>
    </div>
  )
}

export default function Slots({ lang }) {
  const l = labels[lang]
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState({ date: '', time: '', duration: '60' })
  const [loading, setLoading] = useState(false)

  const fetchSlots = async () => {
    const q = query(collection(db, 'slots'), where('teacherId', '==', auth.currentUser.uid))
    const snap = await getDocs(q)
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
    setSlots(list)
  }

  useEffect(() => { fetchSlots() }, [])

  const addSlot = async () => {
    if (!form.date || !form.time || !form.duration) return
    setLoading(true)
    await addDoc(collection(db, 'slots'), {
      ...form,
      duration: Number(form.duration),
      teacherId: auth.currentUser.uid,
      booked: false,
      studentId: null,
      joinLink: '',
      createdAt: new Date()
    })
    setForm({ date: '', time: '', duration: '60' })
    await fetchSlots()
    setLoading(false)
  }

  const deleteSlot = async (id) => {
    await deleteDoc(doc(db, 'slots', id))
    await fetchSlots()
  }

  const isUpcoming = (slot) => new Date(slot.date + 'T' + slot.time) > new Date()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📅 {l.title}</h2>

      {/* Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.addSlot}</p>
        <input className="input" type="date" value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })} />
        <div className="flex gap-2">
          <input className="input" type="time" value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })} />
          <input className="input" type="number" placeholder={l.duration} value={form.duration}
            onChange={e => setForm({ ...form, duration: e.target.value })} />
        </div>
        <button onClick={addSlot} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
          {loading ? '...' : `+ ${l.add}`}
        </button>
      </div>

      {/* Slots List */}
      <div className="space-y-3">
        {slots.length === 0 && <p className="text-center text-gray-400">{l.noSlots}</p>}
        {slots.map(slot => (
          <div key={slot.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-bold text-gray-800 dark:text-white">
                  📅 {slot.date} — 🕐 {slot.time}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ⏱ {slot.duration} {l.minutes}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${slot.booked
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                    : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'}`}>
                  {slot.booked ? `🔒 ${l.booked}` : `✅ ${l.available}`}
                </span>
              </div>
              {!slot.booked && isUpcoming(slot) && (
                <button onClick={() => deleteSlot(slot.id)}
                  className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                  {l.delete}
                </button>
              )}
            </div>

            {/* Join Link */}
            <JoinLinkEditor slot={slot} onSaved={fetchSlots} l={l} />
          </div>
        ))}
      </div>
    </div>
  )
}
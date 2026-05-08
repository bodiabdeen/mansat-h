import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'المواعيد المتاحة', addSlot: 'إضافة موعد', batchAdd: 'إضافة مجموعة',
    date: 'التاريخ', time: 'الوقت', duration: 'المدة (دقيقة)', add: 'إضافة',
    delete: 'حذف', noSlots: 'لا توجد مواعيد', minutes: 'دقيقة',
    booked: 'محجوز', available: 'متاح',
    joinLink: 'رابط الانضمام', saveLink: 'حفظ', linkPlaceholder: 'https://meet.google.com/...',
    startTime: 'وقت البداية', endTime: 'وقت الانتهاء', slotDuration: 'مدة الحصة (دقيقة)',
    breakBetween: 'فاصل بين الحصص (دقيقة)', totalSlots: 'عدد الحصص المتولدة'
  },
  en: {
    title: 'Available Slots', addSlot: 'Add Slot', batchAdd: 'Add Batch',
    date: 'Date', time: 'Time', duration: 'Duration (min)', add: 'Add',
    delete: 'Delete', noSlots: 'No slots yet', minutes: 'min',
    booked: 'Booked', available: 'Available',
    joinLink: 'Join Link', saveLink: 'Save', linkPlaceholder: 'https://meet.google.com/...',
    startTime: 'Start Time', endTime: 'End Time', slotDuration: 'Slot Duration (min)',
    breakBetween: 'Break Between Slots (min)', totalSlots: 'Total Slots Generated'
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

function BatchModal({ isOpen, onClose, onAdd, l }) {
  const [form, setForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: '60',
    breakBetween: '0'
  })
  const [loading, setLoading] = useState(false)

  const calculateSlots = () => {
    if (!form.date || !form.startTime || !form.endTime) return 0
    const start = new Date(`${form.date}T${form.startTime}`)
    const end = new Date(`${form.date}T${form.endTime}`)
    const slotDur = parseInt(form.slotDuration) || 60
    const breakDur = parseInt(form.breakBetween) || 0
    const cycleDur = slotDur + breakDur
    const totalMins = (end - start) / 60000
    return Math.floor(totalMins / cycleDur)
  }

  const handleAdd = async () => {
    if (!form.date || !form.startTime || !form.endTime) return
    setLoading(true)
    
    const slots = []
    const start = new Date(`${form.date}T${form.startTime}`)
    const end = new Date(`${form.date}T${form.endTime}`)
    const slotDur = parseInt(form.slotDuration) || 60
    const breakDur = parseInt(form.breakBetween) || 0

    let current = new Date(start)
    while (current < end) {
      const slotEnd = new Date(current.getTime() + slotDur * 60000)
      if (slotEnd > end) break

      const timeStr = current.toTimeString().slice(0, 5)
      slots.push({
        date: form.date,
        time: timeStr,
        duration: slotDur,
        teacherId: auth.currentUser.uid,
        booked: false,
        studentId: null,
        joinLink: '',
        createdAt: new Date()
      })

      current = new Date(slotEnd.getTime() + breakDur * 60000)
    }

    for (const slot of slots) {
      await addDoc(collection(db, 'slots'), slot)
    }

    setForm({ date: '', startTime: '09:00', endTime: '17:00', slotDuration: '60', breakBetween: '0' })
    setLoading(false)
    onAdd()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">📅 {l.batchAdd}</h3>

        <input className="input" type="date" value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })} />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.startTime}</label>
            <input className="input" type="time" value={form.startTime}
              onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.endTime}</label>
            <input className="input" type="time" value={form.endTime}
              onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.slotDuration}</label>
            <input className="input" type="number" value={form.slotDuration}
              onChange={e => setForm({ ...form, slotDuration: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.breakBetween}</label>
            <input className="input" type="number" value={form.breakBetween}
              onChange={e => setForm({ ...form, breakBetween: e.target.value })} />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 font-medium">
          💡 {l.totalSlots}: {calculateSlots()}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition">
            إلغاء
          </button>
          <button onClick={handleAdd} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
            {loading ? '...' : l.add}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Slots({ lang }) {
  const l = labels[lang]
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState({ date: '', time: '', duration: '60' })
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

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

      <div className="flex gap-2">
        <button onClick={() => setModalOpen(true)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition">
          ⚡ {l.batchAdd}
        </button>
      </div>

      {/* Add Single Slot Form */}
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

      <BatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdd={fetchSlots} l={l} />
    </div>
  )
}
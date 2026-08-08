import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore'
import Icon from './Icon'

const labels = {
  ar: {
    week: 'أسبوعي', month: 'شهري', strip: 'قائمة الأيام',
    addSlot: 'إضافة موعد', batchAdd: 'إضافة مجموعة', add: 'إضافة', cancel: 'إلغاء',
    date: 'التاريخ', time: 'الوقت', duration: 'المدة (دقيقة)',
    startTime: 'وقت البداية', endTime: 'وقت الانتهاء', slotDuration: 'مدة الحصة (دقيقة)',
    breakBetween: 'فاصل بين الحصص (دقيقة)', totalSlots: 'عدد الحصص المتولدة',
    joinLink: 'رابط الانضمام', saveLink: 'حفظ', linkPlaceholder: 'https://meet.google.com/...',
    booked: 'محجوز', available: 'متاح', past: 'منتهي', minutes: 'دقيقة',
    noSlotsDay: 'لا توجد مواعيد هذا اليوم', noSlotsAtAll: 'لا توجد مواعيد بعد',
    morning: 'صباحاً', afternoon: 'ظهراً', evening: 'مساءً',
    open: 'متاح', delete: 'حذف', today: 'اليوم', prevWeek: 'الأسبوع السابق', nextWeek: 'الأسبوع التالي',
    prevMonth: 'الشهر السابق', nextMonth: 'الشهر التالي', saveFailed: 'فشل الحفظ. حاول مرة أخرى.\n\n'
  },
  en: {
    week: 'Week', month: 'Month', strip: 'Day list',
    addSlot: 'Add Slot', batchAdd: 'Batch Add', add: 'Add', cancel: 'Cancel',
    date: 'Date', time: 'Time', duration: 'Duration (min)',
    startTime: 'Start Time', endTime: 'End Time', slotDuration: 'Slot Duration (min)',
    breakBetween: 'Break Between Slots (min)', totalSlots: 'Total Slots Generated',
    joinLink: 'Join Link', saveLink: 'Save', linkPlaceholder: 'https://meet.google.com/...',
    booked: 'Booked', available: 'Available', past: 'Past', minutes: 'min',
    noSlotsDay: 'Nothing scheduled this day', noSlotsAtAll: 'No slots yet',
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
    open: 'open', delete: 'Delete', today: 'Today', prevWeek: 'Previous week', nextWeek: 'Next week',
    prevMonth: 'Previous month', nextMonth: 'Next month', saveFailed: 'Save failed. Try again.\n\n'
  }
}

const pad = n => String(n).padStart(2, '0')
const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDateStr = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const timeToMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const startOfWeek = d => { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); c.setHours(0, 0, 0, 0); return c }
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c }
const fmtTime = mins => {
  const h = Math.floor(mins / 60), m = mins % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m)} ${ap}`
}

const GRID_START = 7 * 60, GRID_END = 22 * 60, GRID_TOTAL = GRID_END - GRID_START

export function JoinLinkEditor({ slot, onSaved, l }) {
  const [link, setLink] = useState(slot.joinLink || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'slots', slot.id), { joinLink: link })
      await onSaved()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
      <input className="input text-xs py-1" placeholder={l.linkPlaceholder}
        value={link} onChange={e => setLink(e.target.value)} />
      <button onClick={save} disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1 rounded-lg transition whitespace-nowrap">
        {saved ? '✓' : saving ? '...' : l.saveLink}
      </button>
    </div>
  )
}

export function BatchModal({ isOpen, onClose, onAdd, teacherId, l }) {
  const [form, setForm] = useState({ date: '', startTime: '09:00', endTime: '17:00', slotDuration: '60', breakBetween: '0' })
  const [loading, setLoading] = useState(false)

  const calculateSlots = () => {
    if (!form.date || !form.startTime || !form.endTime) return 0
    const start = new Date(`${form.date}T${form.startTime}`)
    const end = new Date(`${form.date}T${form.endTime}`)
    const cycleDur = (parseInt(form.slotDuration) || 60) + (parseInt(form.breakBetween) || 0)
    return Math.floor(((end - start) / 60000) / cycleDur)
  }

  const handleAdd = async () => {
    if (!form.date || !form.startTime || !form.endTime) return
    setLoading(true)
    try {
      const slotDur = parseInt(form.slotDuration) || 60
      const breakDur = parseInt(form.breakBetween) || 0
      const start = new Date(`${form.date}T${form.startTime}`)
      const end = new Date(`${form.date}T${form.endTime}`)
      const slots = []
      let current = new Date(start)
      while (current < end) {
        const slotEnd = new Date(current.getTime() + slotDur * 60000)
        if (slotEnd > end) break
        slots.push({
          date: form.date, time: current.toTimeString().slice(0, 5), duration: slotDur,
          teacherId, booked: false, studentId: null, joinLink: '', createdAt: new Date()
        })
        current = new Date(slotEnd.getTime() + breakDur * 60000)
      }
      for (const slot of slots) await addDoc(collection(db, 'slots'), slot)
      setForm({ date: '', startTime: '09:00', endTime: '17:00', slotDuration: '60', breakBetween: '0' })
      onAdd()
      onClose()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white"><Icon e="⚡" className="w-6 h-6 inline-block align-[-0.3em]" /> {l.batchAdd}</h3>
        <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.startTime}</label>
            <input className="input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.endTime}</label>
            <input className="input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.slotDuration}</label>
            <input className="input" type="number" value={form.slotDuration} onChange={e => setForm({ ...form, slotDuration: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">{l.breakBetween}</label>
            <input className="input" type="number" value={form.breakBetween} onChange={e => setForm({ ...form, breakBetween: e.target.value })} />
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 font-medium">
          <Icon e="💡" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.totalSlots}: {calculateSlots()}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-semibold transition">
            {l.cancel}
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

function slotState(slot) {
  if (new Date(slot.date + 'T' + slot.time) <= new Date()) return 'past'
  return slot.booked ? 'booked' : 'available'
}

const stateClasses = {
  available: 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  booked: 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  past: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-transparent',
  selected: 'bg-indigo-600 text-white border-indigo-600'
}

export default function SlotCalendar({ lang, mode, teacherId, slots, onSlotsChanged, selectedSlotIds = [], onSelectSlot }) {
  const l = labels[lang]
  const manage = mode === 'manage'
  const [view, setView] = useState('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [addForm, setAddForm] = useState({ date: '', time: '', duration: '60' })
  const [batchOpen, setBatchOpen] = useState(false)
  const [studentNames, setStudentNames] = useState({})
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const todayStr = toDateStr(today)

  useEffect(() => {
    if (!manage) return
    const ids = [...new Set(slots.filter(s => s.booked && s.studentId).map(s => s.studentId))]
    const missing = ids.filter(id => !studentNames[id])
    if (missing.length === 0) return
    Promise.all(missing.map(id => getDoc(doc(db, 'users', id)))).then(docs => {
      setStudentNames(prev => {
        const next = { ...prev }
        docs.forEach(d => { if (d.exists()) next[d.id] = d.data().name })
        return next
      })
    })
  }, [slots, manage])

  const byDate = {}
  slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s) })
  Object.values(byDate).forEach(list => list.sort((a, b) => timeToMin(a.time) - timeToMin(b.time)))

  const addSlot = async () => {
    if (!addForm.date || !addForm.time || !addForm.duration) return
    setLoading(true)
    try {
      await addDoc(collection(db, 'slots'), {
        date: addForm.date, time: addForm.time, duration: Number(addForm.duration),
        teacherId, booked: false, studentId: null, joinLink: '', createdAt: new Date()
      })
      setAddForm({ date: '', time: '', duration: '60' })
      await onSlotsChanged?.()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteSlot = async (id) => {
    await deleteDoc(doc(db, 'slots', id))
    await onSlotsChanged?.()
  }

  const clickSlot = (slot) => {
    const state = slotState(slot)
    if (!manage && state === 'available') onSelectSlot?.(slot)
  }

  const slotLabel = (slot, state) => {
    if (state === 'booked') return manage ? (studentNames[slot.studentId] || l.booked) : l.booked
    if (state === 'past') return l.past
    return slot.teacherName ? slot.teacherName : `${slot.duration} ${l.minutes}`
  }

  // ---------- shared "slot pill" used by month agenda + day strip ----------
  function SlotRow({ slot }) {
    const state = slotState(slot)
    const isSel = selectedSlotIds.includes(slot.id)
    const cls = isSel ? stateClasses.selected : stateClasses[state]
    return (
      <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${cls} ${!manage && state === 'available' && onSelectSlot ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={() => clickSlot(slot)}>
        <div>
          <p className="font-semibold text-sm">{fmtTime(timeToMin(slot.time))}</p>
          <p className="text-xs opacity-80">{slotLabel(slot, state)}</p>
        </div>
        {manage && state !== 'past' && !slot.booked && (
          <button onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id) }}
            className="text-xs px-2 py-1 rounded border border-current opacity-70 hover:opacity-100">
            {l.delete}
          </button>
        )}
        {manage && slot.booked && (
          <div className="w-40" onClick={e => e.stopPropagation()}>
            <JoinLinkEditor slot={slot} onSaved={onSlotsChanged} l={l} />
          </div>
        )}
      </div>
    )
  }

  function GroupedSlots({ list }) {
    if (!list || list.length === 0) return <p className="text-sm text-gray-400 py-3">{l.noSlotsDay}</p>
    const groups = { [l.morning]: [], [l.afternoon]: [], [l.evening]: [] }
    list.forEach(s => {
      const h = timeToMin(s.time) / 60
      groups[h < 12 ? l.morning : h < 17 ? l.afternoon : l.evening].push(s)
    })
    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([label, items]) => items.length > 0 && (
          <div key={label}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
            <div className="space-y-2">{items.map(s => <SlotRow key={s.id} slot={s} />)}</div>
          </div>
        ))}
      </div>
    )
  }

  // ============ WEEK VIEW ============
  function WeekView() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="iconbtn-cal" aria-label={l.prevWeek}>‹</button>
          <span className="text-sm font-semibold font-mono">
            {days[0].toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric' })}
            {' – '}
            {days[6].toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="iconbtn-cal" aria-label={l.nextWeek}>›</button>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-px" style={{ gridTemplateColumns: '44px repeat(7, minmax(96px, 1fr))', minWidth: '760px' }}>
            <div />
            {days.map((d, i) => {
              const ds = toDateStr(d)
              return (
                <div key={i} className={`text-center pb-2 border-b border-gray-200 dark:border-gray-700 ${ds === todayStr ? 'text-indigo-600 dark:text-indigo-300' : ''}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short' })}
                  </div>
                  <div className={`font-mono text-base font-semibold mt-0.5 ${ds === todayStr ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white' : ''}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
            <div className="relative" style={{ height: '600px' }}>
              {Array.from({ length: (GRID_END - GRID_START) / 60 + 1 }, (_, i) => GRID_START + i * 60).map(m => (
                <div key={m} className="absolute right-1 -translate-y-1/2 text-[10px] font-mono text-gray-400"
                  style={{ top: `${((m - GRID_START) / GRID_TOTAL) * 100}%` }}>
                  {fmtTime(m).replace(':00', '')}
                </div>
              ))}
            </div>
            {days.map((d, i) => {
              const ds = toDateStr(d)
              return (
                <div key={i} className="relative border-s border-gray-200 dark:border-gray-700" style={{ height: '600px' }}>
                  {(byDate[ds] || []).map(slot => {
                    const state = slotState(slot)
                    const isSel = selectedSlotIds.includes(slot.id)
                    const top = ((timeToMin(slot.time) - GRID_START) / GRID_TOTAL) * 100
                    const height = Math.max((slot.duration / GRID_TOTAL) * 100, 5)
                    return (
                      <div key={slot.id}
                        className={`absolute left-0.5 right-0.5 rounded-lg border px-1.5 py-1 text-[10.5px] leading-tight overflow-hidden
                          ${isSel ? stateClasses.selected : stateClasses[state]}
                          ${!manage && state === 'available' && onSelectSlot ? 'cursor-pointer hover:opacity-80' : ''}`}
                        style={{ top: `${top}%`, height: `${height}%` }}
                        onClick={() => clickSlot(slot)}
                        title={fmtTime(timeToMin(slot.time)) + ' · ' + slotLabel(slot, state)}>
                        <div className="font-mono font-bold">{fmtTime(timeToMin(slot.time))}</div>
                        <div className="opacity-80 truncate">{slotLabel(slot, state)}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ============ MONTH VIEW ============
  function MonthView() {
    const first = monthCursor
    const startPad = first.getDay()
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d))

    return (
      <div className="grid md:grid-cols-[300px_1fr] gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="iconbtn-cal" aria-label={l.prevMonth}>‹</button>
            <span className="text-sm font-bold">{monthCursor.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="iconbtn-cal" aria-label={l.nextMonth}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-gray-400">{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const ds = toDateStr(d)
              const openCount = (byDate[ds] || []).filter(s => slotState(s) === 'available').length
              const isSelected = ds === selectedDate
              return (
                <button key={i} onClick={() => setSelectedDate(ds)}
                  className={`aspect-square rounded-lg text-xs font-mono flex flex-col items-center justify-center gap-0.5 transition
                    ${isSelected ? 'bg-indigo-600 text-white' : ds === todayStr ? 'ring-1 ring-indigo-400 text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900'}`}>
                  <span>{d.getDate()}</span>
                  {openCount > 0 && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">
              {parseDateStr(selectedDate).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {manage && (
              <button onClick={() => setAddForm({ date: selectedDate, time: '', duration: '60' })}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg">
                + {l.addSlot}
              </button>
            )}
          </div>
          <GroupedSlots list={byDate[selectedDate]} />
        </div>
      </div>
    )
  }

  // ============ DAY STRIP VIEW ============
  function StripView() {
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
    return (
      <div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {days.map((d, i) => {
            const ds = toDateStr(d)
            const openCount = (byDate[ds] || []).filter(s => slotState(s) === 'available').length
            const isSelected = ds === selectedDate
            return (
              <button key={i} onClick={() => setSelectedDate(ds)}
                className={`shrink-0 w-16 py-2.5 rounded-2xl border flex flex-col items-center gap-1 transition
                  ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:-translate-y-0.5'}`}>
                <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short' })}</span>
                <span className="font-mono text-lg font-bold">{d.getDate()}</span>
                <span className="text-[9px] font-semibold opacity-80">{openCount > 0 ? `${openCount} ${l.open}` : '—'}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold">
            {parseDateStr(selectedDate).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          {manage && (
            <button onClick={() => setAddForm({ date: selectedDate, time: '', duration: '60' })}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg">
              + {l.addSlot}
            </button>
          )}
        </div>
        <GroupedSlots list={byDate[selectedDate]} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <style>{`.iconbtn-cal{width:30px;height:30px;border-radius:9px;border:1px solid rgb(229 231 235);background:rgb(249 250 251);display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:rgb(107 114 128)}
      .dark .iconbtn-cal{border-color:rgb(55 65 81);background:rgb(55 65 81);color:rgb(209 213 219)}
      .iconbtn-cal:hover{background:#EEF2FB;color:#2A4A7E}`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
          {['week', 'month', 'strip'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
                ${view === v ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {l[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />{l.available}</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />{l.booked}</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" />{l.past}</span>
        </div>
      </div>

      {manage && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500 dark:text-gray-400">{l.date}</label>
              <input className="input" type="date" value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-gray-500 dark:text-gray-400">{l.time}</label>
              <input className="input" type="time" value={addForm.time} onChange={e => setAddForm({ ...addForm, time: e.target.value })} />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-gray-500 dark:text-gray-400">{l.duration}</label>
              <input className="input" type="number" value={addForm.duration} onChange={e => setAddForm({ ...addForm, duration: e.target.value })} />
            </div>
            <button onClick={addSlot} disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
              + {l.add}
            </button>
            <button onClick={() => setBatchOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap">
              <Icon e="⚡" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.batchAdd}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
        {slots.length === 0
          ? <p className="text-center text-gray-400 py-8">{l.noSlotsAtAll}</p>
          : view === 'week' ? <WeekView /> : view === 'month' ? <MonthView /> : <StripView />}
      </div>

      {manage && (
        <BatchModal isOpen={batchOpen} onClose={() => setBatchOpen(false)} onAdd={onSlotsChanged} teacherId={teacherId} l={l} />
      )}
    </div>
  )
}

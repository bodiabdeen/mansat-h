import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import SlotCalendar from '../../components/SlotCalendar'
import Icon from '../../components/Icon'

const labels = {
  ar: { title: 'المواعيد المتاحة' },
  en: { title: 'Available Slots' }
}

export default function Slots({ lang }) {
  const l = labels[lang]
  const [slots, setSlots] = useState([])

  const fetchSlots = async () => {
    const snap = await getDocs(query(collection(db, 'slots'), where('teacherId', '==', auth.currentUser.uid)))
    setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchSlots() }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📅" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
      </h2>
      <SlotCalendar lang={lang} mode="manage" teacherId={auth.currentUser.uid}
        slots={slots} onSlotsChanged={fetchSlots} />
    </div>
  )
}

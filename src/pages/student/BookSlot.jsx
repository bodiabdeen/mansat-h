import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import {
  collection, getDocs, doc, getDoc, updateDoc, addDoc,
  query, where
} from 'firebase/firestore'

const labels = {
  ar: {
    title: 'حجز موعد', myBookings: 'حجوزاتي', available: 'المواعيد المتاحة',
    book: 'احجز', cancel: 'إلغاء', noSlots: 'لا توجد مواعيد متاحة',
    noBookings: 'لا توجد حجوزات', minutes: 'دقيقة', booked: 'محجوز',
    cancelWarning: 'تنبيه: الإلغاء خلال 48 ساعة سيُحتسب كحصة مستهلكة',
    missed: 'غياب (محتسب)', confirmed: 'مؤكد', noPackage: 'يجب تفعيل باقة أولاً',
    selectPackage: 'اختر الباقة المراد استخدام حصة منها', lessonUsedFrom: 'حصص متبقية',
    joinNow: 'انضم للحصة الآن', linkSoon: 'الرابط سيظهر قبل 15 دقيقة',
    teacher: 'المعلم', selectTeacher: 'اختر معلماً', allTeachers: 'جميع المعلمين',
    noTeachers: 'لا يوجد معلمون بعد', teacherSlots: 'مواعيد المعلم'
  },
  en: {
    title: 'Book a Slot', myBookings: 'My Bookings', available: 'Available Slots',
    book: 'Book', cancel: 'Cancel', noSlots: 'No available slots',
    noBookings: 'No bookings yet', minutes: 'min', booked: 'Booked',
    cancelWarning: 'Warning: Cancelling within 48 hours counts as a used lesson',
    missed: 'Missed (counted)', confirmed: 'Confirmed', noPackage: 'Please activate a package first',
    selectPackage: 'Select which package to use', lessonUsedFrom: 'lessons left',
    joinNow: 'Join Lesson Now', linkSoon: 'Link appears 15 min before',
    teacher: 'Teacher', selectTeacher: 'Select a Teacher', allTeachers: 'All Teachers',
    noTeachers: 'No teachers yet', teacherSlots: "Teacher's Slots"
  }
}

export default function BookSlot({ lang }) {
  const l = labels[lang]
  const [teachers, setTeachers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [slots, setSlots] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [myPackages, setMyPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('available')
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [selectedPackageId, setSelectedPackageId] = useState(null)

  const fetchTeachers = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')))
    setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const fetchPackages = async () => {
    const pkgSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('studentId', '==', auth.currentUser.uid)
    ))
    const pkgs = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setMyPackages(pkgs.filter(p => p.remainingLessons > 0))
  }

  const fetchSlots = async (teacherId) => {
    const q = teacherId
      ? query(collection(db, 'slots'), where('teacherId', '==', teacherId), where('booked', '==', false))
      : query(collection(db, 'slots'), where('booked', '==', false))
    const slotsSnap = await getDocs(q)
    const list = slotsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
    setSlots(list.filter(s => new Date(s.date + 'T' + s.time) > new Date()))
  }

  const fetchMyBookings = async () => {
    const bookSnap = await getDocs(query(
      collection(db, 'bookings'), where('studentId', '==', auth.currentUser.uid)
    ))
    const bookings = await Promise.all(bookSnap.docs.map(async d => {
      const data = { id: d.id, ...d.data() }
      try {
        const slotSnap = await getDoc(doc(db, 'slots', data.slotId))
        if (slotSnap.exists()) {
          data.joinLink = slotSnap.data().joinLink || ''
        }
        // get teacher name
        const teacherSnap = await getDoc(doc(db, 'users', data.teacherId))
        if (teacherSnap.exists()) {
          data.teacherName = teacherSnap.data().name || ''
        }
      } catch (e) {
        data.joinLink = ''
        data.teacherName = ''
      }
      return data
    }))
    bookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
    setMyBookings(bookings)
  }

  useEffect(() => {
    fetchTeachers()
    fetchPackages()
    fetchMyBookings()
    fetchSlots(null)
  }, [])

  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher)
    setSelectedSlotId(null)
    setSelectedPackageId(null)
    fetchSlots(teacher ? teacher.id : null)
  }

  const bookSlot = async (slot) => {
    if (myPackages.length === 0) return alert(l.noPackage)
    if (!selectedPackageId) return alert(l.selectPackage)
    const selectedPkg = myPackages.find(p => p.id === selectedPackageId)
    if (!selectedPkg || selectedPkg.remainingLessons <= 0) return alert('No lessons remaining')

    setLoading(true)
    try {
      await updateDoc(doc(db, 'slots', slot.id), {
        booked: true, studentId: auth.currentUser.uid
      })
      await addDoc(collection(db, 'bookings'), {
        slotId: slot.id,
        studentId: auth.currentUser.uid,
        teacherId: slot.teacherId,
        studentPackageId: selectedPkg.id,
        packageId: selectedPkg.packageId,
        packageName: selectedPkg.packageName,
        date: slot.date,
        time: slot.time,
        duration: slot.duration,
        status: 'confirmed',
        joinLink: slot.joinLink || '',
        createdAt: new Date()
      })
      await updateDoc(doc(db, 'studentPackages', selectedPkg.id), {
        remainingLessons: selectedPkg.remainingLessons - 1
      })
      setSelectedSlotId(null)
      setSelectedPackageId(null)
      await fetchPackages()
      await fetchSlots(selectedTeacher ? selectedTeacher.id : null)
      await fetchMyBookings()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const cancelBooking = async (booking) => {
    const slotTime = new Date(booking.date + 'T' + booking.time)
    const hoursUntil = (slotTime - new Date()) / (1000 * 60 * 60)
    const isMissed = hoursUntil <= 48

    if (isMissed) {
      const confirmed = window.confirm(l.cancelWarning)
      if (!confirmed) return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: isMissed ? 'missed' : 'cancelled'
      })
      if (!isMissed) {
        await updateDoc(doc(db, 'slots', booking.slotId), { booked: false, studentId: null })
        if (booking.studentPackageId) {
          const pkgSnap = await getDoc(doc(db, 'studentPackages', booking.studentPackageId))
          if (pkgSnap.exists()) {
            await updateDoc(doc(db, 'studentPackages', booking.studentPackageId), {
              remainingLessons: pkgSnap.data().remainingLessons + 1
            })
          }
        }
      }
      await fetchPackages()
      await fetchMyBookings()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const isWithin48 = (booking) => {
    const hoursUntil = (new Date(booking.date + 'T' + booking.time) - new Date()) / (1000 * 60 * 60)
    return hoursUntil <= 48
  }

  const getJoinLinkStatus = (booking) => {
    const start = new Date(booking.date + 'T' + booking.time)
    const end = new Date(start.getTime() + booking.duration * 60000)
    const now = new Date()
    const minsUntil = (start - now) / 60000
    if (minsUntil <= 15 && now <= end) return 'show'
    if (minsUntil <= 60 && minsUntil > 15) return 'soon'
    return 'hidden'
  }

  // Enrich slots with teacher name
  const enrichedSlots = slots.map(slot => ({
    ...slot,
    teacherName: teachers.find(t => t.id === slot.teacherId)?.name || ''
  }))

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📅 {l.title}</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {['available', 'myBookings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
              ${tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {t === 'available' ? `✅ ${l.available}` : `📋 ${l.myBookings}`}
          </button>
        ))}
      </div>

      {/* Available Slots */}
      {tab === 'available' && (
        <div className="space-y-4">
          {/* Package warning */}
          {myPackages.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 text-center text-sm text-yellow-700 dark:text-yellow-300">
              📦 {l.noPackage}
            </div>
          )}

          {/* Teacher selector */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">👨‍🏫 {l.selectTeacher}</p>
            {teachers.length === 0
              ? <p className="text-sm text-gray-400">{l.noTeachers}</p>
              : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleSelectTeacher(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition
                      ${!selectedTeacher
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                    🌐 {l.allTeachers}
                  </button>
                  {teachers.map(t => (
                    <button key={t.id}
                      onClick={() => handleSelectTeacher(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition
                        ${selectedTeacher?.id === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                      👤 {t.name}
                    </button>
                  ))}
                </div>
              )
            }
          </div>

          {/* Slots list */}
          {enrichedSlots.length === 0
            ? <p className="text-center text-gray-400">{l.noSlots}</p>
            : enrichedSlots.map(slot => (
              <div key={slot.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3 border-2 transition cursor-pointer
                  ${selectedSlotId === slot.id ? 'border-indigo-600' : 'border-transparent'}`}
                onClick={() => selectedSlotId === slot.id ? setSelectedSlotId(null) : setSelectedSlotId(slot.id)}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold dark:text-white">📅 {slot.date} — 🕐 {slot.time}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">⏱ {slot.duration} {l.minutes}</p>
                    {slot.teacherName && (
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                        👨‍🏫 {slot.teacherName}
                      </p>
                    )}
                  </div>
                  <input type="radio" checked={selectedSlotId === slot.id} onChange={() => {}}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer" />
                </div>

                {/* Package + Book */}
                {selectedSlotId === slot.id && myPackages.length > 0 && (
                  <div className="space-y-2 border-t pt-3" onClick={e => e.stopPropagation()}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{l.selectPackage}</p>
                    <div className="space-y-2">
                      {myPackages.map(pkg => (
                        <label key={pkg.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border-2 cursor-pointer transition
                            ${selectedPackageId === pkg.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'}`}>
                          <input type="radio" name="package" checked={selectedPackageId === pkg.id}
                            onChange={() => setSelectedPackageId(pkg.id)} className="accent-indigo-600" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm dark:text-white">{pkg.packageName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pkg.remainingLessons} {l.lessonUsedFrom}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button onClick={() => bookSlot(slot)} disabled={loading || !selectedPackageId}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
                      {loading ? '...' : l.book}
                    </button>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* My Bookings */}
      {tab === 'myBookings' && (
        <div className="space-y-3">
          {myBookings.length === 0 && <p className="text-center text-gray-400">{l.noBookings}</p>}
          {myBookings.map(booking => (
            <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold dark:text-white">📅 {booking.date} — 🕐 {booking.time}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">⏱ {booking.duration} {l.minutes}</p>
                  {booking.teacherName && (
                    <p className="text-xs text-indigo-500 dark:text-indigo-400">
                      👨‍🏫 {booking.teacherName}
                    </p>
                  )}
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">📦 {booking.packageName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium
                  ${booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                    : booking.status === 'missed'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {booking.status === 'confirmed' ? `✅ ${l.confirmed}`
                    : booking.status === 'missed' ? `❌ ${l.missed}`
                    : `🚫 ${booking.status}`}
                </span>
              </div>

              {booking.status === 'confirmed' && (() => {
                const status = getJoinLinkStatus(booking)
                if (status === 'show' && booking.joinLink) return (
                  <a href={booking.joinLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition">
                    🔗 {l.joinNow}
                  </a>
                )
                if (status === 'soon') return (
                  <p className="text-xs text-gray-400">🕐 {l.linkSoon}</p>
                )
                return null
              })()}

              {booking.status === 'confirmed' && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  {isWithin48(booking) && (
                    <p className="text-xs text-orange-500">⚠️ {l.cancelWarning}</p>
                  )}
                  <button onClick={() => cancelBooking(booking)} disabled={loading}
                    className="ms-auto text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                    {l.cancel}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

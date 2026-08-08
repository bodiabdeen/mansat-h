import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import {
  collection, getDocs, doc, getDoc, updateDoc, writeBatch,
  query, where
} from 'firebase/firestore'
import SlotCalendar from '../../components/SlotCalendar'
import StatTile from '../../components/StatTile'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    title: 'حجوزاتي', myBookings: 'حجوزاتي', available: 'المواعيد المتاحة',
    book: 'احجز', cancel: 'إلغاء',
    noBookings: 'لا توجد حجوزات', minutes: 'دقيقة',
    cancelWarning: 'تنبيه: الإلغاء خلال 48 ساعة سيُحتسب كحصة مستهلكة',
    missed: 'غياب (محتسب)', confirmed: 'مؤكد', noPackage: 'يجب تفعيل باقة أولاً',
    selectPackage: 'اختر الباقة المراد استخدام حصة منها', lessonUsedFrom: 'حصص متبقية',
    joinNow: 'انضم للحصة الآن', linkSoon: 'الرابط سيظهر قبل 15 دقيقة',
    teacher: 'المعلم', selectTeacher: 'اختر معلماً',
    noTeachers: 'لا يوجد معلم معتمد على باقاتك بعد',
    selectedSlots: 'المواعيد المختارة', notEnoughLessons: 'الباقة المختارة لا تحتوي على عدد كافٍ من الحصص المتبقية',
    completed: 'مكتملة', cancelledStat: 'ملغاة (مستردة)', upcomingStat: 'قادمة'
  },
  en: {
    title: 'My Bookings', myBookings: 'My Bookings', available: 'Available Slots',
    book: 'Book', cancel: 'Cancel',
    noBookings: 'No bookings yet', minutes: 'min',
    cancelWarning: 'Warning: Cancelling within 48 hours counts as a used lesson',
    missed: 'Missed (counted)', confirmed: 'Confirmed', noPackage: 'Please activate a package first',
    selectPackage: 'Select which package to use', lessonUsedFrom: 'lessons left',
    joinNow: 'Join Lesson Now', linkSoon: 'Link appears 15 min before',
    teacher: 'Teacher', selectTeacher: 'Select a Teacher',
    noTeachers: 'No approved teacher for your packages yet',
    selectedSlots: 'Selected Slots', notEnoughLessons: "Selected package doesn't have enough lessons remaining",
    completed: 'Completed', cancelledStat: 'Cancelled (refunded)', upcomingStat: 'Upcoming'
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
  const [tab, setTab] = useState(() => {
    const initialTab = localStorage.getItem('bookSlotInitialTab')
    if (initialTab) localStorage.removeItem('bookSlotInitialTab')
    return initialTab || 'myBookings'
  })
  const [selectedSlotIds, setSelectedSlotIds] = useState([])
  const [selectedPackageId, setSelectedPackageId] = useState(null)

  const fetchPackages = async () => {
    const pkgSnap = await getDocs(query(
      collection(db, 'studentPackages'),
      where('studentId', '==', auth.currentUser.uid)
    ))
    const pkgs = pkgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    // Packages created before the pending-approval workflow existed have no `status`
    // field at all — treat those as active so existing students aren't locked out.
    const active = pkgs.filter(p => p.status !== 'pending_approval' && p.status !== 'rejected' && p.remainingLessons > 0)
    setMyPackages(active)
    return active
  }

  // Only the teachers tied to this student's own approved (active) packages —
  // not every teacher in the system.
  const fetchTeachers = async (activePackages) => {
    const teacherIds = [...new Set(activePackages.map(p => p.teacherId).filter(Boolean))]
    if (teacherIds.length === 0) {
      setTeachers([])
      return []
    }
    const teacherDocs = await Promise.all(teacherIds.map(id => getDoc(doc(db, 'users', id))))
    const list = teacherDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }))
    setTeachers(list)
    return list
  }

  const fetchSlots = async (teacherId, allowedTeachers) => {
    const idsToQuery = teacherId ? [teacherId] : (allowedTeachers || teachers).map(t => t.id)
    if (idsToQuery.length === 0) {
      setSlots([])
      return
    }
    // Fetch every slot (not just open ones) so the calendar shows the whole
    // picture — booked/past blocks render disabled, not hidden.
    const results = await Promise.all(idsToQuery.map(id =>
      getDocs(query(collection(db, 'slots'), where('teacherId', '==', id)))
    ))
    const list = results.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSlots(list)
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
    const init = async () => {
      const activePackages = await fetchPackages()
      const allowedTeachers = await fetchTeachers(activePackages)
      const defaultTeacher = allowedTeachers[0] || null
      setSelectedTeacher(defaultTeacher)
      await fetchSlots(defaultTeacher ? defaultTeacher.id : null, allowedTeachers)
      await fetchMyBookings()
    }
    init()
  }, [])

  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher)
    setSelectedSlotIds([])
    setSelectedPackageId(null)
    fetchSlots(teacher ? teacher.id : null, teachers)
  }

  const toggleSlot = (slot) => {
    setSelectedSlotIds(prev =>
      prev.includes(slot.id) ? prev.filter(id => id !== slot.id) : [...prev, slot.id])
  }

  const bookSelectedSlots = async (slotsToBook) => {
    if (myPackages.length === 0) return alert(l.noPackage)
    if (!selectedPackageId) return alert(l.selectPackage)
    const selectedPkg = myPackages.find(p => p.id === selectedPackageId)
    if (!selectedPkg) return
    if (selectedPkg.remainingLessons < slotsToBook.length) return alert(l.notEnoughLessons)

    setLoading(true)
    try {
      const batch = writeBatch(db)
      slotsToBook.forEach(slot => {
        batch.update(doc(db, 'slots', slot.id), { booked: true, studentId: auth.currentUser.uid })
        batch.set(doc(collection(db, 'bookings')), {
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
      })
      batch.update(doc(db, 'studentPackages', selectedPkg.id), {
        remainingLessons: selectedPkg.remainingLessons - slotsToBook.length
      })
      await batch.commit()
      setSelectedSlotIds([])
      setSelectedPackageId(null)
      await fetchPackages()
      await fetchSlots(selectedTeacher ? selectedTeacher.id : null, teachers)
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
  const selectedSlots = selectedSlotIds
    .map(id => enrichedSlots.find(s => s.id === id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))

  const now = new Date()
  const bookingStats = {
    completed: myBookings.filter(b => b.status === 'confirmed' && new Date(b.date + 'T' + b.time) < now).length,
    missed: myBookings.filter(b => b.status === 'missed').length,
    cancelled: myBookings.filter(b => b.status === 'cancelled').length,
    upcoming: myBookings.filter(b => b.status === 'confirmed' && new Date(b.date + 'T' + b.time) >= now).length,
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400"><Icon e="📅" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {['available', 'myBookings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
              ${tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {t === 'available'
              ? <><Icon e="✅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.available}</>
              : <><Icon e="📋" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.myBookings}</>}
          </button>
        ))}
      </div>

      {/* Available Slots */}
      {tab === 'available' && (
        <div className="space-y-4">
          {/* Package warning */}
          {myPackages.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 text-center text-sm text-yellow-700 dark:text-yellow-300">
              <Icon e="📦" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.noPackage}
            </div>
          )}

          {/* Teacher selector */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400"><Icon e="👨‍🏫" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.selectTeacher}</p>
            {teachers.length === 0
              ? <p className="text-sm text-gray-400">{l.noTeachers}</p>
              : (
                <div className="flex gap-2 flex-wrap">
                  {teachers.map(t => (
                    <button key={t.id}
                      onClick={() => handleSelectTeacher(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition
                        ${selectedTeacher?.id === t.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                      <Icon e="👤" className="w-5 h-5 inline-block align-[-0.3em]" /> {t.name}
                    </button>
                  ))}
                </div>
              )
            }
          </div>

          {/* Calendar — click multiple slots to select them all */}
          <SlotCalendar lang={lang} mode="book" slots={enrichedSlots}
            selectedSlotIds={selectedSlotIds}
            onSelectSlot={toggleSlot} />

          {/* Package + Book, shown once at least one slot is picked */}
          {selectedSlots.length > 0 && myPackages.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{l.selectedSlots}</p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map(slot => (
                  <span key={slot.id}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full">
                    <Icon e="📅" className="w-4 h-4 inline-block align-[-0.25em]" /> {slot.date} — {slot.time}
                    <button onClick={() => toggleSlot(slot)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-100">×</button>
                  </span>
                ))}
              </div>

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
              <button onClick={() => bookSelectedSlots(selectedSlots)} disabled={loading || !selectedPackageId}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
                {loading ? '...' : `${l.book} (${selectedSlots.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* My Bookings */}
      {tab === 'myBookings' && (
        <div className="space-y-3">
          {myBookings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon="✅" label={l.completed} value={bookingStats.completed} color="green" />
              <StatTile icon="⚠️" label={l.missed} value={bookingStats.missed} color="orange" />
              <StatTile icon="🚫" label={l.cancelledStat} value={bookingStats.cancelled} color="gray" />
              <StatTile icon="📅" label={l.upcomingStat} value={bookingStats.upcoming} color="indigo" />
            </div>
          )}
          {myBookings.length === 0 && <p className="text-center text-gray-400">{l.noBookings}</p>}
          {myBookings.map(booking => (
            <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold dark:text-white"><Icon e="📅" className="w-5 h-5 inline-block align-[-0.3em]" /> {booking.date} — <Icon e="🕐" className="w-5 h-5 inline-block align-[-0.3em]" /> {booking.time}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400"><Icon e="⏱" className="w-5 h-5 inline-block align-[-0.3em]" /> {booking.duration} {l.minutes}</p>
                  {booking.teacherName && (
                    <p className="text-xs text-indigo-500 dark:text-indigo-400">
                      <Icon e="👨‍🏫" className="w-4 h-4 inline-block align-[-0.25em]" /> {booking.teacherName}
                    </p>
                  )}
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1"><Icon e="📦" className="w-4 h-4 inline-block align-[-0.25em]" /> {booking.packageName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium
                  ${booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                    : booking.status === 'missed'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {booking.status === 'confirmed'
                    ? <><Icon e="✅" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.confirmed}</>
                    : booking.status === 'missed'
                    ? <><Icon e="❌" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.missed}</>
                    : <><Icon e="🚫" className="w-4 h-4 inline-block align-[-0.25em]" /> {booking.status}</>}
                </span>
              </div>

              {booking.status === 'confirmed' && (() => {
                const status = getJoinLinkStatus(booking)
                if (status === 'show' && booking.joinLink) return (
                  <a href={booking.joinLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition">
                    <Icon e="🔗" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.joinNow}
                  </a>
                )
                if (status === 'soon') return (
                  <p className="text-xs text-gray-400"><Icon e="🕐" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.linkSoon}</p>
                )
                return null
              })()}

              {booking.status === 'confirmed' && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  {isWithin48(booking) && (
                    <p className="text-xs text-orange-500"><Icon e="⚠️" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.cancelWarning}</p>
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

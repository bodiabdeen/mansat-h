import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'
import Icon from '../../components/Icon'

const labels = {
  ar: {
    noCourses: 'لا توجد دورات متاحة بعد',
    noPackages: 'لا توجد باقات لهذه الدورة بعد', lessons_: 'حصة',
    request: 'طلب الباقة', requested: 'تم الطلب — بانتظار الموافقة',
    active: 'مفعّلة', selectTeacher: 'اختر المعلم', noTeachers: 'لا يوجد معلمون متاحون بعد',
    confirmRequest: 'تأكيد الطلب', cancel: 'إلغاء',
    requestConfirm: 'سيتم إرسال طلب لهذه الباقة، ويقوم أحد المسؤولين بتأكيد الدفع وتفعيلها. هل تريد المتابعة؟',
    saveFailed: 'فشل إرسال الطلب. حاول مرة أخرى.\n\n'
  },
  en: {
    noCourses: 'No courses available yet',
    noPackages: 'No packages for this course yet', lessons_: 'lessons',
    request: 'Request Package', requested: 'Requested — awaiting approval',
    active: 'Active', selectTeacher: 'Select Teacher', noTeachers: 'No teachers available yet',
    confirmRequest: 'Confirm Request', cancel: 'Cancel',
    requestConfirm: 'This will send a request for this package; an admin will confirm payment and activate it. Continue?',
    saveFailed: 'Could not send the request. Try again.\n\n'
  }
}

export default function CourseCatalog({ lang }) {
  const l = labels[lang]
  const [courses, setCourses] = useState([])
  const [packages, setPackages] = useState([])
  const [myPackages, setMyPackages] = useState([])
  const [teachers, setTeachers] = useState([])
  const [openPackageId, setOpenPackageId] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    const [courseSnap, pkgSnap, mySnap, teacherSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'packages')),
      getDocs(query(collection(db, 'studentPackages'), where('studentId', '==', auth.currentUser.uid))),
      getDocs(query(collection(db, 'users'), where('roles', 'array-contains', 'teacher')))
    ])
    setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setMyPackages(mySnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const openRequest = (pkg) => {
    setOpenPackageId(pkg.id)
    setSelectedTeacherId('')
  }
  const closeRequest = () => {
    setOpenPackageId(null)
    setSelectedTeacherId('')
  }

  const requestPackage = async (pkg) => {
    if (!selectedTeacherId) return
    if (!window.confirm(l.requestConfirm)) return
    setLoading(true)
    try {
      const docId = `${auth.currentUser.uid}_${pkg.id}`
      await setDoc(doc(db, 'studentPackages', docId), {
        packageId: pkg.id,
        packageName: pkg.name,
        courseId: pkg.courseId || null,
        teacherId: selectedTeacherId,
        totalLessons: pkg.lessons,
        remainingLessons: 0,
        price: pkg.price,
        currency: pkg.currency || 'SAR',
        studentId: auth.currentUser.uid,
        selectedAt: new Date(),
        status: 'pending_approval',
        paymentStatus: 'unpaid',
        amountPaid: 0
      })
      closeRequest()
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const myStatusFor = (pkgId) => myPackages.find(sp => sp.packageId === pkgId)?.status || null

  return (
    <div>
      {courses.length === 0 && (
        <p className="text-center text-gray-400">{l.noCourses}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
      {courses.map(course => {
        const coursePackages = packages.filter(p => p.courseId === course.id)
        return (
          <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <div className="flex items-start gap-3">
              {course.photoUrl && (
                <img src={course.photoUrl} alt={course.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-800 dark:text-white">{course.name}</p>
                {course.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
                )}
              </div>
            </div>

            {course.introVideoUrl && (
              <video controls className="w-full rounded-xl max-h-48" src={course.introVideoUrl} />
            )}

            {coursePackages.length === 0 ? (
              <p className="text-sm text-gray-400">{l.noPackages}</p>
            ) : (
              <div className="space-y-2">
                {coursePackages.map(pkg => {
                  const status = myStatusFor(pkg.id)
                  const isOpen = openPackageId === pkg.id
                  return (
                    <div key={pkg.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{pkg.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {pkg.lessons} {l.lessons_} — {pkg.price} {pkg.currency || 'SAR'}
                          </p>
                        </div>
                        {status === 'pending_approval' ? (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 shrink-0"><Icon e="⏳" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.requested}</span>
                        ) : status === 'active' ? (
                          <span className="text-xs text-green-600 dark:text-green-400 shrink-0"><Icon e="✅" className="w-4 h-4 inline-block align-[-0.25em]" /> {l.active}</span>
                        ) : !isOpen && (
                          <button onClick={() => openRequest(pkg)} disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition shrink-0 whitespace-nowrap">
                            {l.request}
                          </button>
                        )}
                      </div>

                      {isOpen && status !== 'pending_approval' && status !== 'active' && (
                        <div className="space-y-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                          {teachers.length === 0 ? (
                            <p className="text-xs text-gray-400">{l.noTeachers}</p>
                          ) : (
                            <select className="input" value={selectedTeacherId}
                              onChange={e => setSelectedTeacherId(e.target.value)}>
                              <option value="">{l.selectTeacher}</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => requestPackage(pkg)} disabled={loading || !selectedTeacherId}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs py-1.5 rounded-lg font-semibold transition">
                              {loading ? '...' : l.confirmRequest}
                            </button>
                            <button onClick={closeRequest} disabled={loading}
                              className="px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 text-xs py-1.5 rounded-lg font-semibold transition">
                              {l.cancel}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

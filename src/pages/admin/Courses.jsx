import { useEffect, useState } from 'react'
import { db, auth, storage } from '../../firebase'
import {
  collection, addDoc, updateDoc, getDocs, deleteDoc, doc, query, where
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Icon from '../../components/Icon'

const CURRENCIES = ['EGP', 'SAR', 'USD', 'GBP']

const labels = {
  ar: {
    title: 'الدورات والباقات', addCourse: 'إضافة دورة', editCourse: 'تعديل الدورة', courseName: 'اسم الدورة',
    description: 'الوصف (اختياري)', photos: 'صور (اختياري)', videos: 'فيديوهات تعريفية (اختياري)',
    add: 'إضافة', update: 'تحديث', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل',
    noCourses: 'لا توجد دورات بعد', inUse: 'لا يمكن حذف دورة مرتبطة بباقات موجودة',
    packages: 'الباقات', noPackages: 'لا توجد باقات لهذه الدورة بعد',
    addPackage: 'إضافة باقة', editPackage: 'تعديل الباقة', packageName: 'اسم الباقة',
    lessons: 'عدد الحصص', price: 'السعر', lessons_: 'حصة', uploading: 'جارٍ الرفع...',
    saveFailed: 'فشل الحفظ. تأكد من صلاحياتك وحاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Courses & Packages', addCourse: 'Add Course', editCourse: 'Edit Course', courseName: 'Course Name',
    description: 'Description (optional)', photos: 'Photos (optional)', videos: 'Intro Videos (optional)',
    add: 'Add', update: 'Update', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    noCourses: 'No courses yet', inUse: 'Cannot delete a course that has packages linked to it',
    packages: 'Packages', noPackages: 'No packages for this course yet',
    addPackage: 'Add Package', editPackage: 'Edit Package', packageName: 'Package Name',
    lessons: 'Number of Lessons', price: 'Price', lessons_: 'lessons', uploading: 'Uploading...',
    saveFailed: 'Save failed. Check your permissions and try again.\n\n'
  }
}

const emptyCourseForm = { name: '', description: '' }
const emptyPkgForm = { courseId: null, editingId: null, name: '', lessons: '', price: '', currency: 'SAR' }

export default function Courses({ lang }) {
  const l = labels[lang]
  const [courses, setCourses] = useState([])
  const [packages, setPackages] = useState([])

  const [form, setForm] = useState(emptyCourseForm)
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newVideoFiles, setNewVideoFiles] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [existingPhotoUrls, setExistingPhotoUrls] = useState([])
  const [existingVideoUrls, setExistingVideoUrls] = useState([])
  const [loading, setLoading] = useState(false)

  const [pkgForm, setPkgForm] = useState(emptyPkgForm)

  const fetchData = async () => {
    const [courseSnap, pkgSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'packages'))
    ])
    setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const resetCourseForm = () => {
    setForm(emptyCourseForm)
    setNewPhotoFiles([])
    setNewVideoFiles([])
    setEditingId(null)
    setExistingPhotoUrls([])
    setExistingVideoUrls([])
  }

  const saveCourse = async () => {
    if (!form.name) return
    setLoading(true)
    try {
      const uploadedPhotoUrls = await Promise.all(newPhotoFiles.map(async file => {
        const r = ref(storage, `courses/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        return getDownloadURL(r)
      }))
      const uploadedVideoUrls = await Promise.all(newVideoFiles.map(async file => {
        const r = ref(storage, `courses/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        return getDownloadURL(r)
      }))
      const photoUrls = [...existingPhotoUrls, ...uploadedPhotoUrls]
      const videoUrls = [...existingVideoUrls, ...uploadedVideoUrls]
      const data = {
        name: form.name, description: form.description || '',
        photoUrls, videoUrls,
        // kept in sync for older screens that still read the single-value fields
        photoUrl: photoUrls[0] || '', introVideoUrl: videoUrls[0] || ''
      }
      if (editingId) {
        await updateDoc(doc(db, 'courses', editingId), data)
      } else {
        await addDoc(collection(db, 'courses'), {
          ...data, createdBy: auth.currentUser.uid, createdAt: new Date()
        })
      }
      resetCourseForm()
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditCourse = (course) => {
    setEditingId(course.id)
    setForm({ name: course.name || '', description: course.description || '' })
    setExistingPhotoUrls(course.photoUrls || (course.photoUrl ? [course.photoUrl] : []))
    setExistingVideoUrls(course.videoUrls || (course.introVideoUrl ? [course.introVideoUrl] : []))
    setNewPhotoFiles([])
    setNewVideoFiles([])
  }

  const deleteCourse = async (id) => {
    const inUse = await getDocs(query(collection(db, 'packages'), where('courseId', '==', id)))
    if (!inUse.empty) {
      alert(l.inUse)
      return
    }
    await deleteDoc(doc(db, 'courses', id))
    if (editingId === id) resetCourseForm()
    await fetchData()
  }

  const openAddPackage = (courseId) => setPkgForm({ ...emptyPkgForm, courseId })
  const openEditPackage = (pkg) => setPkgForm({
    courseId: pkg.courseId, editingId: pkg.id,
    name: pkg.name, lessons: pkg.lessons, price: pkg.price, currency: pkg.currency || 'SAR'
  })
  const closePkgForm = () => setPkgForm(emptyPkgForm)

  const savePackage = async () => {
    if (!pkgForm.name || !pkgForm.lessons || !pkgForm.price) return
    setLoading(true)
    try {
      const data = {
        name: pkgForm.name, lessons: Number(pkgForm.lessons),
        price: Number(pkgForm.price), currency: pkgForm.currency, courseId: pkgForm.courseId
      }
      if (pkgForm.editingId) {
        await updateDoc(doc(db, 'packages', pkgForm.editingId), data)
      } else {
        await addDoc(collection(db, 'packages'), {
          ...data, createdBy: auth.currentUser.uid, createdAt: new Date()
        })
      }
      closePkgForm()
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deletePackage = async (id) => {
    await deleteDoc(doc(db, 'packages', id))
    if (pkgForm.editingId === id) closePkgForm()
    await fetchData()
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📚" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      {/* Add/Edit Course */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
          {editingId ? l.editCourse : l.addCourse}
        </p>
        <input className="input" placeholder={l.courseName}
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder={l.description}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400 w-fit">
            <Icon e="🖼️" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.photos}
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={e => setNewPhotoFiles([...e.target.files])} />
          </label>
          {(existingPhotoUrls.length > 0 || newPhotoFiles.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {existingPhotoUrls.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <button type="button" onClick={() => setExistingPhotoUrls(existingPhotoUrls.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -end-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none">×</button>
                </div>
              ))}
              {newPhotoFiles.map((f, i) => (
                <span key={i} className="text-xs text-gray-500 self-center truncate max-w-[6rem]">{f.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400 w-fit">
            <Icon e="🎬" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.videos}
            <input type="file" accept="video/*" multiple className="hidden"
              onChange={e => setNewVideoFiles([...e.target.files])} />
          </label>
          {(existingVideoUrls.length > 0 || newVideoFiles.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {existingVideoUrls.map((url, i) => (
                <div key={url} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                  <span className="text-xs text-gray-600 dark:text-gray-300">🎬 {i + 1}</span>
                  <button type="button" onClick={() => setExistingVideoUrls(existingVideoUrls.filter((_, j) => j !== i))}
                    className="text-red-500 text-xs">×</button>
                </div>
              ))}
              {newVideoFiles.map((f, i) => (
                <span key={i} className="text-xs text-gray-500 truncate max-w-[6rem]">{f.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={saveCourse} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
            {loading
              ? <><Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.uploading}</>
              : (editingId ? l.update : `+ ${l.add}`)}
          </button>
          {editingId && (
            <button onClick={resetCourseForm} disabled={loading}
              className="px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-semibold transition">
              {l.cancel}
            </button>
          )}
        </div>
      </div>

      {/* Courses list */}
      <div className="space-y-3">
        {courses.length === 0 && (
          <p className="text-center text-gray-400">{l.noCourses}</p>
        )}
        {courses.map(course => {
          const coursePackages = packages.filter(p => p.courseId === course.id)
          const photoUrls = course.photoUrls || (course.photoUrl ? [course.photoUrl] : [])
          const videoUrls = course.videoUrls || (course.introVideoUrl ? [course.introVideoUrl] : [])
          return (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-start gap-3">
                {photoUrls[0] && (
                  <img src={photoUrls[0]} alt={course.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 dark:text-white">{course.name}</p>
                  {course.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => startEditCourse(course)}
                    className="text-indigo-500 hover:text-indigo-700 text-xs px-3 py-1 rounded-lg border border-indigo-200 hover:border-indigo-400 transition">
                    {l.edit}
                  </button>
                  <button onClick={() => deleteCourse(course.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                    {l.delete}
                  </button>
                </div>
              </div>

              {photoUrls.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {photoUrls.slice(1).map(url => (
                    <img key={url} src={url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ))}
                </div>
              )}

              {videoUrls.length > 0 && (
                <div className="space-y-2">
                  {videoUrls.map(url => (
                    <video key={url} controls className="w-full rounded-xl max-h-48" src={url} />
                  ))}
                </div>
              )}

              {/* Packages under this course */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Icon e="📦" className="w-4 h-4 inline-block align-[-0.3em]" /> {l.packages}
                </p>
                {coursePackages.length === 0 && (
                  <p className="text-xs text-gray-400">{l.noPackages}</p>
                )}
                {coursePackages.map(pkg => (
                  <div key={pkg.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{pkg.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pkg.lessons} {l.lessons_} — {pkg.price} {pkg.currency || 'SAR'}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEditPackage(pkg)}
                        className="text-indigo-500 hover:text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200 hover:border-indigo-400 transition">
                        {l.edit}
                      </button>
                      <button onClick={() => deletePackage(pkg.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition">
                        {l.delete}
                      </button>
                    </div>
                  </div>
                ))}

                {pkgForm.courseId === course.id ? (
                  <div className="space-y-2 pt-1">
                    <input className="input" placeholder={l.packageName}
                      value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} />
                    <div className="flex gap-2">
                      <input className="input" placeholder={l.lessons} type="number"
                        value={pkgForm.lessons} onChange={e => setPkgForm({ ...pkgForm, lessons: e.target.value })} />
                      <input className="input" placeholder={l.price} type="number"
                        value={pkgForm.price} onChange={e => setPkgForm({ ...pkgForm, price: e.target.value })} />
                      <select className="input" value={pkgForm.currency}
                        onChange={e => setPkgForm({ ...pkgForm, currency: e.target.value })}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={savePackage} disabled={loading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-1.5 rounded-lg font-semibold transition">
                        {pkgForm.editingId ? l.update : `+ ${l.add}`}
                      </button>
                      <button onClick={closePkgForm} disabled={loading}
                        className="px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm py-1.5 rounded-lg font-semibold transition">
                        {l.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => openAddPackage(course.id)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                    + {l.addPackage}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

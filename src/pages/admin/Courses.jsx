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
    description: 'الوصف (اختياري)', photo: 'صورة (اختياري)', video: 'فيديو تعريفي (اختياري)',
    add: 'إضافة', update: 'تحديث', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل',
    noCourses: 'لا توجد دورات بعد', inUse: 'لا يمكن حذف دورة مرتبطة بباقات موجودة',
    packages: 'الباقات', noPackages: 'لا توجد باقات لهذه الدورة بعد',
    addPackage: 'إضافة باقة', editPackage: 'تعديل الباقة', packageName: 'اسم الباقة',
    lessons: 'عدد الحصص', price: 'السعر', lessons_: 'حصة', uploading: 'جارٍ الرفع...',
    saveFailed: 'فشل الحفظ. تأكد من صلاحياتك وحاول مرة أخرى.\n\n'
  },
  en: {
    title: 'Courses & Packages', addCourse: 'Add Course', editCourse: 'Edit Course', courseName: 'Course Name',
    description: 'Description (optional)', photo: 'Photo (optional)', video: 'Intro Video (optional)',
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
  const [photoFile, setPhotoFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingPhotoUrl, setEditingPhotoUrl] = useState('')
  const [editingVideoUrl, setEditingVideoUrl] = useState('')
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
    setPhotoFile(null)
    setVideoFile(null)
    setEditingId(null)
    setEditingPhotoUrl('')
    setEditingVideoUrl('')
  }

  const saveCourse = async () => {
    if (!form.name) return
    setLoading(true)
    try {
      let photoUrl = editingPhotoUrl
      let introVideoUrl = editingVideoUrl
      if (photoFile) {
        const r = ref(storage, `courses/${Date.now()}_${photoFile.name}`)
        await uploadBytes(r, photoFile)
        photoUrl = await getDownloadURL(r)
      }
      if (videoFile) {
        const r = ref(storage, `courses/${Date.now()}_${videoFile.name}`)
        await uploadBytes(r, videoFile)
        introVideoUrl = await getDownloadURL(r)
      }
      const data = { name: form.name, description: form.description || '', photoUrl, introVideoUrl }
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
    setEditingPhotoUrl(course.photoUrl || '')
    setEditingVideoUrl(course.introVideoUrl || '')
    setPhotoFile(null)
    setVideoFile(null)
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

        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400">
            <Icon e="🖼️" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.photo}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => setPhotoFile(e.target.files[0])} />
          </label>
          {(photoFile || editingPhotoUrl) && (
            <span className="text-xs text-gray-500 truncate max-w-[10rem]">
              {photoFile ? photoFile.name : '✓ ' + l.photo}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400">
            <Icon e="🎬" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.video}
            <input type="file" accept="video/*" className="hidden"
              onChange={e => setVideoFile(e.target.files[0])} />
          </label>
          {(videoFile || editingVideoUrl) && (
            <span className="text-xs text-gray-500 truncate max-w-[10rem]">
              {videoFile ? videoFile.name : '✓ ' + l.video}
            </span>
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
          return (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-start gap-3">
                {course.photoUrl && (
                  <img src={course.photoUrl} alt={course.name}
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

              {course.introVideoUrl && (
                <video controls className="w-full rounded-xl max-h-48" src={course.introVideoUrl} />
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

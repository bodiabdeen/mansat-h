import { useEffect, useState } from 'react'
import { db, storage } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Icon from './Icon'

const labels = {
  ar: {
    photo: 'الصورة الشخصية', title: 'اللقب / التخصص (مثال: معلم رياضيات وفيزياء)',
    bio: 'نبذة تعريفية', specialties: 'المهارات (مفصولة بفاصلة)',
    save: 'حفظ الملف الشخصي', saved: 'تم الحفظ ✅', uploading: 'جارٍ الرفع...',
    photoError: 'تعذّر رفع الصورة، لكن تم حفظ باقي البيانات. حاول لاحقاً.',
    saveError: 'حدث خطأ أثناء الحفظ، حاول مرة أخرى.'
  },
  en: {
    photo: 'Profile Photo', title: 'Title / Specialty (e.g. Math & Physics Tutor)',
    bio: 'Bio', specialties: 'Specialties (comma-separated)',
    save: 'Save Profile', saved: 'Saved ✅', uploading: 'Uploading...',
    photoError: 'Could not upload the photo, but the rest of your profile was saved. Try again later.',
    saveError: 'Something went wrong while saving. Please try again.'
  }
}

export default function TeacherProfileForm({ lang, teacherId }) {
  const l = labels[lang]
  const [name, setName] = useState('')
  const [form, setForm] = useState({ title: '', bio: '', specialties: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, 'users', teacherId)),
        getDoc(doc(db, 'teacherProfiles', teacherId))
      ])
      setName(userSnap.exists() ? userSnap.data().name || '' : '')
      if (profileSnap.exists()) {
        const p = profileSnap.data()
        setForm({ title: p.title || '', bio: p.bio || '', specialties: p.specialties || '' })
        setPhotoUrl(p.photoUrl || '')
      } else {
        setForm({ title: '', bio: '', specialties: '' })
        setPhotoUrl('')
      }
      setPhotoFile(null)
      setSaved(false)
    }
    fetchProfile()
  }, [teacherId])

  const save = async () => {
    setLoading(true)
    setError('')
    let finalPhotoUrl = photoUrl
    let photoFailed = false
    if (photoFile) {
      try {
        const r = ref(storage, `teacherProfiles/${teacherId}/${Date.now()}_${photoFile.name}`)
        await uploadBytes(r, photoFile)
        finalPhotoUrl = await getDownloadURL(r)
        setPhotoUrl(finalPhotoUrl)
      } catch (e) {
        photoFailed = true
      }
    }
    try {
      await setDoc(doc(db, 'teacherProfiles', teacherId), {
        name,
        title: form.title,
        bio: form.bio,
        specialties: form.specialties,
        photoUrl: finalPhotoUrl,
        updatedAt: new Date()
      }, { merge: true })
      setPhotoFile(null)
      if (photoFailed) {
        setError(l.photoError)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e) {
      setError(l.saveError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
      <div className="flex items-center gap-4">
        <img src={photoFile ? URL.createObjectURL(photoFile) : (photoUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23e5e7eb"/%3E%3C/svg%3E')}
          alt={name} className="w-20 h-20 rounded-full object-cover bg-gray-200 dark:bg-gray-700 shrink-0" />
        <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-600 dark:text-indigo-400">
          <Icon e="🖼️" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.photo}
          <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files[0])} />
        </label>
      </div>

      <input className="input" placeholder={l.title}
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <textarea className="input" rows={4} placeholder={l.bio}
        value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
      <input className="input" placeholder={l.specialties}
        value={form.specialties} onChange={e => setForm({ ...form, specialties: e.target.value })} />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
        {loading ? <><Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.uploading}</> : saved ? l.saved : l.save}
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { db, auth, storage } from '../../firebase'
import { collection, addDoc, updateDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import Icon from '../../components/Icon'

const MAX_FEATURED = 2

const labels = {
  ar: {
    title: 'الإعلانات والعروض', addPromo: 'إضافة إعلان', editPromo: 'تعديل الإعلان',
    promoTitle: 'العنوان', description: 'الوصف (اختياري)',
    photos: 'صور', videos: 'فيديوهات',
    add: 'إضافة', update: 'تحديث', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل',
    noPromos: 'لا توجد إعلانات بعد', uploading: 'جارٍ الرفع...',
    saveFailed: 'فشل الحفظ. تأكد من صلاحياتك وحاول مرة أخرى.\n\n',
    titleRequired: 'العنوان مطلوب',
    featured: 'مميز', markFeatured: 'إبراز على الصفحة الرئيسية', unmarkFeatured: 'إلغاء الإبراز',
    maxFeatured: 'يمكن إبراز إعلانين فقط في نفس الوقت. ألغِ إبراز أحدهما أولاً.'
  },
  en: {
    title: 'Promotions & Events', addPromo: 'Add Promotion', editPromo: 'Edit Promotion',
    promoTitle: 'Title', description: 'Description (optional)',
    photos: 'Photos', videos: 'Videos',
    add: 'Add', update: 'Update', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    noPromos: 'No promotions yet', uploading: 'Uploading...',
    saveFailed: 'Save failed. Check your permissions and try again.\n\n',
    titleRequired: 'Title is required',
    featured: 'Featured', markFeatured: 'Feature on homepage', unmarkFeatured: 'Remove from featured',
    maxFeatured: 'Only 2 promotions can be featured at once. Unfeature one first.'
  }
}

const emptyForm = { title: '', description: '' }

export default function Promotions({ lang }) {
  const l = labels[lang]
  const [promos, setPromos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [newPhotoFiles, setNewPhotoFiles] = useState([])
  const [newVideoFiles, setNewVideoFiles] = useState([])
  const [existingPhotoUrls, setExistingPhotoUrls] = useState([])
  const [existingVideoUrls, setExistingVideoUrls] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    const snap = await getDocs(collection(db, 'promotions'))
    setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setNewPhotoFiles([])
    setNewVideoFiles([])
    setExistingPhotoUrls([])
    setExistingVideoUrls([])
    setEditingId(null)
  }

  const savePromo = async () => {
    if (!form.title) return
    setLoading(true)
    try {
      const uploadedPhotoUrls = await Promise.all(newPhotoFiles.map(async file => {
        const r = ref(storage, `promotions/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        return getDownloadURL(r)
      }))
      const uploadedVideoUrls = await Promise.all(newVideoFiles.map(async file => {
        const r = ref(storage, `promotions/${Date.now()}_${file.name}`)
        await uploadBytes(r, file)
        return getDownloadURL(r)
      }))
      const data = {
        title: form.title,
        description: form.description || '',
        photoUrls: [...existingPhotoUrls, ...uploadedPhotoUrls],
        videoUrls: [...existingVideoUrls, ...uploadedVideoUrls]
      }
      if (editingId) {
        await updateDoc(doc(db, 'promotions', editingId), data)
      } else {
        await addDoc(collection(db, 'promotions'), {
          ...data, createdBy: auth.currentUser.uid, createdAt: new Date()
        })
      }
      resetForm()
      await fetchData()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (promo) => {
    setEditingId(promo.id)
    setForm({ title: promo.title || '', description: promo.description || '' })
    setExistingPhotoUrls(promo.photoUrls || [])
    setExistingVideoUrls(promo.videoUrls || [])
    setNewPhotoFiles([])
    setNewVideoFiles([])
  }

  const deletePromo = async (id) => {
    await deleteDoc(doc(db, 'promotions', id))
    if (editingId === id) resetForm()
    await fetchData()
  }

  const toggleFeatured = async (promo) => {
    if (!promo.featured && promos.filter(p => p.featured).length >= MAX_FEATURED) {
      alert(l.maxFeatured)
      return
    }
    await updateDoc(doc(db, 'promotions', promo.id), { featured: !promo.featured })
    await fetchData()
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="📣" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
      </h2>

      {/* Add/Edit Promotion */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
          {editingId ? l.editPromo : l.addPromo}
        </p>
        <input className="input" placeholder={l.promoTitle}
          value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
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
          <button onClick={savePromo} disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
            {loading
              ? <><Icon e="⏳" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.uploading}</>
              : (editingId ? l.update : `+ ${l.add}`)}
          </button>
          {editingId && (
            <button onClick={resetForm} disabled={loading}
              className="px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-semibold transition">
              {l.cancel}
            </button>
          )}
        </div>
      </div>

      {/* Promotions list */}
      <div className="space-y-3">
        {promos.length === 0 && (
          <p className="text-center text-gray-400">{l.noPromos}</p>
        )}
        {[...promos].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).map(promo => (
          <div key={promo.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
            <div className="flex items-start gap-3">
              {promo.photoUrls?.[0] && (
                <img src={promo.photoUrls[0]} alt={promo.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 dark:text-white">{promo.title}</p>
                  {promo.featured && (
                    <span className="text-[10px] bg-gold-50 dark:bg-gold-700/25 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full font-semibold">
                      ⭐ {l.featured}
                    </span>
                  )}
                </div>
                {promo.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{promo.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => toggleFeatured(promo)}
                  title={promo.featured ? l.unmarkFeatured : l.markFeatured}
                  className={`text-xs px-3 py-1 rounded-lg border transition
                    ${promo.featured
                      ? 'text-gold-600 border-gold-300 hover:border-gold-500'
                      : 'text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gold-400 hover:text-gold-500'}`}>
                  {promo.featured ? '⭐' : '☆'}
                </button>
                <button onClick={() => startEdit(promo)}
                  className="text-indigo-500 hover:text-indigo-700 text-xs px-3 py-1 rounded-lg border border-indigo-200 hover:border-indigo-400 transition">
                  {l.edit}
                </button>
                <button onClick={() => deletePromo(promo.id)}
                  className="text-red-400 hover:text-red-600 text-xs px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                  {l.delete}
                </button>
              </div>
            </div>
            {promo.photoUrls?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {promo.photoUrls.slice(1).map(url => (
                  <img key={url} src={url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
            {promo.videoUrls?.length > 0 && (
              <div className="space-y-2">
                {promo.videoUrls.map(url => (
                  <video key={url} controls className="w-full rounded-xl max-h-48" src={url} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

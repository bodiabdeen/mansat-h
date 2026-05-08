import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { auth } from '../../firebase'

const labels = {
  ar: {
    title: 'الباقات', addPackage: 'إضافة باقة', packageName: 'اسم الباقة',
    lessons: 'عدد الحصص', price: 'السعر', currency: 'ريال',
    add: 'إضافة', delete: 'حذف', noPackages: 'لا توجد باقات بعد',
    lessons_: 'حصة', price_: 'السعر'
  },
  en: {
    title: 'Packages', addPackage: 'Add Package', packageName: 'Package Name',
    lessons: 'Number of Lessons', price: 'Price', currency: 'SAR',
    add: 'Add', delete: 'Delete', noPackages: 'No packages yet',
    lessons_: 'lessons', price_: 'Price'
  }
}

export default function Packages({ lang }) {
  const l = labels[lang]
  const [packages, setPackages] = useState([])
  const [form, setForm] = useState({ name: '', lessons: '', price: '' })
  const [loading, setLoading] = useState(false)

  const fetchPackages = async () => {
    const q = query(collection(db, 'packages'), where('teacherId', '==', auth.currentUser.uid))
    const snap = await getDocs(q)
    setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchPackages() }, [])

  const addPackage = async () => {
    if (!form.name || !form.lessons || !form.price) return
    setLoading(true)
    await addDoc(collection(db, 'packages'), {
      ...form,
      lessons: Number(form.lessons),
      price: Number(form.price),
      teacherId: auth.currentUser.uid,
      createdAt: new Date()
    })
    setForm({ name: '', lessons: '', price: '' })
    await fetchPackages()
    setLoading(false)
  }

  const deletePackage = async (id) => {
    await deleteDoc(doc(db, 'packages', id))
    await fetchPackages()
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">📦 {l.title}</h2>

      {/* Add Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-3">
        <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.addPackage}</p>
        <input className="input" placeholder={l.packageName}
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="flex gap-2">
          <input className="input" placeholder={l.lessons} type="number"
            value={form.lessons} onChange={e => setForm({ ...form, lessons: e.target.value })} />
          <input className="input" placeholder={l.price} type="number"
            value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>
        <button onClick={addPackage} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition">
          {loading ? '...' : `+ ${l.add}`}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {packages.length === 0 && (
          <p className="text-center text-gray-400">{l.noPackages}</p>
        )}
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{pkg.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pkg.lessons} {l.lessons_} — {pkg.price} {l.currency}
              </p>
            </div>
            <button onClick={() => deletePackage(pkg.id)}
              className="text-red-400 hover:text-red-600 text-sm px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
              {l.delete}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
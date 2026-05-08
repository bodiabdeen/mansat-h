import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const labels = {
  ar: {
    title: 'إنجازاتي', points: 'النقاط', badges: 'الشاراتي', grades: 'الدرجات',
    noRewards: 'لا توجد إنجازات بعد', totalPoints: 'مجموع النقاط'
  },
  en: {
    title: 'My Achievements', points: 'Points', badges: 'My Badges', grades: 'Grades',
    noRewards: 'No achievements yet', totalPoints: 'Total Points'
  }
}

export default function Achievements({ lang }) {
  const l = labels[lang]
  const [rewards, setRewards] = useState([])

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, 'rewards'), where('studentId', '==', auth.currentUser.uid)
      ))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
      setRewards(list)
    }
    fetch()
  }, [])

  const totalPoints = rewards.filter(r => r.type === 'points').reduce((s, r) => s + r.points, 0)
  const badges = rewards.filter(r => r.type === 'badge')
  const grades = rewards.filter(r => r.type === 'grade')

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">🏆 {l.title}</h2>

      {rewards.length === 0
        ? <p className="text-center text-gray-400">{l.noRewards}</p>
        : <>
          {/* Points */}
          <div className="bg-indigo-50 dark:bg-indigo-900 rounded-2xl p-6 text-center">
            <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-300">{totalPoints}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{l.totalPoints}</p>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
              <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-3">🏅 {l.badges}</p>
              <div className="flex gap-2 flex-wrap">
                {badges.map(r => (
                  <div key={r.id} className="text-center">
                    <div className="text-4xl">{r.badge}</div>
                    {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grades */}
          {grades.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
              <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-1">📊 {l.grades}</p>
              {grades.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="font-bold text-lg dark:text-white">{r.grade}</span>
                  {r.note && <span className="text-sm text-gray-400">{r.note}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      }
    </div>
  )
}
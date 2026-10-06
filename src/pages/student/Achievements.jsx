import { useEffect, useState } from 'react'
import { db, auth } from '../../firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Icon from '../../components/Icon'
import PageHero from '../../components/PageHero'

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
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHero icon="🏆" title={l.title} />

      {rewards.length === 0
        ? <p className="text-center text-gray-400">{l.noRewards}</p>
        : <div className="md:flex md:gap-5 md:items-start space-y-5 md:space-y-0">
          {/* Points */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 rounded-2xl p-6 text-center text-white md:w-64 md:shrink-0">
            <div className="absolute -top-8 -end-8 w-32 h-32 rounded-full bg-gold-400/35 blur-2xl pointer-events-none" />
            <p className="relative text-5xl font-bold text-gold-300">{totalPoints}</p>
            <p className="relative text-indigo-100 opacity-90 mt-1">{l.totalPoints}</p>
          </div>

          <div className="flex-1 space-y-5">
            {/* Badges */}
            {badges.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
                <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-3"><Icon e="🏅" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.badges}</p>
                <div className="flex gap-2 flex-wrap">
                  {badges.map(r => (
                    <div key={r.id} className="text-center">
                      <div className="text-4xl bg-gold-50 dark:bg-gold-700/20 rounded-xl p-2">{r.badge}</div>
                      {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grades */}
            {grades.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-2">
                <p className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-1"><Icon e="📊" className="w-5 h-5 inline-block align-[-0.3em]" /> {l.grades}</p>
                {grades.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="font-bold text-lg dark:text-white">{r.grade}</span>
                    {r.note && <span className="text-sm text-gray-400">{r.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    </div>
  )
}
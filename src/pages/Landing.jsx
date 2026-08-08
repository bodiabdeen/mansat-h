import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import BrandMark from '../components/BrandMark'
import Icon from '../components/Icon'
import PromoCarousel from '../components/PromoCarousel'
import TeachersShowcase from '../components/TeachersShowcase'
import '../i18n'

const labels = {
  ar: {
    heroTitle: 'تعلّم مع أفضل المعلمين، في الوقت الذي يناسبك',
    heroBody: 'دورات مصممة بعناية، معلمون معتمدون، وجدولة مرنة لحجز حصصك أونلاين. سجّل الآن وابدأ رحلتك التعليمية.',
    getStarted: 'ابدأ الآن مجاناً', login: 'تسجيل الدخول',
    coursesTitle: '📚 الدورات والباقات', coursesBody: 'اختر الدورة المناسبة لك وابدأ بالباقة التي تلائم احتياجك',
    noCourses: 'الدورات ستُضاف قريباً', noPackagesYet: 'الباقات قادمة قريباً لهذه الدورة',
    teachersTitle: '👨‍🏫 تعرّف على معلمينا', teachersBody: 'نخبة من المعلمين المعتمدين لمرافقتك في رحلتك',
    lessons: 'حصة', signUp: 'سجّل للحجز',
    newBadge: 'جديد ✨',
    morePromosTitle: '📣 المزيد من الإعلانات والعروض', morePromosBody: 'تصفّح جميع العروض والدورات الجديدة',
    footer: 'بروف | PROF — جميع الحقوق محفوظة'
  },
  en: {
    heroTitle: 'Learn with great teachers, on your schedule',
    heroBody: 'Thoughtfully designed courses, vetted teachers, and flexible scheduling for booking your lessons online. Sign up and start your learning journey today.',
    getStarted: 'Get Started Free', login: 'Login',
    coursesTitle: '📚 Courses & Packages', coursesBody: 'Pick the course that fits you, then a package that matches your pace',
    noCourses: 'Courses coming soon', noPackagesYet: 'Packages coming soon for this course',
    teachersTitle: '👨‍🏫 Meet Our Teachers', teachersBody: 'A handpicked team of vetted teachers to guide your journey',
    lessons: 'lessons', signUp: 'Sign up to book',
    newBadge: 'New ✨',
    morePromosTitle: '📣 More Promotions & Events', morePromosBody: 'Browse all our latest offers and new courses',
    footer: 'PROF | بروف — All rights reserved'
  }
}

export default function Landing({ onGetStarted, onLogin }) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme, lang, setLang } = useApp()
  const l = labels[lang]
  const isAr = lang === 'ar'
  const [courses, setCourses] = useState([])
  const [packages, setPackages] = useState([])
  const [promotions, setPromotions] = useState([])
  const featuredPromotions = promotions.filter(p => p.featured).slice(0, 2)
  const morePromotions = promotions.filter(p => !featuredPromotions.includes(p))

  useEffect(() => {
    const fetchData = async () => {
      const [courseSnap, pkgSnap, promoSnap] = await Promise.all([
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'packages')),
        getDocs(collection(db, 'promotions'))
      ])
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPromotions(promoSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    fetchData()
  }, [])

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    i18n.changeLanguage(next)
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-indigo-950 text-gray-900 dark:text-white ${isAr ? 'rtl' : 'ltr'}`}>

      {/* Dark green band: header + hero, matching the brand board's website preview */}
      <div className="bg-gradient-to-b from-indigo-900 via-indigo-900 to-indigo-700 text-white">
        <header className="flex items-center justify-between px-4 md:px-8 py-4 max-w-6xl mx-auto">
          <span className="flex items-center gap-2 text-lg font-bold" dir="rtl">
            <BrandMark className="w-10 h-8" />
            بروف <span className="font-normal opacity-70">| PROF</span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg text-sm">
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg text-sm">
              {theme === 'dark'
                ? <Icon e="☀️" className="w-5 h-5 inline-block align-[-0.3em]" />
                : <Icon e="🌙" className="w-5 h-5 inline-block align-[-0.3em]" />}
            </button>
            <button onClick={onLogin}
              className="bg-gold-500 hover:bg-gold-400 text-indigo-900 px-4 py-1.5 rounded-lg text-sm font-bold transition">
              {l.login}
            </button>
          </div>
        </header>

        {/* Hero + Promotions: side-by-side on desktop, hero then promo on mobile */}
        <div className="max-w-6xl mx-auto px-4 pb-16 pt-6 md:pb-24 flex flex-col md:flex-row md:items-center gap-10 md:gap-8">
          <section className={`text-center space-y-6 ${featuredPromotions.length > 0 ? 'md:flex-1' : 'max-w-3xl mx-auto'}`}>
            <img src="/logo-icon-transparent.png" alt="" className="w-24 md:w-28 mx-auto drop-shadow-lg" />
            <div>
              <div className="text-2xl md:text-3xl font-bold" dir="rtl">
                بروف <span className="font-normal opacity-70">| PROF</span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400 mt-1">The Professor</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight text-balance">{l.heroTitle}</h1>
            <p className="text-indigo-100 text-base md:text-lg max-w-xl mx-auto opacity-90">{l.heroBody}</p>
            <button onClick={onGetStarted}
              className="bg-gold-500 hover:bg-gold-400 text-indigo-900 px-8 py-3 rounded-xl font-bold text-base transition shadow-lg shadow-black/20">
              {l.getStarted}
            </button>
          </section>

          {featuredPromotions.length > 0 && (
            <div className="w-full md:w-[380px] md:shrink-0 space-y-4">
              {featuredPromotions.map(promo => (
                <div key={promo.id} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4 space-y-3 text-start">
                  <span className="inline-block bg-gold-500 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {l.newBadge}
                  </span>
                  <PromoCarousel media={[
                    ...(promo.photoUrls || []).map(url => ({ type: 'image', url })),
                    ...(promo.videoUrls || []).map(url => ({ type: 'video', url }))
                  ]} />
                  <div>
                    <p className="font-bold text-base">{promo.title}</p>
                    {promo.description && (
                      <p className="text-sm text-indigo-100 opacity-90 mt-1">{promo.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Courses & Packages */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">{l.coursesTitle}</h2>
          <div className="w-14 h-1 bg-gold-500 rounded-full mx-auto my-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{l.coursesBody}</p>
        </div>

        {courses.length === 0 ? (
          <p className="text-center text-gray-400">{l.noCourses}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {courses.map(course => {
              const coursePackages = packages.filter(p => p.courseId === course.id)
              return (
                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3">
                  <PromoCarousel
                    media={[
                      ...(course.photoUrls || (course.photoUrl ? [course.photoUrl] : [])).map(url => ({ type: 'image', url })),
                      ...(course.videoUrls || (course.introVideoUrl ? [course.introVideoUrl] : [])).map(url => ({ type: 'video', url }))
                    ]}
                    imageClassName="w-full h-56 rounded-xl object-cover"
                    videoClassName="w-full rounded-xl max-h-96"
                    dotClassName="bg-gray-300 dark:bg-gray-600"
                  />
                  <div>
                    <p className="font-bold text-lg">{course.name}</p>
                    {course.description && (
                      <p className="text-sm text-indigo-950 dark:text-indigo-100 leading-relaxed border-l-2 border-gold-400 pl-3 mt-2 italic">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {coursePackages.length === 0 ? (
                    <p className="text-xs text-gray-400">{l.noPackagesYet}</p>
                  ) : (
                    <div className="space-y-2">
                      {coursePackages.map(pkg => (
                        <div key={pkg.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{pkg.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pkg.lessons} {l.lessons} — <span className="font-bold text-gold-600 dark:text-gold-400">{pkg.price} {pkg.currency || 'SAR'}</span>
                            </p>
                          </div>
                          <button onClick={onGetStarted}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap">
                            {l.signUp}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Teachers */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">{l.teachersTitle}</h2>
          <div className="w-14 h-1 bg-gold-500 rounded-full mx-auto my-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{l.teachersBody}</p>
        </div>

        <TeachersShowcase lang={lang} />
      </section>

      {/* More Promotions & Events — only when there's overflow beyond the 2 featured in the hero */}
      {morePromotions.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">{l.morePromosTitle}</h2>
            <div className="w-14 h-1 bg-gold-500 rounded-full mx-auto my-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{l.morePromosBody}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {morePromotions.map(promo => (
              <div key={promo.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-3">
                <PromoCarousel
                  media={[
                    ...(promo.photoUrls || []).map(url => ({ type: 'image', url })),
                    ...(promo.videoUrls || []).map(url => ({ type: 'video', url }))
                  ]}
                  imageClassName="w-full h-56 rounded-xl object-cover"
                  videoClassName="w-full rounded-xl max-h-96"
                  dotClassName="bg-gray-300 dark:bg-gray-600"
                />
                <div>
                  <p className="font-bold text-lg">{promo.title}</p>
                  {promo.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{promo.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="text-center text-xs text-gray-400 py-8">{l.footer}</footer>
    </div>
  )
}

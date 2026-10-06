import CourseCatalog from './CourseCatalog'
import PageHero from '../../components/PageHero'

const labels = {
  ar: { title: 'الدورات والباقات' },
  en: { title: 'Courses & Packages' }
}

export default function Courses({ lang }) {
  const l = labels[lang]
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHero icon="📚" title={l.title} />
      <CourseCatalog lang={lang} />
    </div>
  )
}

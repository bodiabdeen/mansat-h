import CourseCatalog from './CourseCatalog'
import Icon from '../../components/Icon'

const labels = {
  ar: { title: 'الدورات والباقات' },
  en: { title: 'Courses & Packages' }
}

export default function Courses({ lang }) {
  const l = labels[lang]
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400"><Icon e="📚" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}</h2>
      <CourseCatalog lang={lang} />
    </div>
  )
}

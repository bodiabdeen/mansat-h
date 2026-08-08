import TeachersShowcase from '../../components/TeachersShowcase'
import Icon from '../../components/Icon'

const labels = {
  ar: { title: 'تعرّف على معلمينا', body: 'نخبة من المعلمين المعتمدين لمرافقتك في رحلتك' },
  en: { title: 'Meet Our Teachers', body: 'A handpicked team of vetted teachers to guide your journey' }
}

export default function Teachers({ lang }) {
  const l = labels[lang]
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          <Icon e="👨‍🏫" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{l.body}</p>
      </div>
      <TeachersShowcase lang={lang} />
    </div>
  )
}

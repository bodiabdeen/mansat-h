import TeachersShowcase from '../../components/TeachersShowcase'
import PageHero from '../../components/PageHero'

const labels = {
  ar: { title: 'تعرّف على معلمينا', body: 'نخبة من المعلمين المعتمدين لمرافقتك في رحلتك' },
  en: { title: 'Meet Our Teachers', body: 'A handpicked team of vetted teachers to guide your journey' }
}

export default function Teachers({ lang }) {
  const l = labels[lang]
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <PageHero icon="👨‍🏫" title={l.title} subtitle={l.body} />
      <TeachersShowcase lang={lang} />
    </div>
  )
}

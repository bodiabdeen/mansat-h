import { auth } from '../../firebase'
import TeacherProfileForm from '../../components/TeacherProfileForm'
import Icon from '../../components/Icon'

const labels = {
  ar: { title: 'ملفي التعريفي', note: 'هذا الملف يظهر للزوار في الصفحة الرئيسية قبل تسجيل الدخول' },
  en: { title: 'My Profile', note: 'This profile is shown to visitors on the public homepage before they log in' }
}

export default function Profile({ lang }) {
  const l = labels[lang]
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        <Icon e="🪪" className="w-7 h-7 inline-block align-[-0.35em]" /> {l.title}
      </h2>
      <p className="text-xs text-gray-400">{l.note}</p>
      <TeacherProfileForm lang={lang} teacherId={auth.currentUser.uid} />
    </div>
  )
}

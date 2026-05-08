import Packages from '../pages/teacher/Packages'
import Slots from '../pages/teacher/Slots'
import TeacherAssignments from '../pages/teacher/Assignments'
import Students from '../pages/teacher/Students'
import TeacherDashboard from '../pages/teacher/Dashboard'
import MyPackage from '../pages/student/MyPackage'
import BookSlot from '../pages/student/BookSlot'
import StudentAssignments from '../pages/student/Assignments'
import Achievements from '../pages/student/Achievements'
import StudentDashboard from '../pages/student/Dashboard'
import Settings from '../pages/Settings'

export default function PageContent({ page, userData, lang }) {
  const isTeacher = userData?.role === 'teacher'

  // Settings is shared by both roles
  if (page === 'settings') return <Settings lang={lang} userData={userData} />

  if (isTeacher) {
    if (page === 'dashboard') return <TeacherDashboard lang={lang} userData={userData} />
    if (page === 'packages') return <Packages lang={lang} />
    if (page === 'slots') return <Slots lang={lang} />
    if (page === 'assignments') return <TeacherAssignments lang={lang} />
    if (page === 'students') return <Students lang={lang} />
  }

  if (!isTeacher) {
    if (page === 'dashboard') return <StudentDashboard lang={lang} userData={userData} />
    if (page === 'myPackage') return <MyPackage lang={lang} />
    if (page === 'bookSlot') return <BookSlot lang={lang} />
    if (page === 'assignments') return <StudentAssignments lang={lang} />
    if (page === 'achievements') return <Achievements lang={lang} />
  }

  return (
    <div className="text-center text-gray-400 mt-10">— coming soon —</div>
  )
}

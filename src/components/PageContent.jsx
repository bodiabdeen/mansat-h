import Packages from '../pages/teacher/Packages'
import Slots from '../pages/teacher/Slots'
import TeacherAssignments from '../pages/teacher/Assignments'
import Students from '../pages/teacher/Students'
import TeacherDashboard from '../pages/teacher/Dashboard'
import TeacherMessages from '../pages/teacher/Messages'
import TeacherProfile from '../pages/teacher/Profile'
import StudentCourses from '../pages/student/Courses'
import MyPackage from '../pages/student/MyPackage'
import BookSlot from '../pages/student/BookSlot'
import StudentAssignments from '../pages/student/Assignments'
import Achievements from '../pages/student/Achievements'
import StudentDashboard from '../pages/student/Dashboard'
import StudentMessages from '../pages/student/Messages'
import Settings from '../pages/Settings'
import AdminDashboard from '../pages/admin/Dashboard'
import Registrations from '../pages/admin/Registrations'
import AdminCourses from '../pages/admin/Courses'
import PackageRequests from '../pages/admin/PackageRequests'
import ManageTeachers from '../pages/admin/TeacherAvailability'
import ChatLogs from '../pages/admin/ChatLogs'

export default function PageContent({ page, setPage, userData, lang, activeRole }) {
  const isTeacher = activeRole === 'teacher'
  const isAdmin = activeRole === 'admin'
  const isStudent = activeRole === 'student'

  // Settings is shared by all roles
  if (page === 'settings') return <Settings lang={lang} userData={userData} />

  if (isAdmin) {
    if (page === 'dashboard') return <AdminDashboard lang={lang} userData={userData} setPage={setPage} />
    if (page === 'registrations') return <Registrations lang={lang} />
    if (page === 'courses') return <AdminCourses lang={lang} />
    if (page === 'packageRequests') return <PackageRequests lang={lang} />
    if (page === 'manageTeachers') return <ManageTeachers lang={lang} />
    if (page === 'chatLogs') return <ChatLogs lang={lang} />
  }

  if (isTeacher) {
    if (page === 'dashboard') return <TeacherDashboard lang={lang} userData={userData} setPage={setPage} />
    if (page === 'packages') return <Packages lang={lang} />
    if (page === 'slots') return <Slots lang={lang} />
    if (page === 'assignments') return <TeacherAssignments lang={lang} />
    if (page === 'students') return <Students lang={lang} />
    if (page === 'messages') return <TeacherMessages lang={lang} />
    if (page === 'profile') return <TeacherProfile lang={lang} />
  }

  if (isStudent) {
    if (page === 'dashboard') return <StudentDashboard lang={lang} userData={userData} setPage={setPage} />
    if (page === 'courses') return <StudentCourses lang={lang} />
    if (page === 'myPackage') return <MyPackage lang={lang} />
    if (page === 'bookSlot') return <BookSlot lang={lang} />
    if (page === 'assignments') return <StudentAssignments lang={lang} />
    if (page === 'achievements') return <Achievements lang={lang} />
    if (page === 'messages') return <StudentMessages lang={lang} />
  }

  return (
    <div className="text-center text-gray-400 mt-10">— coming soon —</div>
  )
}

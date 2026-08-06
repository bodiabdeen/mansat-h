import { db } from '../firebase'
import { doc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { hasRole } from './roles'

// Deletes a user's Firestore doc plus everything they own across whichever
// roles they hold. Admin-owned data (courses/packages) is shared platform
// data and is never cascade-deleted here. Does NOT touch Firebase Auth —
// callers that delete their own account still need to call deleteUser()
// themselves; there is no client-side way to remove another user's login.
export async function deleteUserData(uid, userData) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid))

  const ownedCollections = []
  if (hasRole(userData, 'teacher')) {
    ownedCollections.push({ col: 'slots', field: 'teacherId' }, { col: 'assignments', field: 'teacherId' })
  }
  if (hasRole(userData, 'student')) {
    ownedCollections.push(
      { col: 'studentPackages', field: 'studentId' },
      { col: 'bookings', field: 'studentId' },
      { col: 'assignments', field: 'studentId' },
      { col: 'rewards', field: 'studentId' }
    )
  }

  for (const { col, field } of ownedCollections) {
    const snap = await getDocs(query(collection(db, col), where(field, '==', uid)))
    snap.docs.forEach(d => batch.delete(d.ref))
  }

  await batch.commit()
}

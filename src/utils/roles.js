// A user doc's `roles` array is the canonical source of truth. Docs written
// before multi-role support only have the single `role` string — fall back to
// that so legacy accounts keep working without a migration script.
export const ALL_ROLES = ['student', 'teacher', 'admin']

export const getRoles = (userData) =>
  userData?.roles?.length ? userData.roles : (userData?.role ? [userData.role] : [])

export const hasRole = (userData, role) => getRoles(userData).includes(role)

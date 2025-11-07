export type User = {
  name?: string
  email: string
  password?: string
  role?: 'admin' | 'user'
}

const API_BASE = 'http://localhost:8080'

//REGISTER NEW USER
export async function register(user: User) {
  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: errText }
    }

    return { ok: true }
  } catch (err) {
    console.error('Register error:', err)
    return { ok: false, error: 'Network error' }
  }
}

// LOGIN USER
export async function login(email: string, password: string, role?: 'admin' | 'user') {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: errText }
    }

    const data = await res.json()

    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}`

    return { ok: true }
  } catch (err) {
    console.error('Login error:', err)
    return { ok: false, error: 'Network error' }
  }
}


// LOGOUT USER
export function logout() {
  document.cookie = 'token=; Max-Age=0; path=/;'
}

// GET CURRENT USER
export function currentUser(): User | null {
  const match = document.cookie.match(/(^| )token=([^;]+)/)
  if (!match) return null
  return { email: 'current_user@example.com', role: 'user' } // placeholder
}

// UPDATE PASSWORD
export async function updatePassword(email: string, newPassword: string) {
  try {
    const res = await fetch(`${API_BASE}/update-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: errText }
    }

    return { ok: true }
  } catch (err) {
    console.error('Update password error:', err)
    return { ok: false, error: 'Network error' }
  }
}






// For future uses
// // Simple localStorage backed auth helpers with role support

// type User = {
//   name: string
//   email: string
//   password: string
//   role?: 'admin' | 'user'
// }

// const USERS_KEY = 'app_users'
// const SESSION_KEY = 'app_session'
// const ADMIN_EMAIL = 'admin@email.com'

// export function getUsers(): User[] {
//   try {
//     const raw = localStorage.getItem(USERS_KEY)
//     return raw ? JSON.parse(raw) : []
//   } catch {
//     return []
//   }
// }

// export function saveUser(user: User) {
//   const users = getUsers()
//   users.push(user)
//   localStorage.setItem(USERS_KEY, JSON.stringify(users))
// }

// export function findUserByEmail(email: string) {
//   return getUsers().find(u => u.email === email)
// }

// export function register(user: User) {
//   if (findUserByEmail(user.email)) {
//     return { ok: false, error: 'User already exists' }
//   }
//   // always create normal users via the UI
//   const u = { ...user, role: user.role || 'user' }
//   saveUser(u)
//   return { ok: true }
// }

// // ensure default admin exists with a default password 'admin'
// ;(function ensureDefaultAdmin(){
//   try {
//     const users = getUsers()
//     const admin = users.find(u => u.email === ADMIN_EMAIL)
//     if (!admin) {
//       saveUser({ name: 'Admin', email: ADMIN_EMAIL, password: 'admin', role: 'admin' })
//     } else {
//       // if admin exists but has no role or password, set defaults conservatively
//       let changed = false
//       if (!admin.role) { admin.role = 'admin'; changed = true }
//       if (!admin.password) { admin.password = 'admin'; changed = true }
//       if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(users))
//     }
//   } catch {}
// })()

// export function login(email: string, password: string, role?: 'admin' | 'user') {
//   const user = findUserByEmail(email)
//   if (!user || user.password !== password) return { ok: false, error: 'Invalid credentials' }
//   // if caller supplied a role, ensure it matches the stored user role
//   if (role && user.role !== role) return { ok: false, error: 'Invalid role selection' }
//   localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, name: user.name, role: user.role || 'user' }))
//   return { ok: true }
// }

// export function updatePassword(email: string, newPassword: string) {
//   try {
//     const users = getUsers()
//     const u = users.find(x => x.email === email)
//     if (!u) return { ok: false, error: 'User not found' }
//     u.password = newPassword
//     localStorage.setItem(USERS_KEY, JSON.stringify(users))
//     return { ok: true }
//   } catch (err) {
//     return { ok: false, error: 'Failed to update password' }
//   }
// }

// export function logout() {
//   localStorage.removeItem(SESSION_KEY)
// }

// export function currentUser() {
//   try {
//     const raw = localStorage.getItem(SESSION_KEY)
//     return raw ? JSON.parse(raw) : null
//   } catch {
//     return null
//   }
// }

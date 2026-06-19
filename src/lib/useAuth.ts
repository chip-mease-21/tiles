import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type User
} from 'firebase/auth'
import { auth } from './firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  return { user, loading }
}

const provider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  // Popup works on desktop and mobile Safari when triggered by a user tap,
  // and avoids the cross-site redirect loop Safari causes.
  await signInWithPopup(auth, provider)
}

export function signOut() {
  return fbSignOut(auth)
}

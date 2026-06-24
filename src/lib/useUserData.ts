import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_CATEGORIES, type TagCategory } from '../types'

export type TagCategories = Record<string, TagCategory>

// Per-user document at userdata/{uid}:
//   tagCategories: which category each tag belongs to (keys = the user's tags)
//   categories: the ordered list of category names the user has defined
export function useUserData(userId: string | undefined) {
  const [tagCategories, setTagCategories] = useState<TagCategories>({})
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    const ref = doc(db, 'userdata', userId)
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as
        | { tagCategories?: TagCategories; categories?: string[] }
        | undefined
      setTagCategories(data?.tagCategories ?? {})
      setCategories(
        data?.categories && data.categories.length ? data.categories : DEFAULT_CATEGORIES
      )
      setLoaded(true)
    })
    return unsub
  }, [userId])

  return { tagCategories, categories, loaded }
}

export async function setTagCategory(userId: string, tag: string, category: TagCategory) {
  await setDoc(
    doc(db, 'userdata', userId),
    { tagCategories: { [tag]: category } },
    { merge: true }
  )
}

// Register tags (default to Unsorted) without overwriting existing categories.
export async function registerTags(
  userId: string,
  tags: string[],
  existing: TagCategories
) {
  const missing = tags.filter((t) => !(t in existing))
  if (missing.length === 0) return
  const patch: TagCategories = {}
  for (const t of missing) patch[t] = 'Unsorted'
  await setDoc(doc(db, 'userdata', userId), { tagCategories: patch }, { merge: true })
}

export async function deleteTag(userId: string, tag: string) {
  await setDoc(
    doc(db, 'userdata', userId),
    { tagCategories: { [tag]: deleteField() } },
    { merge: true }
  )
}

export async function addCategory(userId: string, name: string, current: string[]) {
  const n = name.trim()
  if (!n || current.includes(n)) return
  await setDoc(doc(db, 'userdata', userId), { categories: [...current, n] }, { merge: true })
}

export async function removeCategory(userId: string, name: string, current: string[]) {
  await setDoc(
    doc(db, 'userdata', userId),
    { categories: current.filter((c) => c !== name) },
    { merge: true }
  )
}

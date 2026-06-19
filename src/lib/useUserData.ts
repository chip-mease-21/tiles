import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore'
import { db } from './firebase'
import type { TagCategory } from '../types'

export type TagCategories = Record<string, TagCategory>

// Per-user document at userdata/{uid} that stores which category each tag belongs to.
// Keys of tagCategories are the user's persistent tags (they stay even when unused).
export function useUserData(userId: string | undefined) {
  const [tagCategories, setTagCategories] = useState<TagCategories>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    const ref = doc(db, 'userdata', userId)
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as { tagCategories?: TagCategories } | undefined
      setTagCategories(data?.tagCategories ?? {})
      setLoaded(true)
    })
    return unsub
  }, [userId])

  return { tagCategories, loaded }
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

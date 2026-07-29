import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_CATEGORIES, type TagCategory } from '../types'

export type TagCategories = Record<string, TagCategory>

// Tag categories live in one document. For your private board that is
// userdata/{uid}; for a shared space it is a document inside the space, so both
// people file against the same vocabulary instead of inventing their own.
//   tagCategories: which category each tag belongs to (keys = the tags)
//   categories: the ordered list of category names
export function useUserData(docPath: string | undefined) {
  const [tagCategories, setTagCategories] = useState<TagCategories>({})
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!docPath) return
    const unsub = onSnapshot(doc(db, docPath), (snap) => {
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
  }, [docPath])

  return { tagCategories, categories, loaded }
}

export async function setTagCategory(docPath: string, tag: string, category: TagCategory) {
  await setDoc(doc(db, docPath), { tagCategories: { [tag]: category } }, { merge: true })
}

// Register tags (default to Unsorted) without overwriting existing categories.
export async function registerTags(
  docPath: string,
  tags: string[],
  existing: TagCategories
) {
  const missing = tags.filter((t) => !(t in existing))
  if (missing.length === 0) return
  const patch: TagCategories = {}
  for (const t of missing) patch[t] = 'Unsorted'
  await setDoc(doc(db, docPath), { tagCategories: patch }, { merge: true })
}

export async function deleteTag(docPath: string, tag: string) {
  await setDoc(doc(db, docPath), { tagCategories: { [tag]: deleteField() } }, { merge: true })
}

export async function addCategory(docPath: string, name: string, current: string[]) {
  const n = name.trim()
  if (!n || current.includes(n)) return
  await setDoc(doc(db, docPath), { categories: [...current, n] }, { merge: true })
}

export async function removeCategory(docPath: string, name: string, current: string[]) {
  await setDoc(doc(db, docPath), { categories: current.filter((c) => c !== name) }, { merge: true })
}

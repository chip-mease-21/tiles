import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { ColumnId, Entry, EntryType } from '../types'

const COL = 'entries'

// Subscribe to the current user's entries in realtime.
export function useEntries(userId: string | undefined) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    const q = query(collection(db, COL), where('userId', '==', userId))
    const unsub = onSnapshot(q, (snap) => {
      const rows: Entry[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Entry, 'id'>
        return {
          id: d.id,
          ...data,
          tags: data.tags ?? [],
          tasks: data.tasks ?? []
        }
      })
      setEntries(rows)
      setLoaded(true)
    })
    return unsub
  }, [userId])

  return { entries, loaded }
}

export async function createEntry(
  userId: string,
  partial: Partial<Entry> & { type?: EntryType; column?: ColumnId }
) {
  const now = Date.now()
  const payload = {
    userId,
    type: partial.type ?? 'note',
    title: partial.title ?? '',
    body: partial.body ?? '',
    column: partial.column ?? ('notes' as ColumnId),
    position: partial.position ?? now, // newest lands at the bottom by default
    tags: partial.tags ?? [],
    dueDate: partial.dueDate ?? null,
    pinned: partial.pinned ?? false,
    tasks: partial.tasks ?? [],
    createdAt: now, // client time so the "created" date shows immediately
    updatedAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, COL), payload)
  return ref.id
}

export async function updateEntry(id: string, patch: Partial<Entry>) {
  const { id: _omit, ...rest } = patch as Entry
  void _omit
  await updateDoc(doc(db, COL, id), { ...rest, updatedAt: serverTimestamp() })
}

export async function deleteEntry(id: string) {
  await deleteDoc(doc(db, COL, id))
}

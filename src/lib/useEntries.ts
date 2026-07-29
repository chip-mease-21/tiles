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
  serverTimestamp,
  type QueryConstraint
} from 'firebase/firestore'
import { db } from './firebase'
import { toColumn, type ColumnId, type Entry, type EntryType } from '../types'
import type { EntryScope } from './entryScope'

// Subscribe to the tiles this board is scoped to, in realtime.
//
// A private board carries ownerFilterUid and reads only that person's tiles;
// the security rules reject an unfiltered read of `entries`, so this filter is
// load bearing, not a convenience. A shared space has no such filter because
// membership of the space is what grants access.
export function useEntries(scope: EntryScope | null) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  const path = scope?.path
  const owner = scope?.ownerFilterUid

  useEffect(() => {
    if (!path) return
    // A private board with no uid yet is not ready; a shared board never has one.
    if (owner === undefined && scope?.shared !== true) return
    const constraints: QueryConstraint[] = owner ? [where('userId', '==', owner)] : []
    const q = query(collection(db, path), ...constraints)
    const unsub = onSnapshot(q, (snap) => {
      const rows: Entry[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Entry, 'id'>
        return {
          id: d.id,
          ...data,
          column: toColumn(data.column),
          tags: data.tags ?? [],
          tasks: data.tasks ?? []
        }
      })
      setEntries(rows)
      setLoaded(true)
    })
    return unsub
  }, [path, owner, scope?.shared])

  return { entries, loaded }
}

export async function createEntry(
  scope: EntryScope,
  partial: Partial<Entry> & { type?: EntryType; column?: ColumnId }
) {
  const now = Date.now()
  const payload = {
    userId: scope.me,
    type: partial.type ?? 'note',
    title: partial.title ?? '',
    body: partial.body ?? '',
    column: partial.column ?? ('inbox' as ColumnId),
    position: partial.position ?? now, // newest lands at the bottom by default
    tags: partial.tags ?? [],
    dueDate: partial.dueDate ?? null,
    pinned: partial.pinned ?? false,
    archived: partial.archived ?? false,
    tasks: partial.tasks ?? [],
    // On a shared board a new tile starts unassigned on purpose. Work with no
    // owner is visible as work with no owner rather than quietly landing on
    // whoever typed it.
    ownerUid: partial.ownerUid ?? null,
    createdAt: now, // client time so the "created" date shows immediately
    updatedAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, scope.path), payload)
  return ref.id
}

export async function updateEntry(scope: EntryScope, id: string, patch: Partial<Entry>) {
  const { id: _omit, ...rest } = patch as Entry
  void _omit
  await updateDoc(doc(db, scope.path, id), { ...rest, updatedAt: serverTimestamp() })
}

export async function deleteEntry(scope: EntryScope, id: string) {
  await deleteDoc(doc(db, scope.path, id))
}

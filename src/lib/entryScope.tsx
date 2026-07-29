/**
 * Which set of tiles a board is looking at.
 *
 * Tiles was single player: every entry lived in one collection and belonged to
 * exactly one uid. Heart and Treasure is shared, so the same board components
 * now need to point at a different collection with a different ownership rule.
 * Rather than fork the board, the collection became a parameter.
 *
 * Your personal board is the default and behaves exactly as it always has:
 * collection `entries`, filtered to your uid, no assignment. Nothing about the
 * shared case reaches it, and no rule grants anyone else access to it.
 */
import { createContext, useContext, type ReactNode } from 'react'

export interface ScopePerson {
  uid: string
  name: string
}

export interface EntryScope {
  /** Firestore collection holding the tiles. */
  path: string
  /** Document holding the tag categories for this board. */
  tagPath: string
  /** Set on a private board: only this person's tiles are read. Absent on a shared one. */
  ownerFilterUid?: string
  /** True when tiles carry an assignee and everyone in the space sees them all. */
  shared: boolean
  /** Who a tile can be assigned to. Empty on a private board. */
  people: ScopePerson[]
  /** The signed in person, used for stamping and for the Mine filter. */
  me: string
}

const Ctx = createContext<EntryScope | null>(null)

export function EntryScopeProvider({ value, children }: { value: EntryScope; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEntryScope(): EntryScope {
  const s = useContext(Ctx)
  if (!s) throw new Error('useEntryScope must be used inside an EntryScopeProvider')
  return s
}

/** Your own private tiles. The shape Tiles has always had. */
export const personalScope = (uid: string): EntryScope => ({
  path: 'entries',
  tagPath: `userdata/${uid}`,
  ownerFilterUid: uid,
  shared: false,
  people: [],
  me: uid
})

/**
 * Heart and Treasure: a shared workspace that is not the DLT board and not
 * anybody's private tiles.
 *
 * A space is its own tree. Membership of a space is the only thing that grants
 * access to it, and it is unrelated to a seat on the DLT board or to being
 * admin of the org. Nobody at the church can reach this because nothing about
 * their membership says anything about this collection.
 *
 * Like org seats, a person is invited by email address and the seat is claimed
 * automatically the first time they sign in, so nobody has to send a uid.
 */
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, where, type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { EntryScope, ScopePerson } from '../lib/entryScope'
import type { Entry } from '../types'

export const HT_SPACE = 'ht';
export const HT_NAME = 'Heart and Treasure';

export interface SpaceMember {
  uid: string;
  name: string;
  email: string;
  active: boolean;
}

export interface SpaceInvite {
  email: string;
  name: string;
}

const p = {
  space: `spaces/${HT_SPACE}`,
  members: `spaces/${HT_SPACE}/members`,
  member: (uid: string) => `spaces/${HT_SPACE}/members/${uid}`,
  invites: `spaces/${HT_SPACE}/invites`,
  invite: (email: string) => `spaces/${HT_SPACE}/invites/${email.trim().toLowerCase()}`,
  entries: `spaces/${HT_SPACE}/entries`,
  tags: `spaces/${HT_SPACE}/meta/tags`,
};

export const spacePaths = p;

/** Your own seat, or null. Drives whether the tab appears at all. */
export function watchMySpaceSeat(uid: string, cb: (m: SpaceMember | null) => void): Unsubscribe {
  return onSnapshot(doc(db, p.member(uid)), (snap) =>
    cb(snap.exists() ? ({ uid, ...snap.data() } as SpaceMember) : null),
    () => cb(null));
}

export function watchSpaceMembers(cb: (m: SpaceMember[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, p.members), orderBy('name')), (snap) =>
    cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as SpaceMember))),
    () => cb([]));
}

export function watchSpaceInvites(cb: (i: SpaceInvite[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, p.invites), orderBy('name')), (snap) =>
    cb(snap.docs.map((d) => ({ ...d.data(), email: d.id } as SpaceInvite))),
    () => cb([]));
}

export const saveSpaceInvite = (i: SpaceInvite) =>
  setDoc(doc(db, p.invite(i.email)), {
    name: i.name.trim(),
    email: i.email.trim().toLowerCase(),
    invitedAt: serverTimestamp(),
  });

export const deleteSpaceInvite = (email: string) => deleteDoc(doc(db, p.invite(email)));

export const setSpaceMemberActive = (uid: string, active: boolean) =>
  setDoc(doc(db, p.member(uid)), { active }, { merge: true });

/**
 * Claim the seat waiting for this email address, if there is one. Returns false
 * for everyone else, which is nearly everyone, so this stays quiet.
 */
export async function claimSpaceSeat(uid: string, email: string | null | undefined): Promise<boolean> {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const snap = await getDoc(doc(db, p.invite(e)));
  if (!snap.exists()) return false;
  const inv = snap.data() as SpaceInvite;
  await setDoc(doc(db, p.member(uid)), {
    name: inv.name, email: e, active: true, claimedAt: serverTimestamp(),
  });
  return true;
}

/** The scope the shared board runs under. */
export const htScope = (uid: string, people: ScopePerson[]): EntryScope => ({
  path: p.entries,
  tagPath: p.tags,
  shared: true,
  people,
  me: uid,
});

/* ------------------------------------------------- bringing work across */

/**
 * Move one tile from your private board into the shared space.
 *
 * Written in this order on purpose: create in the space first, delete from your
 * board second. If the second step fails you are left with a duplicate, which
 * is annoying. The other order would leave you with nothing, which is not.
 *
 * The document keeps its id, so re-running this is a no-op rather than a way to
 * end up with two of everything.
 *
 * The tile arrives assigned to you, because it already was yours. Hand it over
 * afterwards if that is what you meant.
 */
export async function moveToSpace(entry: Entry, myUid: string): Promise<void> {
  const { id, ...rest } = entry;
  await setDoc(doc(db, `${p.entries}/${id}`), {
    ...rest,
    ownerUid: myUid,
    updatedAt: serverTimestamp(),
  });
  await deleteDoc(doc(db, `entries/${id}`));
}

/** Your private tiles, read once, for the bring-across panel. */
export async function readMyTiles(uid: string): Promise<Entry[]> {
  const snap = await getDocs(query(collection(db, 'entries'), where('userId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Entry));
}
